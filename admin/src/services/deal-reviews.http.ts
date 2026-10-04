import type { DealDocumentItem, DealReviewDetail, DealReviewListItem, DealStage, DealType, MemberRole, PrecheckFlag } from "@/types";
import { backend } from "@/lib/api";

interface ApiPrecheck {
  checks: { check: string; passed: boolean; note?: string | null }[];
  concerns: string[];
  readable: boolean;
}

interface ApiDocument {
  id: string;
  user_id: string;
  title: string;
  file_name: string;
  mime_type: string;
  status: "uploaded" | "verified" | "rejected";
  precheck: ApiPrecheck | null;
  rejection_reason: string | null;
}

interface ApiDueDiligence {
  deal_id: string;
  title: string;
  type: DealType;
  stage: DealStage;
  terms: { amount_kes?: number; instrument?: string; equity_percent?: number; notes?: string };
  parties: {
    user_id: string;
    full_name: string;
    role: MemberRole;
    documents: ApiDocument[];
    verified: string[];
    self_reported: string[];
    missing: string[];
  }[];
}

const STATUS = { uploaded: "uploaded", verified: "confirmed", rejected: "rejected" } as const;

// "AI pre-checked" is shown only when the AI service really read the
// document. When it did not, there are no flags and no such label.
function flagsOf(precheck: ApiPrecheck | null): PrecheckFlag[] {
  if (!precheck) return [];
  return [
    ...precheck.checks.map((c) => ({ label: c.check.replace(/_/g, " "), passed: c.passed, detail: c.note ?? "" })),
    ...precheck.concerns.map((concern) => ({ label: "Concern", passed: false, detail: concern })),
    ...(precheck.readable ? [] : [{ label: "Readable", passed: false, detail: "The document could not be read clearly" }]),
  ];
}

function toDocument(d: ApiDocument, partyName: string): DealDocumentItem {
  return {
    id: d.id,
    partyMemberId: d.user_id,
    partyName,
    fileName: `${d.title} (${d.file_name})`,
    mimeType: d.mime_type,
    // Served through the dashboard, which adds the admin's session.
    previewUrl: `/api/deal-documents/${d.id}/file`,
    aiPrechecked: d.precheck !== null,
    precheckFlags: flagsOf(d.precheck),
    adminStatus: STATUS[d.status],
    rejectionReason: d.rejection_reason,
  };
}

function toDetail(d: ApiDueDiligence): DealReviewDetail {
  return {
    id: d.deal_id,
    title: d.title,
    dealType: d.type,
    stage: d.stage,
    terms: {
      amountKes: d.terms.amount_kes ?? null,
      instrument: d.terms.instrument ?? null,
      equityPercent: d.terms.equity_percent ?? null,
      notes: d.terms.notes ?? null,
    },
    documents: d.parties.flatMap((party) => party.documents.map((doc) => toDocument(doc, party.full_name))),
    partySummaries: d.parties.map((party) => ({
      memberId: party.user_id,
      name: party.full_name,
      role: party.role,
      verifiedCount: party.verified.length,
      selfReportedCount: party.self_reported.length,
      missingCount: party.missing.length,
    })),
  };
}

// The deals with a document waiting for an admin, longest wait first.
export async function fetchDealReviews(): Promise<DealReviewListItem[]> {
  const waiting = await backend<{ deal: { id: string } }[]>("GET", "/admin/deal-documents");
  const dealIds = Array.from(new Set(waiting.map((d) => d.deal.id)));
  const deals = await Promise.all(dealIds.map((id) => backend<ApiDueDiligence>("GET", `/admin/deals/${id}/due-diligence`)));
  return deals.map((d) => ({
    id: d.deal_id,
    title: d.title,
    dealType: d.type,
    stage: d.stage,
    parties: d.parties.map((p) => p.full_name),
    documentsWaiting: waiting.filter((w) => w.deal.id === d.deal_id).length,
  }));
}

export async function fetchDealReview(id: string): Promise<DealReviewDetail | null> {
  try {
    return toDetail(await backend<ApiDueDiligence>("GET", `/admin/deals/${id}/due-diligence`));
  } catch {
    return null;
  }
}

export async function confirmDocument(dealId: string, documentId: string) {
  await backend("PATCH", `/admin/deal-documents/${documentId}`, { status: "verified" });
  return fetchDealReview(dealId);
}

export async function rejectDocument(dealId: string, documentId: string, reason: string) {
  await backend("PATCH", `/admin/deal-documents/${documentId}`, { status: "rejected", reason });
  return fetchDealReview(dealId);
}
