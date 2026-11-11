// The language model behind the Founder Copilot: any provider with an
// OpenAI-style /chat/completions endpoint that supports tool calls (Google
// Gemini, OpenAI, Anthropic, Groq...). The provider is chosen in settings
// (LLM_BASE_URL, LLM_API_KEY, LLM_MODEL), never in code, so FoundersLink is
// not tied to one company.
//
// Looking up an address can take a minute on some Windows laptops (seen on
// the team's, with antivirus inspecting connections), so the address is
// looked up once and remembered, and the connection is kept open.

import dns from "node:dns";
import https from "node:https";
import type { LookupFunction } from "node:net";
import { env } from "../../config/env.js";

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ToolSpec {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export function llmConfigured() {
  return Boolean(env.LLM_API_KEY && env.LLM_MODEL);
}

// Remembered addresses, refreshed after ten minutes.
const remembered = new Map<string, { at: number; address: string; family: number }>();
const cachedLookup: LookupFunction = (hostname, options, callback) => {
  const hit = remembered.get(hostname);
  if (hit && Date.now() - hit.at < 600_000) {
    if ((options as { all?: boolean }).all) return (callback as unknown as (e: null, a: { address: string; family: number }[]) => void)(null, [hit]);
    return callback(null, hit.address, hit.family);
  }
  dns.lookup(hostname, { family: 4 }, (err, address, family) => {
    if (!err) remembered.set(hostname, { at: Date.now(), address, family });
    if ((options as { all?: boolean }).all) return (callback as unknown as (e: NodeJS.ErrnoException | null, a: { address: string; family: number }[]) => void)(err, err ? [] : [{ address, family }]);
    callback(err, address, family);
  });
};

const agent = new https.Agent({ keepAlive: true, lookup: cachedLookup });

/** Looks the provider's address up now, so the first question does not wait for it. */
export function warmUp() {
  if (!llmConfigured()) return;
  const host = new URL(env.LLM_BASE_URL).hostname;
  cachedLookup(host, {}, () => undefined);
}

function postJson(url: string, body: unknown, timeoutMs: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = JSON.stringify(body);
    const req = https.request(
      {
        method: "POST",
        hostname: u.hostname,
        path: u.pathname + u.search,
        port: u.port || 443,
        agent,
        headers: { "content-type": "application/json", "content-length": Buffer.byteLength(data), authorization: `Bearer ${env.LLM_API_KEY}` },
        timeout: timeoutMs,
      },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (text += chunk));
        res.on("end", () => {
          if ((res.statusCode ?? 500) >= 400) return reject(new Error(`LLM answered ${res.statusCode}: ${text.slice(0, 200)}`));
          try {
            resolve(JSON.parse(text));
          } catch {
            reject(new Error("LLM answer was not JSON"));
          }
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error(`LLM took longer than ${timeoutMs} ms`)));
    req.on("error", reject);
    req.end(data);
  });
}

/** One turn: the model either answers in words or asks to call tools. */
export async function complete(messages: ChatMessage[], tools: ToolSpec[]): Promise<ChatMessage> {
  const url = env.LLM_BASE_URL.replace(/\/+$/, "") + "/chat/completions";
  const answer = (await postJson(
    url,
    { model: env.LLM_MODEL, temperature: 0.2, max_tokens: 900, messages, tools, tool_choice: "auto" },
    env.COPILOT_LLM_TIMEOUT_MS,
  )) as { choices?: { message?: ChatMessage }[] };
  const message = answer.choices?.[0]?.message;
  if (!message) throw new Error("LLM sent no message");
  return { role: "assistant", content: message.content ?? null, tool_calls: message.tool_calls };
}
