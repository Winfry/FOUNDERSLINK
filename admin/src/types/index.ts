export type MemberRole = "founder" | "investor" | "expert";

export type ApprovalStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "needs_info"
  | "approved"
  | "rejected"
  | "suspended";

export type RiskLevel = "low" | "medium" | "high";

export type DealStage =
  | "exploring"
  | "due_diligence"
  | "terms_agreed"
  | "documents_compliance"
  | "closed"
  | "active";

export type DealType =
  | "cofounder_partnership"
  | "investment"
  | "expert_engagement"
  | "joint_venture";

export type ChamaType = "money" | "learning";

export type ComplianceSourceStatus = "current" | "due" | "out_of_date";

export type DocumentAdminStatus = "uploaded" | "confirmed" | "rejected";

export interface RiskSignal {
  id: string;
  text: string;
  explanation: string;
}

// The backend's own lists (backend/src/shared/constants.ts).
export type CheckType = "identity" | "phone" | "organisation" | "track_record" | "professional_register" | "reference";
export type CheckMethod = "manual" | "otp" | "provider" | "brs" | "lsk" | "icpak" | "cma" | "domain" | "reference";

export interface CheckInput {
  checkType: CheckType;
  result: "passed" | "failed";
  method: CheckMethod;
}

export interface VettingCheck {
  id: string;
  checkType: string;
  result: "passed" | "failed";
  method: CheckMethod;
  recordedAt: string;
}

export interface VettingDecisionRecord {
  id: string;
  // The older words, or the audit log's own action when it comes from there.
  decision:
    | "approved"
    | "rejected"
    | "needs_info"
    | "suspended"
    | "reinstated"
    | "approve"
    | "approve_first"
    | "reject"
    | "suspend"
    | "reinstate"
    | "recheck_confirmed";
  reason: string;
  decidedAt: string;
  /** The admin who decided, when the audit log says. */
  decidedBy?: string | null;
  checks?: VettingCheck[];
}

export interface ReviewBusiness {
  name: string | null;
  sector: string | null;
  stage: string | null;
  county: string | null;
  amountKes: number | null;
  useOfFunds: string | null;
  description: string | null;
  website: string | null;
}

export interface ReviewInvestor {
  organisation: string | null;
  jobTitle: string | null;
  website: string | null;
  bio: string | null;
  /** What she funds, from the funder record she holds. */
  funds: {
    name: string | null;
    sectors: string[];
    stages: string[];
    ticketMinKes: number | null;
    ticketMaxKes: number | null;
    mandate: string | null;
  } | null;
  /** The listed funder she says she speaks for, when she claimed one. */
  claimsFunderName: string | null;
}

export interface VerificationReference {
  name: string;
  relationship: string;
  phone: string;
}

export interface VerificationQueueItem {
  id: string;
  memberId: string;
  fullName: string;
  email: string;
  role: MemberRole;
  riskLevel: RiskLevel;
  topRiskSignal: string | null;
  submittedAt: string;
  approvalStatus: ApprovalStatus;
}

export interface VerificationDetail {
  id: string;
  memberId: string;
  fullName: string;
  email: string;
  role: MemberRole;
  phone: string | null;
  statement: string | null;
  organisationName: string | null;
  website: string | null;
  references: VerificationReference[];
  professionalRegister: string | null;
  registerNumber: string | null;
  riskLevel: RiskLevel;
  riskSignals: RiskSignal[];
  approvalStatus: ApprovalStatus;
  submittedAt: string;
  decisions: VettingDecisionRecord[];
  checks: VettingCheck[];
  // The rest comes from the live backend only. Undefined means "not told".
  business?: ReviewBusiness | null;
  investor?: ReviewInvestor | null;
  emailConfirmedAt?: string | null;
  phoneConfirmedAt?: string | null;
  /** Set when she sent the application again after being asked for more. */
  resubmittedAfter?: { reason: string; at: string; by: string | null } | null;
  /** Set when one admin has approved an investor and a second must. */
  firstApprovalBy?: string | null;
}

export interface MemberListItem {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: MemberRole;
  organisationOrBusiness: string | null;
  memberStatus: "active" | "suspended";
  joinedAt: string;
  approvalStatus: ApprovalStatus;
}

export interface ConsentRecord {
  purpose: "profile_visibility" | "ai_matching" | "eligibility_attributes" | "contact" | "document_processing";
  label: string;
  granted: boolean;
  updatedAt: string | null;
}

export interface MemberReportSummary {
  id: string;
  reason: string;
  reportedAt: string;
  status: "open" | "handled";
}

export interface MemberTimelineEvent {
  id: string;
  title: string;
  description?: string;
  at: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  at: string;
  actor?: string;
}

export interface MemberDetail {
  id: string;
  fullName: string;
  email: string;
  role: MemberRole;
  phone: string | null;
  county: string | null;
  organisationOrBusiness: string | null;
  memberStatus: "active" | "suspended";
  joinedAt: string;
  approvalStatus: ApprovalStatus;
  verificationSummary: string | null;
  /** Her verification application, when she has one. */
  applicationId?: string | null;
  /** How many deals she is a party to. The backend sends only the number. */
  dealCount?: number;
  consents: ConsentRecord[];
  reportsAgainst: MemberReportSummary[];
  timeline: MemberTimelineEvent[];
}

export interface PrecheckFlag {
  label: string;
  passed: boolean;
  detail: string;
}

export interface DealDocumentItem {
  id: string;
  partyMemberId: string;
  partyName: string;
  fileName: string;
  mimeType: string;
  previewUrl: string;
  aiPrechecked: boolean;
  precheckFlags: PrecheckFlag[];
  adminStatus: DocumentAdminStatus;
  rejectionReason: string | null;
}

export interface DueDiligencePartySummary {
  memberId: string;
  name: string;
  role: MemberRole;
  verifiedCount: number;
  selfReportedCount: number;
  missingCount: number;
}

export interface DealReviewListItem {
  id: string;
  title: string;
  dealType: DealType;
  stage: DealStage;
  parties: string[];
  documentsWaiting: number;
}

export interface DealReviewDetail {
  id: string;
  title: string;
  dealType: DealType;
  stage: DealStage;
  terms: {
    amountKes: number | null;
    instrument: string | null;
    equityPercent: number | null;
    notes: string | null;
  };
  documents: DealDocumentItem[];
  partySummaries: DueDiligencePartySummary[];
}

export interface ReportedMessageRow {
  id: string;
  reporterName: string;
  reportedMemberName: string;
  reason: string;
  reportedAt: string;
  messageText: string;
  aiWarning: boolean;
  status: "open" | "handled";
}

export interface ReportedMemberRow {
  id: string;
  reporterName: string;
  reportedMemberName: string;
  reportedMemberId: string;
  reason: string;
  reportedAt: string;
  aiWarning: boolean;
  status: "open" | "handled";
}

export interface RecheckListItem {
  id: string;
  memberId: string;
  fullName: string;
  role: MemberRole;
  lastCheckedAt: string;
  dueReason: string;
  email?: string;
  dueAt?: string;
}

export interface ComplianceSourceRow {
  id: string;
  name: string;
  covers: string;
  lastUpdatedAt: string;
  status: ComplianceSourceStatus;
  lastReviewedAt: string | null;
  reviewNote: string | null;
}

export interface ChamaListItem {
  id: string;
  name: string;
  type: ChamaType;
  memberCount: number;
  organiserName: string;
  createdAt: string;
}

export interface ChamaMemberRow {
  memberId: string;
  name: string;
  role: "organiser" | "treasurer" | "member";
}

export interface ChamaDetail {
  id: string;
  name: string;
  type: ChamaType;
  organiserName: string;
  createdAt: string;
  members: ChamaMemberRow[];
  contributionCount: number;
  goalCount: number;
}

export interface AuditEntry {
  id: string;
  createdAt: string;
  action: string;
  targetMember: string;
  reason: string;
  /** The admin who acted. */
  by?: string;
}

export interface AdminNavCounts {
  verificationWaiting: number;
  dealReviews: number;
  openReports: number;
  rechecksDue: number;
}

export interface AdminStats {
  foundersCount: number;
  investorsCount: number;
  expertsCount: number;
  membersByStatus: { status: ApprovalStatus; count: number }[];
  verificationsWaiting: number;
  rechecksDue: number;
  openReports: number;
  dealsByStage: { stage: DealStage; count: number }[];
  chamasCount: number;
  /** Deals with a document waiting for an admin: what Deal reviews lists. */
  dealsWithDocumentsWaiting?: number;
  registrationsByMonth: { month: string; count: number }[];
}

export interface PaginatedParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  role?: string;
  actionType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminSettingsState {
  twoFactorEnabled: boolean;
  twoFactorSecret: string;
}
