import type { TrustSummary } from '@shared/professions';
import { get, patch, post } from './client';

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

/** A verified expert in the directory (GET /experts, POST /experts/find). */
export interface ExpertCard {
  user_id: string;
  full_name: string;
  /** A profession id from shared/professions ("lawyer", "valuer"...). */
  profession: string;
  organisation_name: string | null;
  register_body: string | null;
  register_checked: boolean;
  bio: string;
  sectors: string[];
  counties: string[];
  services: string[];
  practice_areas: string[];
  office_hours: { per_month: number; left_this_month: number };
  helped: number;
  /** Why she fits the question asked, in words (POST /experts/find). */
  reasons?: string[];
  /** How she was checked: "Licensed · LSK · checked 12 Nov 2026" (shared/professions trustWords). */
  verification?: TrustSummary;
}

/** What the guide understood from a question, why it matters, and who can help. */
export interface ExpertFindResult {
  understood: { profession: string | null; practice_area: string | null; practice_area_label: string | null; sector: string | null; county: string | null };
  explanation: string;
  experts: ExpertCard[];
  note: string;
}

export interface ExpertService {
  /** The sessions founders asked her for. */
  listSessions(): Promise<ExpertSession[]>;
  answer(id: string, status: 'accepted' | 'declined' | 'done'): Promise<void>;
  /** "Who can help me with...?" in her own words. */
  find(question: string, lang?: 'en' | 'sw'): Promise<ExpertFindResult>;
  /** Ask an expert for a short session about a topic. */
  requestSession(expertId: string, topic: string): Promise<void>;
  /** Tell FoundersLink's staff about an expert. It goes to their Reports page. */
  report(expertId: string, reason: string): Promise<{ suspended: boolean }>;
}

export const httpExpertService: ExpertService = {
  async listSessions() {
    const all = await get<ExpertSession[]>('/me/office-hours');
    return all.filter((s) => s.role === 'expert');
  },
  async answer(id, status) {
    await patch(`/office-hours/${id}`, { status });
  },
  find(question, lang = 'en') {
    return post<ExpertFindResult>('/experts/find', { question, lang });
  },
  async requestSession(expertId, topic) {
    await post(`/experts/${expertId}/office-hours`, { topic });
  },
  async report(expertId, reason) {
    const r = await post<{ suspended: boolean }>('/reports', { user_id: expertId, reason });
    return { suspended: Boolean(r?.suspended) };
  },
};
