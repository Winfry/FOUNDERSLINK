export type UserRole = 'founder' | 'investor' | 'admin';

export type DocumentStatus =
  | 'not_uploaded'
  | 'uploaded'
  | 'under_review'
  | 'verified'
  | 'rejected';

export type RequestStatus = 'pending' | 'approved' | 'declined' | 'withdrawn';

export type InvestorApplicationStatus =
  | 'pending'
  | 'more_info_requested'
  | 'approved'
  | 'rejected';

export type WithdrawalStatus =
  | 'pending_approvals'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled';

export type TransactionType = 'deposit' | 'withdrawal';

export type TransactionStatus = 'pending' | 'completed' | 'failed';

export interface SessionUser {
  id: string;
  role: UserRole;
  email: string;
  fullName: string;
  phone?: string;
  userId?: string;
  mustChangePassword?: boolean;
  avatarUrl?: string;
  founderOnboardingComplete?: boolean;
  investorOnboardingComplete?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface KenyanCounty {
  code: string;
  name: string;
}

export interface BusinessSector {
  id: string;
  label: string;
}

export interface FounderProfile {
  id: string;
  userId: string;
  businessName: string;
  sectorId: string;
  stage: 'idea' | 'mvp' | 'early_revenue' | 'growth';
  county: string;
  yearStarted: number;
  description: string;
  website?: string;
  socialLinks?: string[];
  profileCompleteness: number;
  fundsRaisedKes: number;
  fundingTargetKes: number;
  verifiedDocumentsCount: number;
  totalDocumentsCount: number;
  onboardingStep: number;
  onboardingComplete: boolean;
}

export interface InvestorProfile {
  id: string;
  userId: string;
  bio: string;
  ticketMinKes: number;
  ticketMaxKes: number;
  preferredSectors: string[];
  preferredStages: string[];
  preferredCounties: string[];
  projectTypes: string[];
  onboardingComplete: boolean;
}

export interface DocumentRecord {
  id: string;
  type: string;
  label: string;
  status: DocumentStatus;
  fileName?: string;
  fileSizeBytes?: number;
  rejectionReason?: string;
  waivedNote?: string;
}

export interface InvestorRequest {
  id: string;
  investorId: string;
  investorName: string;
  focusAreas: string[];
  pitchPreview: string;
  fullPitch: string;
  vision: string;
  status: RequestStatus;
  createdAt: string;
}

export interface DiscoverFounderCard {
  id: string;
  businessName: string;
  sector: string;
  stage: string;
  county: string;
  fundingAskKes: number;
  percentRaised: number;
  verifiedDocumentsBadge: boolean;
  matchReasons: string[];
  projectTypes: string[];
}

export interface JoinRequest {
  id: string;
  founderId: string;
  founderBusinessName: string;
  status: RequestStatus;
  proposedAmountKes: number;
  submittedAt: string;
}

export interface ProjectGroup {
  id: string;
  name: string;
  founderId: string;
  balanceKes: number;
  targetKes: number;
  memberCount: number;
  unreadChatCount: number;
  lastMessagePreview?: string;
}

export interface GroupMember {
  id: string;
  name: string;
  role: 'founder' | 'investor';
  joinedAt: string;
  contributionKes: number;
}

export interface GroupTransaction {
  id: string;
  type: TransactionType;
  amountKes: number;
  memberName: string;
  reference: string;
  status: TransactionStatus;
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  groupId: string;
  requesterName: string;
  requesterEmail: string;
  amountKes: number;
  reason: string;
  status: WithdrawalStatus;
  approvals: WithdrawalApproval[];
  rejectionReason?: string;
}

export interface WithdrawalApproval {
  approverId: string;
  approverName: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface ChatMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string;
  body: string;
  createdAt: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  replyToId?: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'document';
}

export interface AppNotification {
  id: string;
  category: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  route?: string;
  metadata?: Record<string, string>;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
