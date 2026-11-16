import type { RateItem } from '@shared/expert-question';
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
  /** What she charges, in her words. Payment is between the member and her. */
  rate_card?: RateItem[];
}

/** One step of the path: who often helps, why, and the best verified expert for it. */
export interface PlanStep {
  need: string;
  /** The practice area it searches for, so the right price is shown. */
  area?: string;
  who: string;
  why: string;
  /** "Due diligence", "Terms agreed"... */
  step: string;
  /** Null when no verified expert offers it yet. */
  expert: ExpertCard | null;
}

/** What the guide understood from a question, why it matters, and who can help. */
export interface ExpertFindResult {
  understood: {
    profession: string | null;
    practice_area: string | null;
    practice_area_label: string | null;
    sector: string | null;
    county: string | null;
    /** Her budget in KES, when she gave one. */
    budget_kes?: number | null;
  };
  explanation: string;
  experts: ExpertCard[];
  /** "I'm preparing to raise investment": the whole path, in order. Null for an ordinary question. */
  plan?: PlanStep[] | null;
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
  /** The verified experts members can see (GET /experts). */
  list(): Promise<ExpertCard[]>;
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
  list() {
    return get<ExpertCard[]>('/experts');
  },
  async report(expertId, reason) {
    const r = await post<{ suspended: boolean }>('/reports', { user_id: expertId, reason });
    return { suspended: Boolean(r?.suspended) };
  },
};
