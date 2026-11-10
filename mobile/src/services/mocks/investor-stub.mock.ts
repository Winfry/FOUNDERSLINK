import type { InvestorService } from '../http/investor.http';
import { mockDelay } from './delay';
import { demoBusinesses } from './demo-people';
import { getMemberById, upsertMember } from './mock-store';
import { getMockSessionUserId } from './mock-session';

export type { DiscoverCard } from '../http/investor.http';

function me() {
  const uid = getMockSessionUserId();
  return uid ? getMemberById(uid) : undefined;
}

/**
 * The investor journey on demo data: what she funds, the businesses that
 * fit it, and her requests. An investor who is not approved yet sees each
 * business without its name, as the backend does.
 */
export const mockInvestorStub: InvestorService = {
  async getSetup() {
    await mockDelay();
    return me()?.investorSetup ?? null;
  },

  async saveSetup(setup) {
    await mockDelay();
    const member = me();
    if (!member) return;
    member.investorSetup = setup;
    member.user.investorOnboardingComplete = true;
    upsertMember(member);
  },

  async discover(params) {
    await mockDelay();
    const member = me();
    if (!member?.investorSetup) return { approved: false, count: 0, message: '', founders: [], needsFund: true };
    const approved = member.user.approvalStatus === 'approved';
    const search = params?.search?.trim().toLowerCase();
    const founders = demoBusinesses
      .map((b) => b.card)
      .filter((c) => !params?.sector || c.sector === params.sector)
      .filter((c) => !params?.county || c.county === params.county)
      .filter((c) => !params?.stage || c.stage === params.stage)
      .filter((c) => !search || `${c.businessName} ${c.description} ${c.sector} ${c.county}`.toLowerCase().includes(search))
      .map((c) =>
        approved
          ? { ...c, anonymised: false }
          : { ...c, id: null, businessName: null, founderName: null, anonymised: true },
      );
    return {
      approved,
      count: founders.length,
      message: approved ? '' : 'Names show once FoundersLink has approved you.',
      founders,
      needsFund: false,
    };
  },

  async getFounderPublicProfile(id) {
    await mockDelay();
    const found = demoBusinesses.find((b) => b.profile.id === id);
    if (!found) throw { code: 'NOT_FOUND', message: 'This business is not on FoundersLink.' };
    const request = me()?.joinRequests?.find((r) => r.founderId === id);
    return { ...found.profile, connection: { id: request?.id ?? null, status: request?.status ?? 'none' } };
  },

  async submitJoinRequest(founderId, payload) {
    await mockDelay();
    const member = me();
    if (!member) throw { code: 'APPROVAL_REQUIRED', message: 'Verify to connect first.' };
    const founder = demoBusinesses.find((b) => b.profile.id === founderId);
    const row = {
      id: `jr-${Date.now()}`,
      founderId,
      founderName: founder?.profile.founderName ?? 'Founder',
      proposedAmountKes: payload.amountKes ?? 0,
      pitch: payload.pitch,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    };
    member.joinRequests = [row, ...(member.joinRequests ?? [])];
    upsertMember(member);
    return { id: row.id };
  },

  async getJoinRequests() {
    await mockDelay();
    return me()?.joinRequests ?? [];
  },

  async withdrawJoinRequest(id) {
    await mockDelay();
    const member = me();
    if (!member) return;
    member.joinRequests = (member.joinRequests ?? []).filter((r) => r.id !== id);
    upsertMember(member);
  },
};
