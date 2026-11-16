import { KENYAN_COUNTIES } from './kenya-data';
import { explain, NOT_ADVICE, PRACTICE, rankExperts, readQuestion, type RateItem } from '@shared/expert-question';
import { allowedAreas, trustSummary } from '@shared/professions';
import { journeyOf, matchNeeds, planIntro, whoYouMayNeed } from '@shared/deal-experts';
import type { ExpertCard, ExpertService } from '../http/expert.http';
import { mockDelay } from './delay';
import { getMemberById, upsertMember } from './mock-store';
import { getMockSessionUserId } from './mock-session';

function me() {
  const uid = getMockSessionUserId();
  return uid ? getMemberById(uid) : undefined;
}

const COUNTIES = KENYAN_COUNTIES.map((c) => c.name);

const expert = (
  user_id: string,
  full_name: string,
  profession: string,
  organisation_name: string,
  bio: string,
  practice_areas: string[],
  sectors: string[],
  counties: string[],
  left: number,
  helped: number,
  /** When the check that earns her trust level passed. */
  checkedOn: string,
  rate_card: RateItem[] = [],
): ExpertCard => ({
  rate_card,
  user_id, full_name, profession, organisation_name, bio, practice_areas, sectors, counties, helped,
  register_body: profession === 'lawyer' ? 'LSK' : profession === 'accountant' ? 'ICPAK' : null,
  register_checked: profession !== 'mentor',
  services: practice_areas.map((a) => PRACTICE[a as keyof typeof PRACTICE]?.label ?? a),
  office_hours: { per_month: 4, left_this_month: left },
  // A mentor's level is earned by two references; the others by their register.
  verification: trustSummary(
    profession,
    profession === 'mentor'
      ? [{ check_type: 'reference', checked_at: checkedOn }, { check_type: 'reference', checked_at: checkedOn }]
      : [{ check_type: 'professional_register', checked_at: checkedOn }],
  ),
});

// Who has been reported, by whom, as the backend keeps it: one report per member each.
const reported = new Set<string>();

/** The verified experts in the demo directory. */
export const DEMO_EXPERTS: ExpertCard[] = [
  expert('exp-kiprono', 'Joseph Kiprono', 'lawyer', 'Kiprono & Associates Advocates', 'Land searches, agricultural leases and title transfers for farms and agribusinesses.', ['land_property', 'contracts'], ['agri'], ['Nakuru', 'Uasin Gishu', 'Nairobi'], 2, 11, '2026-11-12T09:00:00Z', [
    { service: 'First consultation (30 minutes)', area: 'land_property', unit: 'free', price_kes: null },
    { service: 'Land search and title report', area: 'land_property', unit: 'fixed', price_kes: 8000 },
    { service: 'Lease review', area: 'land_property', unit: 'fixed', price_kes: 15000 },
    { service: 'Contract review', area: 'contracts', unit: 'hour', price_kes: 3000 },
  ]),
  expert('exp-atieno', 'Mercy Atieno', 'lawyer', 'Atieno Law', 'Land and property law for farmers and cooperatives in western Kenya.', ['land_property'], ['agri'], ['Kisumu', 'Kakamega', 'Siaya'], 3, 7, '2026-10-28T09:00:00Z', [
    { service: 'First consultation (30 minutes)', area: 'land_property', unit: 'free', price_kes: null },
    { service: 'Land search and title report', area: 'land_property', unit: 'fixed', price_kes: 6500 },
    { service: 'Title transfer', area: 'land_property', unit: 'fixed', price_kes: 25000 },
  ]),
  expert('exp-wanjiku', 'Wanjiku Kamau', 'lawyer', 'Kamau & Co. Advocates', 'Company law, investment deals and data protection for young businesses.', ['company', 'investment_deals', 'data_protection'], ['health', 'fintech'], ['Nairobi'], 1, 4, '2026-11-02T09:00:00Z', [
    { service: 'First consultation (30 minutes)', area: 'company', unit: 'free', price_kes: null },
    { service: 'Company papers check', area: 'company', unit: 'fixed', price_kes: 12000 },
    { service: 'Shareholders agreement review', area: 'investment_deals', unit: 'fixed', price_kes: 35000 },
    { service: 'Data protection registration', area: 'data_protection', unit: 'fixed', price_kes: 20000 },
  ]),
  expert('exp-mutua', 'Daniel Mutua', 'accountant', 'Mutua CPA', 'Tax, eTIMS and books for farms and small food businesses.', ['tax', 'bookkeeping'], ['agri', 'retail'], [], 4, 9, '2026-09-15T09:00:00Z', [
    { service: 'VAT and eTIMS set-up', area: 'tax', unit: 'fixed', price_kes: 10000 },
    { service: 'Tax advice', area: 'tax', unit: 'hour', price_kes: 2500 },
    { service: 'Monthly bookkeeping', area: 'bookkeeping', unit: 'fixed', price_kes: 8000 },
  ]),
  expert('exp-njambi', 'Esther Njambi', 'accountant', 'Njambi & Partners', 'Checks the numbers before you invest: audits and due diligence.', ['audit', 'bookkeeping'], [], ['Nairobi', 'Kiambu'], 2, 5, '2026-10-05T09:00:00Z', [
    { service: 'Financial due diligence', area: 'audit', unit: 'fixed', price_kes: 45000 },
    { service: 'Books review', area: 'bookkeeping', unit: 'fixed', price_kes: 15000 },
  ]),
  expert('exp-ochieng', 'Brian Ochieng', 'mentor', 'Kilimo Ventures Lab', 'Helps agribusiness founders pitch and grow.', ['fundraising', 'business_growth'], ['agri'], [], 3, 14, '2026-09-01T09:00:00Z', [
    { service: 'First consultation (30 minutes)', area: 'fundraising', unit: 'free', price_kes: null },
    { service: 'Pitch deck review', area: 'fundraising', unit: 'fixed', price_kes: 5000 },
  ]),
  // From the wider list of professions (shared/professions). No land surveyor yet,
  // so the app shows honestly when nobody offers a need.
  expert('exp-wafula', 'Peter Wafula', 'valuer', 'Wafula Valuers', 'Values farmland, buildings and equipment for banks and investors.', ['valuation'], ['agri'], ['Nakuru', 'Nairobi', 'Kiambu'], 2, 8, '2026-10-20T09:00:00Z', [
    { service: 'Farm and equipment valuation', area: 'valuation', unit: 'fixed', price_kes: 30000 },
  ]),
  expert('exp-chebet', 'Faith Chebet', 'company_secretary', 'Chebet Corporate Services', 'Share allotments, share registers, CR12 updates and annual returns.', ['governance'], [], ['Nairobi'], 3, 12, '2026-11-05T09:00:00Z', [
    { service: 'Share allotment and register update', area: 'governance', unit: 'fixed', price_kes: 12000 },
  ]),
  expert('exp-omondi', 'Kevin Omondi', 'insurance_broker', 'Omondi Insurance Brokers', 'Business, asset and staff cover for small businesses.', ['insurance'], [], [], 4, 6, '2026-09-28T09:00:00Z', [
    { service: 'Cover review (paid by the insurer)', area: 'insurance', unit: 'free', price_kes: null },
  ]),
];

/** The expert's session requests on demo data. */
export const mockExpertService: ExpertService = {
  async listSessions() {
    await mockDelay();
    return me()?.sessions ?? [];
  },
  async answer(id, status) {
    await mockDelay();
    const member = me();
    if (!member) return;
    member.sessions = (member.sessions ?? []).map((s) => (s.id === id ? { ...s, status } : s));
    upsertMember(member);
  },
  async find(question, lang = 'en') {
    await mockDelay(600);
    const understood = readQuestion(question, COUNTIES, (p, area) => allowedAreas(p).includes(area));
    // "I'm preparing to raise investment": the whole path, each step with a verified expert.
    const journey = journeyOf(question);
    if (journey) {
      const side = me()?.user.role === 'investor' ? 'investor' : 'founder';
      const plan = matchNeeds(whoYouMayNeed(journey, { side, sector: understood.sector }), DEMO_EXPERTS, understood.sector);
      return {
        understood: { profession: null, practice_area: null, practice_area_label: null, sector: understood.sector ?? null, county: understood.county ?? null, budget_kes: understood.budgetKes ?? null },
        explanation: planIntro(journey, side),
        experts: [...new Map(plan.flatMap((p) => (p.expert ? [[p.expert.user_id, p.expert] as const] : []))).values()],
        plan: plan.map((p) => ({ need: p.id, area: p.area, who: p.who, why: p.why, step: p.step, expert: p.expert })),
        note: NOT_ADVICE[lang],
      };
    }
    const ranked = rankExperts(DEMO_EXPERTS, understood, lang, 3);
    return {
      understood: {
        profession: understood.profession ?? null,
        practice_area: understood.practiceArea ?? null,
        practice_area_label: understood.practiceArea ? PRACTICE[understood.practiceArea].label : null,
        sector: understood.sector ?? null,
        county: understood.county ?? null,
        budget_kes: understood.budgetKes ?? null,
      },
      explanation: explain(understood, lang),
      experts: ranked.map((r) => ({ ...r.expert, reasons: r.reasons })),
      plan: null,
      note: NOT_ADVICE[lang],
    };
  },
  async requestSession(expertId, topic) {
    await mockDelay();
    if (topic.trim().length < 10) throw { code: 'VALIDATION_ERROR', message: 'Say what you need help with.' };
    const e = DEMO_EXPERTS.find((x) => x.user_id === expertId);
    if (!e) throw { code: 'NOT_FOUND', message: 'No such expert.' };
    if (e.office_hours.left_this_month === 0) throw { code: 'NO_SLOTS', message: 'This expert has no sessions left this month.' };
  },
  async list() {
    await mockDelay();
    return DEMO_EXPERTS;
  },
  async report(expertId, reason) {
    await mockDelay();
    if (reason.trim().length < 5) throw { code: 'VALIDATION_ERROR', message: 'Say what happened.' };
    const key = `${getMockSessionUserId() ?? 'me'}:${expertId}`;
    if (reported.has(key)) throw { code: 'ALREADY_REPORTED', message: 'You have already reported this expert.' };
    reported.add(key);
    return { suspended: false };
  },
};
