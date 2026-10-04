import type {
  AppNotification,
  AuthTokens,
  ChatMessage,
  CircleContribution,
  CircleDetail,
  CircleSummary,
  ComplianceAskAnswer,
  ComplianceItem,
  ConnectionJoinRequest,
  ConsentRecord,
  ConversationSummary,
  Deal,
  FounderProfile,
  FundingMatches,
  Paginated,
  SessionUser,
  VettingApplication,
  SignupInput,
} from '../../types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthService {
  login(credentials: LoginCredentials): Promise<{ user: SessionUser; tokens: AuthTokens }>;
  signup(input: SignupInput): Promise<{ user: SessionUser; tokens: AuthTokens }>;
  verifyEmailOtp(code: string): Promise<void>;
  resendEmailCode(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(email: string, code: string, newPassword: string): Promise<void>;
  logout(): Promise<void>;
}

export interface FounderService {
  getProfile(): Promise<FounderProfile | null>;
  extractProfileFromText(text: string, language: string): Promise<Partial<FounderProfile>>;
  saveProfile(profile: FounderProfile): Promise<FounderProfile>;
}

export interface FundingService {
  getMatches(): Promise<FundingMatches>;
  getInvestorProfile(investorUserId: string): Promise<Record<string, unknown>>;
}

export interface ComplianceService {
  listItems(): Promise<ComplianceItem[]>;
  updateItemStatus(itemId: string, status: ComplianceItem['status']): Promise<ComplianceItem>;
  ask(question: string): Promise<ComplianceAskAnswer>;
}

export interface ConnectionService {
  list(): Promise<ConnectionJoinRequest[]>;
  /** Asks another member to connect. Needs a verified account. */
  request(userId: string, message?: string): Promise<void>;
  respond(id: string, accept: boolean, reason?: string): Promise<{ connectionId: string; proposedAmountKes?: number }>;
  withdraw(id: string): Promise<void>;
}

export interface VettingService {
  getApplication(): Promise<VettingApplication>;
  saveDraft(data: Partial<VettingApplication>): Promise<VettingApplication>;
  submit(): Promise<VettingApplication>;
  verifyPhoneSend(phone: string): Promise<void>;
  verifyPhoneConfirm(code: string): Promise<void>;
}

export interface ConsentService {
  list(): Promise<ConsentRecord[]>;
  set(purpose: ConsentRecord['purpose'], granted: boolean): Promise<void>;
}

export interface DealService {
  list(): Promise<Deal[]>;
  get(dealId: string): Promise<Deal>;
  createInvestment(withUserId: string, title: string): Promise<Deal>;
  updateTerms(dealId: string, terms: Deal['terms']): Promise<Deal>;
  confirmTerms(dealId: string): Promise<Deal>;
  advanceStage(dealId: string): Promise<Deal>;
  uploadDocument(dealId: string, name: string): Promise<Deal>;
}

export interface CircleService {
  list(): Promise<CircleSummary[]>;
  get(circleId: string): Promise<CircleDetail>;
  recordContribution(circleId: string, payload: { memberUserId: string; amountKes: number; goalId?: string }): Promise<CircleContribution>;
}

export interface ConversationService {
  list(): Promise<ConversationSummary[]>;
  getMessages(conversationId: string, cursor?: string): Promise<Paginated<ChatMessage>>;
  sendMessage(conversationId: string, body: string): Promise<ChatMessage>;
  markRead(conversationId: string): Promise<void>;
  reportMessage(messageId: string, reason: string): Promise<void>;
  blockMember(userId: string): Promise<void>;
}

export interface NotificationService {
  list(): Promise<{ unreadCount: number; notifications: AppNotification[] }>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
}

export interface ReferenceDataService {
  getMetaOptions(): Promise<Record<string, unknown>>;
}
