// Level 3, "deal-ready" (TEAM_DECISIONS D12). When an investment deal
// reaches due diligence, each party shares the documents the others
// need to see before terms are agreed.
//
// What this does and does not do:
// - The AI service reads a document and checks it against the profile.
//   That is a pre-check for the admin, never proof the document is
//   genuine. A document is "confirmed" only when an admin says so.
// - If the AI service does not answer, the document is stored without a
//   pre-check and is not labelled as pre-checked.
// - Identity is not checked here. In production that comes from a
//   regulated provider as pass or fail; FounderLink stores no ID.
// - Files are kept as vetting documents are: on this machine's disk,
//   not encrypted, deleted 30 days after the deal closes or is declined.

import path from "node:path";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { dueDiligencePack, precheckDocument } from "../../ai/client.js";
import type { Precheck } from "../../ai/types.js";
import { prisma } from "../../shared/db.js";
import { AppError, conflict, notFound } from "../../shared/errors.js";
import { hasConsent } from "../account/consents.js";
import { notify } from "../notifications/notifications.service.js";
import { checkFile, fileOf, KEEP_MS, removeFile, reviewSchema, storeFile, type UploadedFile } from "../vetting/documents.js";

const TITLES: Record<string, string> = {
  business_registration: "Business registration certificate",
  kra_pin_certificate: "KRA PIN certificate",
  organisation_proof: "Organisation or fund documents",
  track_record: "Track-record evidence",
  other: "Other document",
};
export const DEAL_DOCUMENT_TYPES = ["business_registration", "kra_pin_certificate", "organisation_proof", "track_record", "other"] as const;

// What an investment asks each side for. Other kinds of deal ask for
// nothing, so they are never held back.
const REQUIRED: Record<string, string[]> = {
  founder: ["business_registration", "kra_pin_certificate"],
  investor: ["organisation_proof"],
};
const requiredFor = (dealType: string, role: string) => (dealType === "investment" ? (REQUIRED[role] ?? []) : []);

// The two kinds of document the AI service can read.
const PRECHECKED = new Set(["business_registration", "kra_pin_certificate"]);
// Documents are shared from due diligence until the deal closes.
const SHARING_STAGES = ["due_diligence", "terms_agreed", "documents_compliance"];
const MAX_PER_PARTY = 10;

const NOTICE =
  "The AI pre-check reads a document and compares it with the profile. It does not prove a document is genuine: only FounderLink confirming it does. Identity is not checked in this demo.";

export const dealUploadSchema = z.object({
  type: z.enum(DEAL_DOCUMENT_TYPES),
  label: z.string().trim().max(120).optional(),
});

type Doc = Awaited<ReturnType<typeof prisma.dealDocument.findFirstOrThrow>>;

// What a person is told about a document. "ai_pre_checked" only when
// the AI service really read it.
function labelOf(d: Pick<Doc, "status" | "precheck">) {
  if (d.status === "verified") return "confirmed";
  if (d.status === "rejected") return "rejected";
  return d.precheck ? "ai_pre_checked" : "uploaded";
}

const LABEL_TEXT: Record<string, string> = {
  confirmed: "Confirmed by FounderLink",
  rejected: "Not accepted",
  ai_pre_checked: "AI pre-checked",
  uploaded: "Uploaded",
};

function viewDocument(d: Doc) {
  const label = labelOf(d);
  return {
    id: d.id,
    user_id: d.user_id,
    type: d.type,
    title: TITLES[d.type] ?? d.type,
    label: d.label,
    file_name: d.file_name,
    mime_type: d.mime_type,
    size_bytes: d.size_bytes,
    status: d.status,
    check: label,
    check_label: LABEL_TEXT[label],
    precheck: d.precheck as Precheck | null,
    rejection_reason: d.rejection_reason,
    uploaded_at: d.uploaded_at,
    reviewed_at: d.reviewed_at,
    deleted_at: d.deleted_at,
  };
}

async function partyDeal(userId: string, dealId: string) {
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, parties: { some: { user_id: userId } } },
    include: { parties: { orderBy: { joined_at: "asc" } } },
  });
  if (!deal) throw notFound("No such deal");
  return deal;
}

// Each party's required documents that are not in, by title. A rejected
// document does not count: she has to send another.
export async function missingDocuments(dealId: string) {
  const deal = await prisma.deal.findUniqueOrThrow({
    where: { id: dealId },
    include: { parties: { include: { user: { select: { full_name: true } } } }, documents: true },
  });
  return deal.parties.flatMap((party) =>
    requiredFor(deal.type, party.role)
      .filter((type) => !deal.documents.some((d) => d.user_id === party.user_id && d.type === type && d.status !== "rejected"))
      .map((type) => ({ user_id: party.user_id, full_name: party.user.full_name, type, title: TITLES[type]! })),
  );
}

// Called before a deal moves to terms agreed.
export async function mustBeDealReady(dealId: string) {
  const missing = await missingDocuments(dealId);
  if (missing.length === 0) return;
  const list = missing.map((m) => `${m.title} (${m.full_name})`).join(", ");
  throw new AppError(409, "NOT_DEAL_READY", `Terms can be agreed once every party has shared their documents. Still missing: ${list}`);
}

export async function uploadDealDocument(userId: string, dealId: string, file: UploadedFile | undefined, input: z.infer<typeof dealUploadSchema>) {
  checkFile(file);
  const deal = await partyDeal(userId, dealId);
  if (deal.status !== "open") throw conflict("DEAL_NOT_OPEN", `This deal is ${deal.status}`);
  if (!SHARING_STAGES.includes(deal.stage)) {
    throw conflict("WRONG_STAGE", "Documents are shared once the deal reaches due diligence, and until it closes");
  }
  if ((await prisma.dealDocument.count({ where: { deal_id: dealId, user_id: userId } })) >= MAX_PER_PARTY) {
    throw conflict("TOO_MANY_DOCUMENTS", `You can share at most ${MAX_PER_PARTY} documents in a deal`);
  }

  let precheck: Precheck | null = null;
  if (PRECHECKED.has(input.type)) {
    const owner = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { founder_profile: { select: { business_name: true, county: true } }, investor_profile: { select: { organisation_name: true } } },
    });
    precheck = await precheckDocument({
      document_type: input.type,
      file: file.buffer,
      mime_type: file.mimetype,
      profile: {
        business_name: owner.founder_profile?.business_name ?? owner.investor_profile?.organisation_name ?? null,
        county: owner.founder_profile?.county ?? null,
      },
      external_model_allowed: await hasConsent(userId, "document_processing"),
    });
  }

  const saved = await prisma.dealDocument.create({
    data: {
      deal_id: dealId,
      user_id: userId,
      type: input.type,
      label: input.label ?? null,
      file_name: path.basename(file.originalname).slice(0, 120),
      mime_type: file.mimetype,
      size_bytes: file.size,
      storage_key: await storeFile(file.buffer),
      ...(precheck ? { precheck: { ...precheck } } : {}),
    },
  });
  await prisma.dealEvent.create({ data: { deal_id: dealId, actor_id: userId, event: "document_shared", note: TITLES[input.type] ?? input.type } });
  return viewDocument(saved);
}

// She can take back a document nobody has reviewed yet.
export async function removeDealDocument(userId: string, dealId: string, documentId: string) {
  const document = await prisma.dealDocument.findFirst({ where: { id: documentId, deal_id: dealId, user_id: userId } });
  if (!document) throw notFound("No such document");
  if (document.status !== "uploaded") throw conflict("ALREADY_REVIEWED", "This document has been reviewed and cannot be removed");
  await removeFile(document.storage_key);
  await prisma.dealDocument.delete({ where: { id: documentId } });
  return { id: documentId, removed: true };
}

function fileOfDocument(document: Doc | null) {
  if (!document) throw notFound("No such document");
  if (!document.storage_key) throw new AppError(410, "FILE_DELETED", "This file was deleted after the retention period");
  return { path: path.resolve(fileOf(document.storage_key)), mime_type: document.mime_type, file_name: document.file_name };
}

// The parties to a deal can open each other's documents: that is what
// due diligence is. Nobody else can, except an admin.
export async function dealFileForParty(userId: string, dealId: string, documentId: string) {
  await partyDeal(userId, dealId);
  return fileOfDocument(await prisma.dealDocument.findFirst({ where: { id: documentId, deal_id: dealId } }));
}

export async function dealFileForAdmin(documentId: string) {
  return fileOfDocument(await prisma.dealDocument.findUnique({ where: { id: documentId } }));
}

const CHECK_TITLES: Record<string, string> = {
  identity: "Identity checked by an admin",
  phone: "Phone number checked",
  organisation: "Organisation checked",
  track_record: "Track record checked",
  professional_register: "Professional register checked",
  reference: "Reference checked",
};

// Everything due diligence shows for one deal: each party's documents,
// what is still missing, and the pack.
async function build(dealId: string) {
  const deal = await prisma.deal.findUniqueOrThrow({
    where: { id: dealId },
    include: {
      documents: { orderBy: { uploaded_at: "asc" } },
      parties: {
        orderBy: { joined_at: "asc" },
        include: {
          user: {
            select: {
              id: true,
              full_name: true,
              phone_verified_at: true,
              preferred_language: true,
              founder_profile: { select: { business_name: true, sector: true, county: true, stage: true, business_status: true } },
              investor_profile: { select: { organisation_name: true } },
              vetting_application: { select: { checks: { where: { result: "pass" }, select: { check_type: true } } } },
            },
          },
        },
      },
    },
  });

  const parties = deal.parties.map((party) => {
    const required = requiredFor(deal.type, party.role).map((type) => ({ type, title: TITLES[type]! }));
    const documents = deal.documents.filter((d) => d.user_id === party.user_id);
    const missing = required.filter((r) => !documents.some((d) => d.type === r.type && d.status !== "rejected"));
    return { party, required, documents, missing };
  });

  const pack = await dueDiligencePack(
    { type: deal.type, stage: deal.stage, terms: deal.terms },
    parties.map(({ party, required, documents }) => ({
      role: party.role,
      profile: { ...(party.user.founder_profile ?? {}), ...(party.user.investor_profile ?? {}) },
      checks: [
        "Verified member, approved by FounderLink",
        ...(party.user.phone_verified_at ? ["Phone number confirmed by code"] : []),
        ...new Set((party.user.vetting_application?.checks ?? []).map((c) => CHECK_TITLES[c.check_type] ?? c.check_type)),
      ],
      required,
      documents: documents.map((d) => ({ type: d.type, title: TITLES[d.type] ?? d.type, status: d.status, precheck: d.precheck as Precheck | null })),
    })),
  );

  return {
    deal_id: deal.id,
    title: deal.title,
    stage: deal.stage,
    // Whether the deal may move to terms agreed.
    deal_ready: parties.every((p) => p.missing.length === 0),
    parties: parties.map(({ party, required, documents, missing }, i) => ({
      user_id: party.user_id,
      full_name: party.user.full_name,
      role: party.role,
      ready: missing.length === 0,
      required: required.map((r) => ({ ...r, provided: !missing.includes(r) })),
      documents: documents.map(viewDocument),
      // The pack's three lists for this party.
      verified: pack.parties[i]!.verified,
      self_reported: pack.parties[i]!.self_reported,
      missing: pack.parties[i]!.missing,
    })),
    summary: pack.summary,
    // "ai_service" when the AI compiled the pack, "stand_in" when the
    // backend's own rules did. Only the first may be called AI-compiled.
    engine: pack.engine,
    notice: NOTICE,
  };
}

export async function getDueDiligence(userId: string, dealId: string) {
  await partyDeal(userId, dealId);
  return build(dealId);
}

// --- For admins ---

export async function getDueDiligenceForAdmin(dealId: string) {
  if (!(await prisma.deal.findUnique({ where: { id: dealId }, select: { id: true } }))) throw notFound("No such deal");
  return build(dealId);
}

// Documents waiting for an admin to confirm them, oldest first.
export async function listDealDocumentsForReview() {
  const documents = await prisma.dealDocument.findMany({
    where: { status: "uploaded", storage_key: { not: null } },
    orderBy: { uploaded_at: "asc" },
    include: { deal: { select: { id: true, title: true, stage: true } }, user: { select: { id: true, full_name: true, role: true } } },
  });
  return documents.map(({ deal, user, ...d }) => ({ ...viewDocument(d), deal, uploaded_by: user }));
}

export async function reviewDealDocument(adminId: string, documentId: string, input: z.infer<typeof reviewSchema>) {
  const document = await prisma.dealDocument.findUnique({ where: { id: documentId }, include: { deal: { select: { title: true } } } });
  if (!document) throw notFound("No such document");

  const saved = await prisma.dealDocument.update({
    where: { id: documentId },
    data: {
      status: input.status,
      rejection_reason: input.status === "rejected" ? (input.reason ?? null) : null,
      reviewed_by: adminId,
      reviewed_at: new Date(),
    },
  });
  const title = TITLES[document.type] ?? document.type;
  await notify(
    document.user_id,
    input.status === "verified"
      ? { type: "deal_document", title: "Document confirmed", body: `${title} for "${document.deal.title}" was confirmed by FounderLink.`, link: `/deals/${document.deal_id}` }
      : { type: "deal_document", title: "Document not accepted", body: `${title} for "${document.deal.title}": ${input.reason}. Please share another.`, link: `/deals/${document.deal_id}` },
  );
  return viewDocument(saved);
}

// When a deal closes or is declined, its files are kept another 30 days.
export function scheduleDealDocumentDeletion(dealId: string, now = new Date()) {
  return prisma.dealDocument.updateMany({
    where: { deal_id: dealId, storage_key: { not: null } },
    data: { delete_after: new Date(now.getTime() + KEEP_MS) },
  });
}
