import { askSchema, taskSchema } from "../../modules/copilot/copilot.service.js";
import { arr, dateTime, described, nullable, obj, oneOf, str, uuid, type Op, type Schema } from "../builder.js";

export const tag = {
  name: "Copilot",
  description:
    "The Founder Copilot: an assistant that reads the founder's own business profile, readiness checklist, investor matches, suggested experts and task list, plans what to do next, and may suggest tasks. A suggested task joins her list only when she approves it. It cannot send messages, share documents, move money or change chama records. Every question, every look at her data, every suggestion and every decision is logged and listed under `GET /copilot/activity`.",
};

const STATUS = oneOf(["proposed", "open", "done", "dismissed"]);

const task: Schema = obj({
  id: uuid,
  title: str,
  detail: nullable(str),
  due_date: described(nullable(str), "A date, `YYYY-MM-DD`."),
  status: described(STATUS, "`proposed` waits for her approval; `open` is on her list; `done` is finished; `dismissed` was turned down."),
  source: described(oneOf(["copilot", "founder"]), "Who added it: suggested by the Copilot, or added by her."),
  link: described(nullable(str), "Where in the app to do it, if anywhere."),
  created_at: dateTime,
});

const NOT_FOUND: [number, string, string] = [404, "NOT_FOUND", "No such task, or it belongs to someone else."];

const decision = (action: string, summary: string, description: string, from: string): Op => ({
  method: "post",
  path: `/copilot/tasks/:id/${action}`,
  summary,
  description,
  access: "founder",
  params: { id: described(uuid, "The task id.") },
  ok: { description: "The task, with its new status.", schema: task },
  errors: [NOT_FOUND, [409, "WRONG_STATE", `The task is not ${from}.`]],
});

export const ops: Op[] = [
  {
    method: "post",
    path: "/copilot/ask",
    summary: "Ask the Copilot",
    description:
      "The Copilot reads the founder's data through its tools and answers with a short plan; it may suggest up to 3 tasks, saved as `proposed`.\n\n" +
      "Her details go to the outside AI model (set by `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`) only when one is configured **and** she has given the `ai_matching` consent. Otherwise, or if the model fails, times out or runs out of tool rounds, a rule-based planner answers from the same data. `engine` says which one answered: `model` or `rules`. At most 30 questions an hour per founder.",
    access: "founder",
    body: askSchema,
    ok: {
      description: "The answer.",
      schema: obj({
        reply: described(str, "The plan, in plain words."),
        engine: oneOf(["model", "rules"]),
        proposals: described(arr(task), "Tasks suggested in this answer, all `proposed`."),
        note: described(nullable(str), "Why the AI model was not used, when that is because her consent is off."),
      }),
    },
    errors: [[429, "TOO_MANY_REQUESTS", "She has asked 30 times in the last hour."]],
  },
  {
    method: "get",
    path: "/copilot/tasks",
    summary: "My tasks",
    description: "Her proposed, open and done tasks: proposed first, then open, then done, each by due date. Dismissed tasks are left out. At most 60.",
    access: "founder",
    ok: { description: "The tasks.", schema: arr(task) },
  },
  {
    method: "post",
    path: "/copilot/tasks",
    summary: "Add a task myself",
    description: "A task she adds herself is `open` at once; no approval is needed.",
    access: "founder",
    body: taskSchema,
    ok: { status: 201, description: "The task.", schema: task },
  },
  decision("approve", "Approve a suggested task", "Puts a `proposed` task on her list as `open`.", "`proposed`"),
  decision("dismiss", "Dismiss a task", "Turns down a `proposed` task, or drops an `open` one.", "`proposed` or `open`"),
  decision("done", "Mark a task done", "An `open` task becomes `done`.", "`open`"),
  decision("reopen", "Reopen a task", "A `done` task goes back to `open`.", "`done`"),
  {
    method: "get",
    path: "/copilot/activity",
    summary: "What the Copilot did",
    description: "The last 40 steps, newest first, in plain words: each question, each tool it used, each suggestion and each of her decisions.",
    access: "founder",
    ok: {
      description: "The steps.",
      schema: arr(
        obj({
          id: uuid,
          kind: described(str, "`asked`, `tool`, `proposed`, `answered`, `approved`, `dismissed`, `done` or `reopened`."),
          text: str,
          at: dateTime,
        }),
      ),
    },
  },
];
