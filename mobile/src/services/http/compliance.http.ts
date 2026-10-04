import type { ComplianceService } from '../types/api';
import type { ComplianceItem } from '../../types';
import { get, patch, post } from './client';

interface ApiChecklist {
  items: { id: string; title: string; why: string | null; status: ComplianceItem['status'] }[];
}

interface ApiAnswer {
  answer: string;
  // False when there is no current official source to answer from.
  confident: boolean;
  suggest_expert: boolean;
  citations: { source: string; url: string }[];
}

// The checklist is chosen for her business by the backend, and her own
// deadlines are a second call.
async function load(): Promise<ComplianceItem[]> {
  const [checklist, deadlines] = await Promise.all([
    get<ApiChecklist>('/compliance'),
    get<{ item_id: string; due_date: string }[]>('/compliance/deadlines').catch(() => []),
  ]);
  return checklist.items.map((item) => ({
    id: item.id,
    label: item.title,
    status: item.status,
    deadline: deadlines.find((d) => d.item_id === item.id)?.due_date ?? null,
    description: item.why ?? undefined,
  }));
}

export const httpComplianceService: ComplianceService = {
  listItems: load,

  // Marking an item complete also closes the matching gap on her
  // investor matches: the backend reads the same list for both.
  async updateItemStatus(itemId, status) {
    await patch(`/compliance/${itemId}/status`, { status });
    const item = (await load()).find((i) => i.id === itemId);
    if (!item) throw { code: 'NOT_FOUND', message: 'Compliance item not found.' };
    return item;
  },

  // General information, never legal advice. When the backend has no
  // current official source it says so and cites nothing.
  async ask(question) {
    const answer = await post<ApiAnswer>('/compliance/ask', { question }).catch((e: { code?: string }) => {
      // The backend needs a whole question to look for a source.
      if (e?.code === 'VALIDATION_ERROR') throw { code: e.code, message: 'Ask a full question, for example "Do I need a KRA PIN for my business?"' };
      throw e;
    });
    return {
      body: answer.answer,
      citations: answer.citations.map((c) => ({ title: c.source, url: c.url })),
      cannotConfirm: !answer.confident,
      expertSuggestions: answer.suggest_expert ? ['Ask a lawyer or accountant to confirm this for your business.'] : undefined,
    };
  },
};
