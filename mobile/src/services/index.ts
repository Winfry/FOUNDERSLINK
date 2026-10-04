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

export const authService: AuthService = mockAuthService;
export const founderService: FounderService = mockFounderService;
export const fundingService: FundingService = mockFundingService;
export const complianceService: ComplianceService = mockComplianceService;
export const connectionService: ConnectionService = mockConnectionService;
export const vettingService: VettingService = mockVettingService;
export const consentService: ConsentService = mockConsentService;
export const dealService: DealService = mockDealService;
export const circleService: CircleService = mockCircleService;
export const conversationService: ConversationService = mockConversationService;
export const notificationService: NotificationService = mockNotificationService;
export const referenceDataService: ReferenceDataService = mockReferenceDataService;

/** Legacy alias — chamas replace project groups */
export const groupService = mockGroupAlias;
/** Investor tabs stub (founder rewrite is primary) */
export const investorService = mockInvestorStub;
export const chatService = mockChatAdapter;

export * from './types/api';
