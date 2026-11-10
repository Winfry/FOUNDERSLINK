import { get, post } from './client';

/** A task on the founder's list. The Copilot's start as "proposed" and wait for her approval. */
export interface CopilotTask {
  id: string;
  title: string;
  detail: string | null;
  dueDate: string | null;
  status: 'proposed' | 'open' | 'done' | 'dismissed';
  source: 'copilot' | 'founder';
  /** Where in the app the task is done. */
  link: string | null;
}

export interface CopilotAnswer {
  reply: string;
  /** "model": written by the AI model; "rules": planned from her data without one. */
  engine: 'model' | 'rules';
  proposals: CopilotTask[];
  note: string | null;
}

export interface CopilotActivity {
  id: string;
  kind: string;
  text: string;
  at: string;
}

export type TaskAction = 'approve' | 'dismiss' | 'done' | 'reopen';

export interface CopilotService {
  ask(message: string): Promise<CopilotAnswer>;
  tasks(): Promise<CopilotTask[]>;
  decide(taskId: string, action: TaskAction): Promise<CopilotTask>;
  addTask(title: string, dueDate?: string): Promise<CopilotTask>;
  activity(): Promise<CopilotActivity[]>;
}

interface ApiTask {
  id: string;
  title: string;
  detail: string | null;
  due_date: string | null;
  status: CopilotTask['status'];
  source: CopilotTask['source'];
  link: string | null;
}

const toTask = (t: ApiTask): CopilotTask => ({
  id: t.id,
  title: t.title,
  detail: t.detail,
  dueDate: t.due_date,
  status: t.status,
  source: t.source,
  link: t.link,
});

export const httpCopilotService: CopilotService = {
  async ask(message) {
    const a = await post<{ reply: string; engine: CopilotAnswer['engine']; proposals: ApiTask[]; note: string | null }>('/copilot/ask', { message });
    return { reply: a.reply, engine: a.engine, proposals: a.proposals.map(toTask), note: a.note };
  },
  async tasks() {
    return (await get<ApiTask[]>('/copilot/tasks')).map(toTask);
  },
  async decide(taskId, action) {
    return toTask(await post<ApiTask>(`/copilot/tasks/${taskId}/${action}`));
  },
  async addTask(title, dueDate) {
    return toTask(await post<ApiTask>('/copilot/tasks', { title, ...(dueDate ? { due_date: dueDate } : {}) }));
  },
  async activity() {
    return get<CopilotActivity[]>('/copilot/activity');
  },
};
