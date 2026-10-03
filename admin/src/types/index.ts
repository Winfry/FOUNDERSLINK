export type AdminRole = "super_admin" | "reviewer" | "support";

export type ApplicationStatus = "pending" | "under_review" | "approved" | "rejected";
export type DocumentStatus = "pending" | "verified" | "rejected";
export type WithdrawalStatus = "pending" | "processing" | "completed" | "failed";
export type FounderStatus = "active" | "suspended" | "pending_kyc";
export type InvestorStatus = "active" | "suspended" | "pending_verification";
export type GroupStatus = "active" | "closed" | "forming";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  lastLogin: string | null;
  status: "active" | "disabled";
}

export interface Founder {
  id: string;
  name: string;
  email: string;
  phone: string;
  county: string;
  businessName: string;
  sector: string;
  status: FounderStatus;
  joinedAt: string;
  groupsCount: number;
}

export interface ApplicationDocument {
  id: string;
  name: string;
  mimeType?: string;
  status?: DocumentStatus;
}

export interface InvestorApplication {
  id: string;
  applicantName: string;
  email: string;
  phone: string;
  county: string;
  organization: string;
  ticketSizeKes: number;
  status: ApplicationStatus;
  submittedAt: string;
  rejectionReason?: string;
  payload: Record<string, unknown>;
  documents: ApplicationDocument[];
}

export interface FounderApplication {
  id: string;
  applicantName: string;
  email: string;
  phone: string;
  businessName: string;
  sector: string;
  county: string;
  stage: string;
  fundingTargetKes: number;
  status: ApplicationStatus;
  submittedAt: string;
  rejectionReason?: string;
  payload: Record<string, unknown>;
  documents: ApplicationDocument[];
}

export interface Investor {
  id: string;
  name: string;
  email: string;
  phone: string;
  county: string;
  organization: string;
  status: InvestorStatus;
  totalInvestedKes: number;
  activeDeals: number;
  verifiedAt: string;
}

export interface InvestmentGroup {
  id: string;
  name: string;
  founderName: string;
  county: string;
  targetKes: number;
  raisedKes: number;
  memberCount: number;
  status: GroupStatus;
  createdAt: string;
}

export interface Withdrawal {
  id: string;
  founderName: string;
  amountKes: number;
  mpesaNumber: string;
  status: WithdrawalStatus;
  requestedAt: string;
  reference: string;
}

export interface PlatformTransaction {
  id: string;
  groupName: string;
  type: "deposit" | "withdrawal";
  memberName: string;
  amountKes: number;
  reference: string;
  completedAt: string;
}

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  resource: string;
  ipAddress: string;
  createdAt: string;
}

export interface DashboardStats {
  totalFounders: number;
  pendingApplications: number;
  activeInvestors: number;
  pendingWithdrawals: number;
  monthlyVolumeKes: number;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  at: string;
  actor?: string;
}

export interface PaginatedParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
