import type { InvestorApplicationService } from '../types/api';
import {
  assertEmailAvailable,
  checkApplicationStatus,
  submitApplication,
} from '../../lib/application-store';
import { mockDelay } from './delay';

export const mockInvestorApplicationService: InvestorApplicationService = {
  async saveDraft(step) {
    await mockDelay();
    return { draftId: `draft-${step}` };
  },
  async submit(data) {
    await mockDelay(1000);
    const email = String(data.email ?? '');
    try {
      assertEmailAvailable(email);
    } catch (e: unknown) {
      throw e;
    }
    const res = submitApplication({
      kind: 'investor',
      email,
      fullName: String(data.fullName ?? 'Investor'),
      phone: String(data.phone ?? ''),
      payload: data,
      documents: (data.documents as { id: string; name: string; mimeType: string }[]) ?? [],
    });
    return { referenceNumber: res.referenceNumber };
  },
  async checkStatus(email, referenceNumber) {
    await mockDelay();
    const res = checkApplicationStatus(email, referenceNumber);
    if (res.status === 'not_found') {
      return { status: 'pending', message: 'Application not found.' };
    }
    return {
      status: res.status as 'pending' | 'approved' | 'rejected' | 'more_info_requested',
      reason: res.reason,
    };
  },
};
