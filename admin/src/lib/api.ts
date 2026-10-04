import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/config";
import { parseSession } from "@/lib/auth/types";

/**
 * The dashboard's connection to the FoundersLink backend. It runs on the
 * server only (pages and server actions), so the admin's token stays in
 * an httpOnly cookie and never reaches the browser's JavaScript.
 *
 * Set FOUNDERLINK_API_URL (e.g. http://localhost:8000) to use the
 * backend. Without it the dashboard runs on its mock store.
 */
export const API_URL = (process.env.FOUNDERLINK_API_URL ?? "").replace(/\/+$/, "");
export const live = API_URL !== "";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function backend<T>(method: string, path: string, body?: unknown, token?: string): Promise<T> {
  const bearer = token ?? parseSession(cookies().get(SESSION_COOKIE)?.value)?.token;
  const res = await fetch(API_URL + path, {
    method,
    headers: {
      ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    // Admin pages always show what is true now.
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, json?.error?.code ?? "UNKNOWN_ERROR", json?.error?.message ?? "The backend refused the request");
  }
  return json as T;
}
