import type { VettingService } from '../types/api';
import type { VettingApplication } from '../../types';
import { get, patch, post } from './client';
import { showDemoCode } from './demo-code';

interface ApiVetting {
  approval_status: VettingApplication['approvalStatus'];
  application: {
    phone: string | null;
    statement: string | null;
    organisation_name: string | null;
    organisation_website: string | null;
    decision_reason: string | null;
  } | null;
}

async function load(): Promise<VettingApplication> {
  const { approval_status, application } = await get<ApiVetting>('/vetting/application');
  return {
    approvalStatus: approval_status,
    phone: application?.phone ?? undefined,
    statement: application?.statement ?? undefined,
    organisationName: application?.organisation_name ?? undefined,
    organisationWebsite: application?.organisation_website ?? undefined,
    decisionReason: application?.decision_reason ?? null,
  };
}

export const httpVettingService: VettingService = {
  getApplication: load,

  async saveDraft(data) {
    await patch('/vetting/application', {
      phone: data.phone || undefined,
      statement: data.statement || undefined,
      organisation_name: data.organisationName || undefined,
      organisation_website: data.organisationWebsite || undefined,
    });
    return load();
  },

  async submit() {
    await post('/vetting/application/submit');
    return load();
  },

  // The number is saved on her account first: the code goes to the
  // number the backend holds, not to one sent with the request.
  async verifyPhoneSend(phone) {
    await patch('/me', { phone });
    showDemoCode(await post<{ dev_code?: string }>('/me/phone/code'), 'SMS');
  },

  async verifyPhoneConfirm(code) {
    await post('/me/phone/verify', { code });
  },
};
