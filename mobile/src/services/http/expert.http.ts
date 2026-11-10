import { get, patch } from './client';

/** A help session ("office hours") a founder asked an expert for. */
export interface ExpertSession {
  id: string;
  topic: string;
  status: 'requested' | 'accepted' | 'declined' | 'done';
  /** Which side she is on: the expert answering, or the one who asked. */
  role: 'expert' | 'requester';
  with: { id: string; full_name: string };
  created_at: string;
}

export interface ExpertService {
  /** The sessions founders asked her for. */
  listSessions(): Promise<ExpertSession[]>;
  answer(id: string, status: 'accepted' | 'declined' | 'done'): Promise<void>;
}

export const httpExpertService: ExpertService = {
  async listSessions() {
    const all = await get<ExpertSession[]>('/me/office-hours');
    return all.filter((s) => s.role === 'expert');
  },
  async answer(id, status) {
    await patch(`/office-hours/${id}`, { status });
  },
};
