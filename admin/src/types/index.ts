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

export interface VettingCheck {
  id: string;
  checkType: string;
  result: "passed" | "failed";
  method: "manual" | "provider";
  recordedAt: string;
}

export interface VettingDecisionRecord {
  id: string;
  decision: "approved" | "rejected" | "needs_info" | "suspended" | "reinstated";
  reason: string;
  decidedAt: string;
  checks?: VettingCheck[];
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
}

export interface MemberListItem {
  id: string;
  fullName: string;
  email: string;
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
