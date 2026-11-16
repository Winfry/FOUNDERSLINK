import { KENYAN_COUNTIES } from './kenya-data';
import { explain, NOT_ADVICE, PRACTICE, rankExperts, readQuestion } from '@shared/expert-question';
import { allowedAreas } from '@shared/professions';
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
): ExpertCard => ({
  user_id, full_name, profession, organisation_name, bio, practice_areas, sectors, counties, helped,
  register_body: profession === 'lawyer' ? 'LSK' : profession === 'accountant' ? 'ICPAK' : null,
  register_checked: profession !== 'mentor',
  services: practice_areas.map((a) => PRACTICE[a as keyof typeof PRACTICE]?.label ?? a),
  office_hours: { per_month: 4, left_this_month: left },
});

/** The verified experts in the demo directory. */
export const DEMO_EXPERTS: ExpertCard[] = [
  expert('exp-kiprono', 'Joseph Kiprono', 'lawyer', 'Kiprono & Associates Advocates', 'Land searches, agricultural leases and title transfers for farms and agribusinesses.', ['land_property', 'contracts'], ['agri'], ['Nakuru', 'Uasin Gishu', 'Nairobi'], 2, 11),
  expert('exp-atieno', 'Mercy Atieno', 'lawyer', 'Atieno Law', 'Land and property law for farmers and cooperatives in western Kenya.', ['land_property'], ['agri'], ['Kisumu', 'Kakamega', 'Siaya'], 3, 7),
  expert('exp-wanjiku', 'Wanjiku Kamau', 'lawyer', 'Kamau & Co. Advocates', 'Company law, investment deals and data protection for young businesses.', ['company', 'investment_deals', 'data_protection'], ['health', 'fintech'], ['Nairobi'], 1, 4),
  expert('exp-mutua', 'Daniel Mutua', 'accountant', 'Mutua CPA', 'Tax, eTIMS and books for farms and small food businesses.', ['tax', 'bookkeeping'], ['agri', 'retail'], [], 4, 9),
  expert('exp-njambi', 'Esther Njambi', 'accountant', 'Njambi & Partners', 'Checks the numbers before you invest: audits and due diligence.', ['audit', 'bookkeeping'], [], ['Nairobi', 'Kiambu'], 2, 5),
  expert('exp-ochieng', 'Brian Ochieng', 'mentor', 'Kilimo Ventures Lab', 'Helps agribusiness founders pitch and grow.', ['fundraising', 'business_growth'], ['agri'], [], 3, 14),
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
    const ranked = rankExperts(DEMO_EXPERTS, understood, lang, 3);
    return {
      understood: {
        profession: understood.profession ?? null,
        practice_area: understood.practiceArea ?? null,
        practice_area_label: understood.practiceArea ? PRACTICE[understood.practiceArea].label : null,
        sector: understood.sector ?? null,
        county: understood.county ?? null,
      },
      explanation: explain(understood, lang),
      experts: ranked.map((r) => ({ ...r.expert, reasons: r.reasons })),
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
};
