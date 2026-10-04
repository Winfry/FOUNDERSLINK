import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import type { DealService } from '../types/api';
import type { Deal, DealDocument, DealStage, DealTerms, DealType } from '../../types';
import { currentUserId, del, get, patch, post } from './client';

interface ApiDeal {
  id: string;
  type: DealType;
  title: string;
  stage: DealStage;
  pending: { to_stage: DealStage; waiting_for: { user_id: string }[] } | null;
  terms: { amount_kes?: number; instrument?: DealTerms['instrument']; equity_percent?: number; roles?: string; notes?: string };
  parties: { user_id: string; full_name: string; role: string }[];
  notice?: string;
}

interface ApiDocument {
  id: string;
  user_id?: string;
  type?: string;
  status?: 'uploaded' | 'verified' | 'rejected';
  title: string;
  file_name: string;
  check: 'uploaded' | 'ai_pre_checked' | 'confirmed' | 'rejected';
  check_label: string;
  rejection_reason: string | null;
  precheck: { concerns: string[] } | null;
}

interface ApiDueDiligence {
  summary: string;
  parties: {
    user_id: string;
    full_name: string;
    required: { type: string; title: string; provided: boolean }[];
    documents: ApiDocument[];
    verified: string[];
    self_reported: string[];
    missing: string[];
  }[];
}

const STAGES: DealStage[] = ['exploring', 'due_diligence', 'terms_agreed', 'documents_compliance', 'closed', 'active'];

// "Pending" is the screen's word for a document nobody has checked yet.
// It says "AI pre-checked" only when the backend says the AI read it.
const PRECHECK: Record<ApiDocument['check'], DealDocument['precheckStatus']> = {
  uploaded: 'pending',
  rejected: 'pending',
  ai_pre_checked: 'ai_pre_checked',
  confirmed: 'confirmed_by_founderlink',
};

function toDocument(d: ApiDocument, owner: string): DealDocument {
  return {
    id: d.id,
    name: `${d.title} (${owner})`,
    precheckStatus: PRECHECK[d.check],
    summary: d.check === 'rejected' ? `Not accepted: ${d.rejection_reason ?? ''}` : (d.precheck?.concerns.join(' ') || undefined),
    type: d.type,
    ownerUserId: d.user_id,
    status: d.status,
  };
}

function base(deal: ApiDeal, me: string | null): Deal {
  const other = deal.parties.find((p) => p.user_id !== me) ?? deal.parties[0];
  const waiting = new Set(deal.pending?.waiting_for.map((p) => p.user_id) ?? []);
  const termsAgreed = STAGES.indexOf(deal.stage) >= STAGES.indexOf('terms_agreed');
  return {
    id: deal.id,
    type: deal.type,
    title: deal.title,
    stage: deal.stage,
    withUserId: other?.user_id ?? '',
    withName: other?.full_name ?? '',
    withRole: other?.role,
    notice: deal.notice,
    terms: {
      amountKes: deal.terms.amount_kes ?? 0,
      instrument: deal.terms.instrument ?? 'equity',
      equityPercent: deal.terms.equity_percent ?? null,
      roles: deal.terms.roles,
      notes: deal.terms.notes,
    },
    // Who has said yes to the terms as they stand.
    confirmations: deal.parties.map((p) => ({
      userId: p.user_id,
      name: p.full_name,
      confirmed: termsAgreed || (deal.pending?.to_stage === 'terms_agreed' && !waiting.has(p.user_id)),
    })),
    checklist: [],
    timeline: [],
    documents: [],
  };
}

// The deal screen shows one object. The backend keeps a deal's
// checklist, timeline and due diligence as their own calls.
async function load(dealId: string): Promise<Deal> {
  const [deal, timeline, checklist, diligence, me] = await Promise.all([
    get<ApiDeal>(`/deals/${dealId}`),
    get<{ id: string; text: string; created_at: string }[]>(`/deals/${dealId}/timeline`),
    get<{ items: { id: string; title: string; status: string }[] }>(`/deals/${dealId}/compliance`),
    get<ApiDueDiligence>(`/deals/${dealId}/due-diligence`),
    currentUserId(),
  ]);
  const named = (list: 'verified' | 'self_reported' | 'missing') =>
    diligence.parties.flatMap((party) => party[list].map((line) => `${party.full_name}: ${line}`));

  return {
    ...base(deal, me),
    checklist: checklist.items.map((item) => ({ id: item.id, label: item.title, done: item.status === 'complete' })),
    timeline: timeline.map((event) => ({ id: event.id, title: event.text, at: event.created_at })),
    documents: diligence.parties.flatMap((party) => party.documents.map((d) => toDocument(d, party.full_name))),
    dueDiligenceSummary: { verified: named('verified'), selfReported: named('self_reported'), missing: named('missing') },
    // What this deal still asks of her, for the upload buttons.
    requiredDocuments: diligence.parties.find((party) => party.user_id === me)?.required ?? [],
  };
}

const DOCUMENT_TYPES = ['business_registration', 'kra_pin_certificate', 'organisation_proof', 'track_record', 'other'];

// The screen may pass a document type, or a file name such as "BRS.pdf".
function typeOf(name: string) {
  if (DOCUMENT_TYPES.includes(name)) return name;
  if (/brs|registration/i.test(name)) return 'business_registration';
  if (/kra|pin/i.test(name)) return 'kra_pin_certificate';
  return 'other';
}

export const httpDealService: DealService = {
  async list() {
    const [deals, me] = await Promise.all([get<ApiDeal[]>('/deals'), currentUserId()]);
    return deals.map((deal) => base(deal, me));
  },

  get: load,

  async createInvestment(withUserId, title) {
    const deal = await post<ApiDeal>('/deals', { type: 'investment', title, with_user_id: withUserId });
    return load(deal.id);
  },

  async updateTerms(dealId, terms) {
    await patch(`/deals/${dealId}/terms`, {
      amount_kes: terms.amountKes || undefined,
      instrument: terms.instrument,
      equity_percent: terms.equityPercent ?? undefined,
      roles: terms.roles || undefined,
      notes: terms.notes || undefined,
    });
    return load(dealId);
  },

  // "Confirm terms" is one button on the screen and three cases here.
  // Terms are agreed only at due diligence and only by every party, so:
  // someone already proposed it: add her yes. Nobody has: propose it,
  // which counts as her yes. Still exploring: move to due diligence,
  // where the documents are shared first.
  async confirmTerms(dealId) {
    const deal = await get<ApiDeal>(`/deals/${dealId}`);
    if (deal.pending?.to_stage === 'terms_agreed') await post(`/deals/${dealId}/stage/confirm`);
    else if (deal.stage === 'due_diligence') await post(`/deals/${dealId}/stage`, { to_stage: 'terms_agreed' });
    else if (deal.stage === 'exploring') await post(`/deals/${dealId}/stage`, { to_stage: 'due_diligence' });
    return load(dealId);
  },

  // One stage forward. A stage every party must agree to is proposed,
  // or confirmed if another party already proposed it.
  async advanceStage(dealId) {
    const deal = await get<ApiDeal>(`/deals/${dealId}`);
    const next = STAGES[STAGES.indexOf(deal.stage) + 1];
    if (deal.pending) await post(`/deals/${dealId}/stage/confirm`);
    else if (next) await post(`/deals/${dealId}/stage`, { to_stage: next });
    return load(dealId);
  },

  // Opens the device's file picker and shares the chosen file in the
  // deal. `name` says which document it is (see typeOf).
  // When she is replacing a copy of her own that staff have not looked
  // at, `replaceDocumentId` names it: it is removed once she has chosen
  // the new file, so closing the picker loses nothing.
  async uploadDocument(dealId, name, replaceDocumentId) {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    const asset = picked.assets?.[0];
    if (picked.canceled || !asset) return load(dealId);

    // The backend refuses to remove a document staff have reviewed. The
    // new copy is still shared; the old one stays on the record.
    if (replaceDocumentId) await del(`/deals/${dealId}/documents/${replaceDocumentId}`).catch(() => undefined);

    const form = new FormData();
    form.append('type', typeOf(name));
    if (Platform.OS === 'web' && asset.file) {
      form.append('file', asset.file, asset.name);
    } else {
      // React Native sends a file by describing where it is.
      form.append('file', { uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/pdf' } as unknown as Blob);
    }
    await post(`/deals/${dealId}/documents`, form);
    return load(dealId);
  },
};
