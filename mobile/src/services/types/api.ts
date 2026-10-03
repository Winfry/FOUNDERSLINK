import type {
  AuthTokens,
  DiscoverFounderCard,
  DocumentRecord,
  FounderProfile,
  GroupMember,
  GroupTransaction,
  InvestorApplicationStatus,
  InvestorProfile,
  InvestorRequest,
  JoinRequest,
  Paginated,
  ProjectGroup,
  SessionUser,
  WithdrawalRequest,
  ChatMessage,
  AppNotification,
} from '../../types';

export interface LoginCredentials {
  identifier: string;
  password: string;
}

export interface FounderSignupInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  acceptTerms: boolean;
}

export interface AuthService {
  login(credentials: LoginCredentials): Promise<{ user: SessionUser; tokens: AuthTokens }>;
  signupFounder(input: FounderSignupInput): Promise<{ userId: string }>;
  verifyEmailOtp(email: string, otp: string): Promise<void>;
  requestPasswordReset(identifier: string): Promise<void>;
  verifyResetOtp(identifier: string, otp: string): Promise<void>;
  resetPassword(identifier: string, otp: string, newPassword: string): Promise<void>;
  setNewPassword(userId: string, tempPassword: string, newPassword: string): Promise<void>;
  refreshSession(refreshToken: string): Promise<{ user: SessionUser; tokens: AuthTokens }>;
  logout(): Promise<void>;
}

export interface FounderService {
  getProfile(): Promise<FounderProfile>;
  saveOnboardingStep(step: number, data: Record<string, unknown>): Promise<FounderProfile>;
  getDocuments(): Promise<DocumentRecord[]>;
  getDashboard(): Promise<{
    profile: FounderProfile;
    pendingInvestorRequests: number;
    documents: DocumentRecord[];
  }>;
  getInvestorRequests(): Promise<InvestorRequest[]>;
  respondToInvestorRequest(id: string, approve: boolean, reason?: string): Promise<void>;
}

export interface InvestorService {
  getProfile(): Promise<InvestorProfile>;
  saveMatchingQuestionnaire(data: Record<string, unknown>): Promise<InvestorProfile>;
  discover(params: {
    search?: string;
    sector?: string;
    stage?: string;
    county?: string;
    projectType?: string;
    sort?: string;
  }): Promise<DiscoverFounderCard[]>;
  getFounderPublicProfile(founderId: string): Promise<Record<string, unknown>>;
  submitJoinRequest(founderId: string, payload: Record<string, unknown>): Promise<{ id: string }>;
  getJoinRequests(): Promise<JoinRequest[]>;
  withdrawJoinRequest(id: string): Promise<void>;
}

export interface InvestorApplicationService {
  saveDraft(step: number, data: Record<string, unknown>): Promise<{ draftId: string }>;
  submit(data: Record<string, unknown>): Promise<{ referenceNumber: string }>;
  checkStatus(email: string, referenceNumber: string): Promise<{
    status: InvestorApplicationStatus;
    reason?: string;
    message?: string;
  }>;
}

export interface GroupService {
  listGroups(): Promise<ProjectGroup[]>;
  getGroup(groupId: string): Promise<ProjectGroup & { recentActivity: string[] }>;
  getMembers(groupId: string): Promise<GroupMember[]>;
  removeMember(groupId: string, memberId: string): Promise<void>;
  getTransactions(groupId: string, filters?: Record<string, string>): Promise<GroupTransaction[]>;
  deposit(groupId: string, amountKes: number): Promise<GroupTransaction>;
  submitWithdrawal(groupId: string, payload: Record<string, unknown>): Promise<WithdrawalRequest>;
  getWithdrawal(groupId: string, withdrawalId: string): Promise<WithdrawalRequest>;
  approveWithdrawal(withdrawalId: string, approve: boolean, reason?: string): Promise<void>;
  getDocuments(groupId: string): Promise<DocumentRecord[]>;
}

export interface ChatService {
  connect(groupId: string): Promise<void>;
  disconnect(): Promise<void>;
  getMessages(groupId: string, cursor?: string): Promise<Paginated<ChatMessage>>;
  sendMessage(groupId: string, payload: Partial<ChatMessage>): Promise<ChatMessage>;
  markRead(groupId: string, messageIds: string[]): Promise<void>;
  onMessage(callback: (msg: ChatMessage) => void): () => void;
  onTyping(callback: (userId: string, isTyping: boolean) => void): () => void;
  setTyping(groupId: string, isTyping: boolean): Promise<void>;
}

export interface NotificationService {
  list(): Promise<AppNotification[]>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
}

export interface ReferenceDataService {
  getCounties(): Promise<{ code: string; name: string }[]>;
  getSectors(): Promise<{ id: string; label: string }[]>;
  getProjectTypes(): Promise<string[]>;
}
