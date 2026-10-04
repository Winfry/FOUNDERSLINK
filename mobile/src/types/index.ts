/** Domain types — camelCase in the app; maps from snake_case in the service layer. */

export type UserRole = 'founder' | 'investor' | 'expert' | 'admin';

export type ApprovalStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'needs_info'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'banned';

export type MatchBand = 'strong' | 'good' | 'possible' | 'not_a_fit';

export type ConnectionStatus = 'pending' | 'accepted' | 'declined';

export type DealStage =
  | 'exploring'
  | 'due_diligence'
  | 'terms_agreed'
  | 'documents_compliance'
  | 'closed'
  | 'active';

export type DealType =
  | 'cofounder_partnership'
  | 'investment'
  | 'expert_engagement'
  | 'joint_venture';

export type ComplianceItemStatus = 'not_started' | 'in_progress' | 'complete';

export type ConsentPurpose = 'profile_visibility' | 'ai_matching' | 'contact';
// Every consent the backend keeps. `document_processing` is asked in
// Settings only, so the mock members (three purposes each) stay as they are.
export type SettingsConsentPurpose = ConsentPurpose | 'document_processing';

export type ConversationType = 'direct' | 'circle' | 'deal';

export type TrackRecordSource = 'platform_deal' | 'public' | 'self_reported';

export type BusinessStatus =
  | 'idea'
  | 'informal'
  | 'registered_business_name'
  | 'limited_company';

export type Instrument = 'equity' | 'convertible_note';

export type FounderStage = 'idea' | 'mvp' | 'early_revenue' | 'growth';

export interface SessionUser {
  id: string;
  role: UserRole;
  email: string;
  fullName: string;
  phone?: string | null;
  emailVerified: boolean;
  approvalStatus: ApprovalStatus;
  preferredLanguage: 'en' | 'sw';
  founderOnboardingComplete: boolean;
  investorOnboardingComplete: boolean;
  avatarUrl?: string;
}

export interface AuthTokens {
  accessToken: string;
  expiresAt: number;
}

export interface FounderProfile {
  businessName: string;
  sector: string;
  stage: FounderStage;
  county: string;
  description: string;
  fundingAmountKes: number;
  journeyType: 'startup';
  businessStatus: BusinessStatus;
  instruments: Instrument[];
  hasEmployees: boolean;
  handlesPersonalData: boolean;
  alreadyHave: string[];
  profileCompleteness: number;
  yearStarted?: number;
  website?: string;
}

export interface MatchReason {
  signal: string;
  fits: boolean;
  text: string;
}

export interface MatchGap {
  kind: 'requirement' | 'unanswered';
  text: string;
  complianceItemId?: string;
}

export interface RiskFactor {
  text: string;
}

export interface InvestorMatchCard {
  investorUserId: string;
  displayName: string;
  band: MatchBand;
  reasons: MatchReason[];
  gaps: MatchGap[];
  riskFactors: RiskFactor[];
  organisationName?: string;
  anonymised: boolean;
}

export interface FundingMatches {
  applyNow: InvestorMatchCard[];
  applyAfter: InvestorMatchCard[];
  notForYou: InvestorMatchCard[];
}

export interface ComplianceItem {
  id: string;
  label: string;
  status: ComplianceItemStatus;
  deadline?: string | null;
  description?: string;
}

export interface ComplianceAskAnswer {
  body: string;
  citations: { title: string; url: string }[];
  cannotConfirm?: boolean;
  expertSuggestions?: string[];
}

export interface ConnectionJoinRequest {
  id: string;
  direction: 'received' | 'sent';
  status: ConnectionStatus;
  withUserId: string;
  withFullName: string;
  withOrganisationName?: string;
  focusAreas: string[];
  pitch: string;
  vision: string;
  offer: string;
  proposedAmountKes: number;
  createdAt: string;
  declineReason?: string;
}

export interface ConversationSummary {
  id: string;
  type: ConversationType;
  title: string;
  unreadCount: number;
  lastMessagePreview?: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  kind: 'user' | 'system';
  senderId?: string;
  senderName?: string;
  body: string;
  createdAt: string;
  warningText?: string;
}

export interface DealTerms {
  amountKes: number;
  instrument: Instrument;
  equityPercent?: number | null;
  roles?: string;
  notes?: string;
}

export interface DealPartyConfirmation {
  userId: string;
  name: string;
  confirmed: boolean;
}

export interface DealDocument {
  id: string;
  name: string;
  precheckStatus: 'pending' | 'ai_pre_checked' | 'confirmed_by_founderlink';
  summary?: string;
  /** Which document it is (e.g. the KRA PIN certificate), who shared it, and where staff are with it. */
  type?: string;
  ownerUserId?: string;
  status?: 'uploaded' | 'verified' | 'rejected';
}

export interface Deal {
  id: string;
  type: DealType;
  title: string;
  stage: DealStage;
  withUserId: string;
  withName: string;
  terms: DealTerms;
  confirmations: DealPartyConfirmation[];
  checklist: { id: string; label: string; done: boolean }[];
  timeline: { id: string; title: string; at: string }[];
  documents: DealDocument[];
  dueDiligenceSummary?: {
    verified: string[];
    selfReported: string[];
    missing: string[];
  };
  /** What this deal asks the signed-in party to share at due diligence. */
  requiredDocuments?: { type: string; title: string; provided: boolean }[];
  /** The backend's own words on where the money moves and what the terms are. */
  notice?: string;
  /** The other party's role in the deal (founder or investor), when known. */
  withRole?: string;
}

export type CircleRole = 'organiser' | 'treasurer' | 'member';

export interface CircleSummary {
  id: string;
  name: string;
  type: 'money' | 'learning';
  /** The signed-in member's role in this circle, when known. */
  myRole?: CircleRole;
  memberCount: number;
  paybillNumber?: string | null;
  unreadChatCount: number;
}

export interface CircleContribution {
  id: string;
  memberName: string;
  amountKes: number;
  goalLabel?: string;
  recordedAt: string;
  reference?: string;
}

export interface CircleMember {
  userId: string;
  name: string;
  role: CircleRole;
  joinedAt: string;
}

export interface CircleDetail extends CircleSummary {
  members: CircleMember[];
  contributions: CircleContribution[];
  owes: { memberName: string; amountKes: number }[];
  goals: { id: string; label: string; targetKes: number; recordedKes: number }[];
  moneyDisclaimer: string;
}

export interface VettingApplication {
  approvalStatus: ApprovalStatus;
  phone?: string;
  statement?: string;
  organisationName?: string;
  organisationWebsite?: string;
  decisionReason?: string | null;
  /** Why an admin paused her account, when she is suspended. */
  suspensionReason?: string | null;
  /** Whether her email and her phone have been confirmed by code. */
  emailVerified?: boolean;
  phoneVerified?: boolean;
  /** The number on her account, confirmed or not. */
  accountPhone?: string;
}

export interface ConsentRecord {
  purpose: ConsentPurpose;
  granted: boolean;
  label: string;
  description: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface ApiError {
  code: string;
  message: string;
  /** Which fields the backend refused and why, when it says. */
  details?: { path: string; message: string }[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SignupInput {
  fullName: string;
  email: string;
  password: string;
  role: 'founder' | 'investor' | 'expert';
  acceptTerms: boolean;
}
