// Reading a member's question in her own words ("I want to invest in a
// farming business, who knows land law?") and turning it into a search for
// the right verified experts, with a short, plain explanation of why that
// kind of expert matters.
//
// Used by the backend (POST /experts/find) and by the demo app, so both
// understand a question the same way. Pure: no database, no network.
//
// This is general information to help her find the right person. It is
// never legal, tax or financial advice, and every answer says so.

export const PRACTICE_AREAS = [
  // Lawyers
  'land_property',
  'company',
  'contracts',
  'investment_deals',
  'employment',
  'intellectual_property',
  'data_protection',
  // Accountants
  'tax',
  'bookkeeping',
  'audit',
  // Mentors
  'fundraising',
  'business_growth',
] as const;
export type PracticeArea = (typeof PRACTICE_AREAS)[number];

export type Profession = 'lawyer' | 'accountant' | 'mentor';

/** Who each practice area belongs to, and how it reads. */
export const PRACTICE: Record<PracticeArea, { profession: Profession; label: string; labelSw: string }> = {
  land_property: { profession: 'lawyer', label: 'Land and property law', labelSw: 'Sheria ya ardhi na mali' },
  company: { profession: 'lawyer', label: 'Company law', labelSw: 'Sheria ya kampuni' },
  contracts: { profession: 'lawyer', label: 'Contracts and agreements', labelSw: 'Mikataba na makubaliano' },
  investment_deals: { profession: 'lawyer', label: 'Investment deals', labelSw: 'Mikataba ya uwekezaji' },
  employment: { profession: 'lawyer', label: 'Employment law', labelSw: 'Sheria ya ajira' },
  intellectual_property: { profession: 'lawyer', label: 'Trademarks and intellectual property', labelSw: 'Alama za biashara na hakimiliki' },
  data_protection: { profession: 'lawyer', label: 'Data protection', labelSw: 'Ulinzi wa data' },
  tax: { profession: 'accountant', label: 'Tax and KRA', labelSw: 'Kodi na KRA' },
  bookkeeping: { profession: 'accountant', label: 'Bookkeeping and accounts', labelSw: 'Uhasibu na hesabu' },
  audit: { profession: 'accountant', label: 'Audit and due diligence', labelSw: 'Ukaguzi wa hesabu' },
  fundraising: { profession: 'mentor', label: 'Pitching and fundraising', labelSw: 'Kuwasilisha na kutafuta fedha' },
  business_growth: { profession: 'mentor', label: 'Growing the business', labelSw: 'Kukuza biashara' },
};

export const SECTOR_WORDS: Record<string, string> = {
  health: 'health', agri: 'agriculture', fintech: 'fintech', climate: 'climate', retail: 'retail',
  education: 'education', logistics: 'logistics', other: 'other businesses',
};

// Words that point to each thing, in English and Kiswahili. Checked as
// whole words or word starts, case-insensitively.
const AREA_WORDS: [PracticeArea, string[]][] = [
  ['land_property', ['land', 'title deed', 'title', 'lease', 'plot', 'acre', 'property', 'shamba', 'ardhi', 'hati miliki', 'kiwanja']],
  // Not "invest": an investor says it in every question.
  ['investment_deals', ['term sheet', 'due diligence', 'shareholder', 'equity', 'convertible', 'valuation']],
  ['company', ['company', 'incorporat', 'register my business', 'registration', 'cr12', 'directors', 'kampuni']],
  ['contracts', ['contract', 'agreement', 'mkataba', 'supplier', 'off-taker', 'offtake']],
  ['employment', ['employ', 'staff', 'workers', 'nssf', 'shif', 'wafanyakazi', 'ajira']],
  ['intellectual_property', ['trademark', 'patent', 'copyright', 'brand name', 'intellectual property']],
  ['data_protection', ['data protection', 'privacy', 'odpc', 'personal data']],
  ['tax', ['tax', 'kra', 'vat', 'etims', 'kodi', 'pin']],
  ['bookkeeping', ['bookkeeping', 'books', 'accounts', 'financial statement', 'records', 'hesabu']],
  ['audit', ['audit', 'check the numbers', 'verify the numbers', 'financials']],
  ['fundraising', ['pitch', 'fundrais', 'raise money', 'pitch deck']],
  ['business_growth', ['grow', 'market', 'customers', 'strategy', 'mentor']],
];

const PROFESSION_WORDS: [Profession, string[]][] = [
  ['lawyer', ['lawyer', 'advocate', 'legal', 'law', 'wakili', 'sheria']],
  ['accountant', ['accountant', 'mhasibu', 'cpa']],
  ['mentor', ['mentor', 'coach', 'adviser', 'advisor']],
];

const SECTOR_KEYWORDS: [string, string[]][] = [
  ['agri', ['agri', 'farm', 'farming', 'crop', 'dairy', 'livestock', 'poultry', 'horticultur', 'kilimo', 'shamba', 'mkulima', 'wakulima', 'maize', 'avocado', 'tea', 'coffee']],
  ['health', ['health', 'clinic', 'hospital', 'pharmacy', 'medical', 'afya']],
  ['fintech', ['fintech', 'payments', 'lending', 'mobile money']],
  ['climate', ['climate', 'solar', 'energy', 'recycling', 'clean cooking']],
  ['retail', ['retail', 'shop', 'duka', 'e-commerce', 'ecommerce']],
  ['education', ['education', 'school', 'elimu', 'learning']],
  ['logistics', ['logistics', 'delivery', 'transport', 'boda']],
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (text: string, word: string) => new RegExp(`(^|[^a-z])${escape(word)}`, 'i').test(text);
const count = (text: string, words: string[]) => words.filter((w) => has(text, w)).length;

export interface ReadQuestion {
  profession?: Profession;
  practiceArea?: PracticeArea;
  sector?: string;
  county?: string;
}

/**
 * What she is asking for. The practice area decides the profession unless
 * she names one ("an accountant for my farm" stays an accountant).
 */
export function readQuestion(question: string, counties: readonly string[] = []): ReadQuestion {
  const text = question.toLowerCase();
  const best = <K>(list: [K, string[]][]) => {
    const scored = list.map(([k, words]) => [k, count(text, words)] as const).filter(([, n]) => n > 0);
    scored.sort((a, b) => b[1] - a[1]);
    return scored[0]?.[0];
  };

  let practiceArea: PracticeArea | undefined = best(AREA_WORDS);
  const sector = best(SECTOR_KEYWORDS);
  const named = best(PROFESSION_WORDS);

  // "Invest in a farming business" with nothing else: on a farm, land is
  // what an investor most needs checked.
  if (!practiceArea && sector === 'agri') practiceArea = 'land_property';
  // A named profession wins over the area's own when they disagree.
  if (practiceArea && named && PRACTICE[practiceArea].profession !== named) practiceArea = undefined;
  const profession = named ?? (practiceArea ? PRACTICE[practiceArea].profession : undefined);
  const county = counties.find((c) => has(text, c.toLowerCase()));

  return { profession, practiceArea, sector, county };
}

/**
 * Two or three sentences on why this kind of expert matters, in plain
 * words. General information only.
 */
export function explain(q: ReadQuestion, lang: 'en' | 'sw' = 'en'): string {
  const sw = lang === 'sw';
  const sectorText = q.sector ? SECTOR_WORDS[q.sector] : null;
  const area = q.practiceArea;

  if (area === 'land_property' && q.sector === 'agri') {
    return sw
      ? 'Katika kilimo, ardhi mara nyingi ndiyo hatari kubwa zaidi. Kabla ya kuwekeza, hakikisha nani anamiliki ardhi (hati miliki au ukodishaji uliosajiliwa), kwamba ukodishaji ni mrefu kuliko uwekezaji wako, na hakuna mzozo au mkopo juu ya hati. Wakili anayejua sheria ya ardhi anaweza kukufanyia utafutaji rasmi kwenye sajili ya Ardhi.'
      : 'In farming, land is often the biggest risk. Before you invest, check who owns the land (a title deed or a registered lease), that the lease runs longer than your investment, and that there is no dispute or loan charged on the title. An advocate who knows land law can run an official search at the Lands registry for you.';
  }
  if (area === 'land_property') {
    return sw
      ? 'Wakili wa sheria ya ardhi anaweza kuthibitisha nani anamiliki ardhi au jengo, kuangalia ukodishaji, na kufanya utafutaji rasmi kwenye sajili ya Ardhi kabla hujaweka pesa.'
      : 'An advocate who knows land law can confirm who owns the land or building, check the lease, and run an official search at the Lands registry before you put money in.';
  }
  if (area === 'investment_deals') {
    return sw
      ? 'Kabla ya kutia sahihi, wakili wa mikataba ya uwekezaji anaweza kusoma masharti, makubaliano ya wanahisa na hati za kampuni, na kukuambia unachopata kwa pesa zako.'
      : 'Before you sign, an advocate who does investment deals can read the terms, the shareholders agreement and the company papers, and tell you what you get for your money.';
  }
  if (area && PRACTICE[area].profession === 'accountant') {
    return sw
      ? `Mhasibu anayejua ${PRACTICE[area].labelSw.toLowerCase()} anaweza kuangalia hesabu za biashara na kukuambia kama namba zinaaminika.`
      : `An accountant who knows ${PRACTICE[area].label.toLowerCase()} can look at the business's numbers and tell you whether they hold up${sectorText ? ` for ${sectorText}` : ''}.`;
  }
  if (area) {
    const who = PRACTICE[area].profession === 'mentor' ? (sw ? 'Mshauri' : 'A mentor') : sw ? 'Wakili' : 'An advocate';
    return sw
      ? `${who} anayejua ${PRACTICE[area].labelSw.toLowerCase()} anaweza kukusaidia kuelewa unachohitaji na hatari za kuangalia.`
      : `${who} who knows ${PRACTICE[area].label.toLowerCase()} can help you understand what you need and the risks to look for${sectorText ? ` in ${sectorText}` : ''}.`;
  }
  return sw
    ? 'Sikuweza kujua hasa unahitaji msaada gani, kwa hivyo hawa ni wataalamu waliothibitishwa wanaofaa zaidi. Niambie zaidi (kwa mfano "ardhi", "kodi" au "mkataba") nikupatie bora zaidi.'
    : 'I could not tell exactly what help you need, so here are the verified experts who fit best. Tell me a little more (for example "land", "tax" or "contract") and I can narrow it down.';
}

export const NOT_ADVICE = {
  en: 'This is general information to help you find the right person, not legal, tax or financial advice. Only experts FoundersLink has checked are shown.',
  sw: 'Haya ni maelezo ya jumla ya kukusaidia kumpata mtu sahihi, si ushauri wa kisheria, kodi au fedha. Wataalamu walioangaliwa na FoundersLink pekee ndio wanaoonyeshwa.',
};

export interface ExpertLike {
  profession: string;
  practice_areas: string[];
  sectors: string[];
  counties: string[];
  register_checked: boolean;
  office_hours: { left_this_month: number };
  helped: number;
}

/**
 * How well one expert fits the question, and why, in words. An empty list
 * of sectors or counties on an expert means she covers all of them.
 */
export function fitOf(e: ExpertLike, q: ReadQuestion, lang: 'en' | 'sw' = 'en') {
  const sw = lang === 'sw';
  const reasons: string[] = [];
  let score = 0;
  if (q.practiceArea && e.practice_areas.includes(q.practiceArea)) {
    score += 4;
    reasons.push(sw ? PRACTICE[q.practiceArea].labelSw : PRACTICE[q.practiceArea].label);
  }
  if (q.profession && e.profession === q.profession) score += 2;
  if (q.sector && e.sectors.includes(q.sector)) {
    score += 2;
    reasons.push(sw ? `Hufanya kazi na biashara za ${SECTOR_WORDS[q.sector]}` : `Works with ${SECTOR_WORDS[q.sector]} businesses`);
  }
  if (q.county && (e.counties.length === 0 || e.counties.includes(q.county))) {
    score += 1;
    reasons.push(sw ? `Anapatikana ${q.county}` : `Works in ${q.county}`);
  }
  if (e.register_checked) reasons.push(e.profession === 'accountant' ? (sw ? 'Usajili wa ICPAK umeangaliwa' : 'ICPAK register checked') : e.profession === 'lawyer' ? (sw ? 'Usajili wa LSK umeangaliwa' : 'LSK register checked') : sw ? 'Ameangaliwa na FoundersLink' : 'Checked by FoundersLink');
  return { score, reasons };
}

/**
 * The experts to show, best first: those who do what she asked come
 * before those who only share the profession; then who can take a session
 * this month; then who has helped most.
 */
export function rankExperts<T extends ExpertLike>(experts: T[], q: ReadQuestion, lang: 'en' | 'sw' = 'en', limit = 3) {
  const wanted = experts.filter((e) => !q.profession || e.profession === q.profession);
  const pool = wanted.length > 0 ? wanted : experts;
  return pool
    .map((e) => ({ expert: e, ...fitOf(e, q, lang) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.expert.office_hours.left_this_month > 0) - Number(a.expert.office_hours.left_this_month > 0) ||
        b.expert.helped - a.expert.helped,
    )
    .slice(0, limit);
}
