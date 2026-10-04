/**
 * Typed service layer — swap mock implementations for HTTP clients later.
 */
import type {
  AuthService,
  CircleService,
  ComplianceService,
  ConnectionService,
  ConsentService,
  ConversationService,
  DealService,
  FounderService,
  FundingService,
  NotificationService,
  ReferenceDataService,
  VettingService,
} from './types/api';
import { mockAuthService } from './mocks/auth.mock';
import { mockFounderService } from './mocks/founder-profile.mock';
import { mockFundingService } from './mocks/funding.mock';
import { mockComplianceService } from './mocks/compliance.mock';
import { mockConnectionService } from './mocks/connection.mock';
import { mockVettingService } from './mocks/vetting.mock';
import { mockConsentService } from './mocks/consent.mock';
import { mockDealService } from './mocks/deal.mock';
import { mockCircleService } from './mocks/circle.mock';
import { mockConversationService } from './mocks/conversation.mock';
import { mockNotificationService } from './mocks/notifications.mock';
import { mockReferenceDataService } from './mocks/reference.mock';
import { mockInvestorStub } from './mocks/investor-stub.mock';
import { mockGroupAlias } from './mocks/group-alias.mock';
import { mockChatAdapter } from './mocks/chat-adapter.mock';
import { API_URL } from './http/client';
import { httpAuthService } from './http/auth.http';
import { httpFounderService } from './http/founder.http';
import { httpFundingService } from './http/funding.http';
import { httpConsentService } from './http/consent.http';
import { httpVettingService } from './http/vetting.http';
import { httpConnectionService } from './http/connection.http';
import { httpDealService } from './http/deal.http';
import { httpCircleService } from './http/circle.http';
import { httpConversationService } from './http/conversation.http';
import { httpComplianceService } from './http/compliance.http';
import { httpNotificationService } from './http/notifications.http';
import { httpReferenceDataService } from './http/reference.http';

/**
 * Each service uses the backend when EXPO_PUBLIC_API_URL is set, and its
 * mock otherwise. To fall back to a mock for one service on the day, name
 * it in EXPO_PUBLIC_MOCK_SERVICES, e.g. "deal,circle".
 */
const mocked = new Set((process.env.EXPO_PUBLIC_MOCK_SERVICES ?? '').split(',').map((name: string) => name.trim()));
const live = (name: string) => API_URL !== '' && !mocked.has(name);

export const authService: AuthService = live('auth') ? httpAuthService : mockAuthService;
export const founderService: FounderService = live('founder') ? httpFounderService : mockFounderService;
export const fundingService: FundingService = live('funding') ? httpFundingService : mockFundingService;
export const complianceService: ComplianceService = live('compliance') ? httpComplianceService : mockComplianceService;
export const connectionService: ConnectionService = live('connection') ? httpConnectionService : mockConnectionService;
export const vettingService: VettingService = live('vetting') ? httpVettingService : mockVettingService;
export const consentService: ConsentService = live('consent') ? httpConsentService : mockConsentService;
export const dealService: DealService = live('deal') ? httpDealService : mockDealService;
export const circleService: CircleService = live('circle') ? httpCircleService : mockCircleService;
export const conversationService: ConversationService = live('conversation') ? httpConversationService : mockConversationService;
export const notificationService: NotificationService = live('notification') ? httpNotificationService : mockNotificationService;
export const referenceDataService: ReferenceDataService = live('reference') ? httpReferenceDataService : mockReferenceDataService;

/** Legacy alias — chamas replace project groups */
export const groupService = mockGroupAlias;
/** Investor tabs stub (founder rewrite is primary) */
export const investorService = mockInvestorStub;
export const chatService = mockChatAdapter;

export * from './types/api';
