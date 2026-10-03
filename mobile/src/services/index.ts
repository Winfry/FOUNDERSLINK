/**
 * Typed API service layer — swap mock implementations for HTTP clients later.
 */
import './mocks/demo-seed';
import type {
  AuthService,
  ChatService,
  FounderService,
  GroupService,
  InvestorApplicationService,
  InvestorService,
  NotificationService,
  ReferenceDataService,
} from './types/api';
import { mockAuthService } from './mocks/auth.mock';
import { mockFounderService } from './mocks/founder.mock';
import { mockFounderApplicationService } from './mocks/founder-application.mock';
import { mockInvestorService } from './mocks/investor.mock';
import { mockInvestorApplicationService } from './mocks/investor-application.mock';
import { mockGroupService } from './mocks/group.mock';
import { mockChatService } from './mocks/chat.mock';
import { mockNotificationService } from './mocks/notifications.mock';
import { mockReferenceDataService } from './mocks/reference.mock';

export const authService: AuthService = mockAuthService;
export const founderService: FounderService = mockFounderService;
export const founderApplicationService: InvestorApplicationService = mockFounderApplicationService;
export const investorService: InvestorService = mockInvestorService;
export const investorApplicationService: InvestorApplicationService = mockInvestorApplicationService;
export const groupService: GroupService = mockGroupService;
export const chatService: ChatService = mockChatService;
export const notificationService: NotificationService = mockNotificationService;
export const referenceDataService: ReferenceDataService = mockReferenceDataService;

export * from './types/api';
