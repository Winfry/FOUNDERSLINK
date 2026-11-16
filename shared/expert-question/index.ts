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
  // Mentors and consultants
  'fundraising',
  'business_growth',
  'sector_expertise',
  // Other licensed professions (shared/professions)
  'governance',
  'valuation',
  'land_survey',
  'construction',
  'insurance',
  'hr',
  'technology',
] as const;
export type PracticeArea = (typeof PRACTICE_AREAS)[number];

/** A profession id from shared/professions ("lawyer", "valuer"...). */
export type Profession = string;

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
  sector_expertise: { profession: 'sector_specialist', label: 'Sector knowledge', labelSw: 'Ujuzi wa sekta' },
  governance: { profession: 'company_secretary', label: 'Governance and share registers', labelSw: 'Utawala na rejista ya hisa' },
  valuation: { profession: 'valuer', label: 'Valuation', labelSw: 'Uthamini' },
  land_survey: { profession: 'land_surveyor', label: 'Land surveys and boundaries', labelSw: 'Upimaji wa ardhi na mipaka' },
  construction: { profession: 'quantity_surveyor', label: 'Building and construction', labelSw: 'Ujenzi' },
  insurance: { profession: 'insurance_broker', label: 'Insurance', labelSw: 'Bima' },
  hr: { profession: 'hr_consultant', label: 'Hiring and HR', labelSw: 'Ajira na rasilimali watu' },
  technology: { profession: 'it_security', label: 'Technology and cybersecurity', labelSw: 'Teknolojia na usalama wa mtandao' },
};

export const SECTOR_WORDS: Record<string, string> = {
  health: 'health', agri: 'agriculture', fintech: 'fintech', climate: 'climate', retail: 'retail',
  education: 'education', logistics: 'logistics', other: 'other businesses',
};

// Words that point to each thing, in English and Kiswahili. Checked as
// whole words or word starts, case-insensitively.
const AREA_WORDS: [PracticeArea, string[]][] = [
  // More specific first: on a tie ("a valuation of the land") the specific one wins.
  ['valuation', ['valuation', 'value the', 'worth', 'valuer', 'thamani']],
  ['land_survey', ['survey', 'beacon', 'boundar', 'subdivi', 'mpaka']],
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
  ['governance', ['company secretary', 'share register', 'annual return', 'board', 'governance']],
  ['construction', ['building', 'construction', 'architect', 'quantity surveyor', 'engineer', 'ujenzi']],
  ['insurance', ['insurance', 'insure', 'cover', 'bima']],
  ['hr', ['hiring', 'recruit', 'human resource', ' hr ', 'payroll']],
  ['technology', ['cybersecurity', 'cyber', 'software', 'security of', 'it system']],
  ['business_growth', ['grow', 'market', 'customers', 'strategy', 'mentor']],
];

const PROFESSION_WORDS: [Profession, string[]][] = [
  ['lawyer', ['lawyer', 'advocate', 'legal', 'law', 'wakili', 'sheria']],
  ['accountant', ['accountant', 'auditor', 'mhasibu', 'cpa']],
  ['tax_agent', ['tax agent']],
  ['company_secretary', ['company secretary']],
  ['valuer', ['valuer']],
  ['land_surveyor', ['land surveyor', 'surveyor']],
  ['architect', ['architect']],
  ['quantity_surveyor', ['quantity surveyor']],
  ['engineer', ['engineer']],
  ['insurance_broker', ['insurance broker', 'broker']],
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
  /** Her budget in KES, when she gives one ("under KES 10,000"). */
  budgetKes?: number;
}

/**
 * What she is asking for. The practice area decides the profession unless
 * she names one ("an accountant for my farm" stays an accountant).
 */
export function readQuestion(
  question: string,
  counties: readonly string[] = [],
  /** Whether a profession may offer a practice area (shared/professions' allowedAreas). */
  canOffer: (profession: string, area: string) => boolean = (p, a) => PRACTICE[a as PracticeArea]?.profession === p,
): ReadQuestion {
  const text = question.toLowerCase();
  const ranked = <K>(list: [K, string[]][]) =>
    list
      .map(([k, words]) => [k, count(text, words)] as const)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);

  const areas = ranked(AREA_WORDS);
  const sector = ranked(SECTOR_KEYWORDS)[0];
  const named = ranked(PROFESSION_WORDS)[0];

  // A named profession wins: of the areas she mentioned, the best one that
  // profession may offer ("an accountant to check the books", "a tax agent
  // for VAT"). Without one, simply the best area.
  let practiceArea: PracticeArea | undefined = named ? areas.find((a) => canOffer(named, a)) : areas[0];
  // "Invest in a farming business" with nothing else: on a farm, land is
  // what an investor most needs checked.
  if (!practiceArea && !named && sector === 'agri') practiceArea = 'land_property';
  if (!practiceArea && named === 'lawyer' && sector === 'agri') practiceArea = 'land_property';
  const profession = named ?? (practiceArea ? PRACTICE[practiceArea].profession : undefined);
  const county = counties.find((c) => has(text, c.toLowerCase()));
  const budgetKes = readBudget(question) ?? undefined;

  return { profession, practiceArea, sector, county, ...(budgetKes ? { budgetKes } : {}) };
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
  rate_card?: RateItem[] | null;
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
  // How she was checked is shown on its own line (shared/professions trustWords), not as a reason.
  // Her budget: what this expert charges for her need, and whether it fits.
  if (q.budgetKes) {
    const item = priceFor(e.rate_card, q.practiceArea);
    if (item && withinBudget(item, q.budgetKes)) {
      score += 3;
      reasons.push(`${rateLine(item, lang)}, ${sw ? 'ndani ya bajeti yako' : 'within your budget'}`);
    } else if (item) {
      reasons.push(`${rateLine(item, lang)}, ${sw ? 'juu ya bajeti yako' : 'above your budget'}`);
    }
  }
  return { score, reasons };
}

/**
 * The experts to show, best first: those who do what she asked come
 * before those who only share the profession; then who can take a session
 * this month; then who has helped most.
 */
export function rankExperts<T extends ExpertLike>(experts: T[], q: ReadQuestion, lang: 'en' | 'sw' = 'en', limit = 3) {
  // Who does what she asked (an accountant or a tax agent, for tax), or
  // shares the profession she named.
  const wanted = experts.filter(
    (e) => (!q.profession && !q.practiceArea) || e.profession === q.profession || (q.practiceArea !== undefined && e.practice_areas.includes(q.practiceArea)),
  );
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

// ---------------------------------------------------------------------------
// Rate cards: what an expert charges, in her own words, and budgets.
//
// An expert lists what she does and what it costs. FoundersLink only shows
// it and uses it to suggest someone within a member's budget. Payment is
// between the member and the expert, never through FoundersLink.

export type RateUnit = 'free' | 'fixed' | 'hour';

export interface RateItem {
  /** In her words: "Land search and title report". */
  service: string;
  /** The practice area it belongs to, so the right price is shown for the right need. */
  area: string;
  unit: RateUnit;
  /** In KES. Null for a free item. */
  price_kes: number | null;
}

export const RATE_CARD_MAX = 8;

const kesWords = (n: number) => `KES ${Math.round(n).toLocaleString('en-KE')}`;

/** "Free", "KES 8,000", "KES 3,000 an hour". */
export function priceWords(item: RateItem, lang: 'en' | 'sw' = 'en'): string {
  if (item.unit === 'free' || !item.price_kes) return lang === 'sw' ? 'Bure' : 'Free';
  return item.unit === 'hour' ? `${kesWords(item.price_kes)} ${lang === 'sw' ? 'kwa saa' : 'an hour'}` : kesWords(item.price_kes);
}

/** "Land search and title report: KES 8,000". */
export const rateLine = (item: RateItem, lang: 'en' | 'sw' = 'en') => `${item.service}: ${priceWords(item, lang)}`;

/**
 * The price that answers her need: the item for that practice area (the
 * cheapest, if several), else nothing. Without an area, her cheapest paid
 * item, so a card can say "From KES 3,000".
 */
export function priceFor(card: RateItem[] | null | undefined, area?: string | null): RateItem | null {
  const items = (card ?? []).filter((i) => i.unit !== 'free');
  const pool = area ? items.filter((i) => i.area === area) : items;
  return [...pool].sort((a, b) => (a.price_kes ?? 0) - (b.price_kes ?? 0))[0] ?? null;
}

/** Whether she offers a free first conversation. */
export const freeFirst = (card: RateItem[] | null | undefined) => (card ?? []).some((i) => i.unit === 'free');

/** Whether a price fits a budget. An hourly rate is read as one hour. */
export const withinBudget = (item: RateItem, budgetKes: number) => item.unit === 'free' || (item.price_kes ?? 0) <= budgetKes;

/**
 * A budget in her words: "under KES 10,000", "below 10k", "budget of
 * 20,000", "15,000 or less", "chini ya 10,000". Null when she gives none.
 */
export function readBudget(question: string): number | null {
  const t = question.toLowerCase().replace(/,(?=\d{3}\b)/g, '');
  const amount = String.raw`(?:kes|ksh|ksh\.|shillings?|sh\.?)?\s*(\d+(?:\.\d+)?)\s*(k|thousand|elfu)?`;
  const patterns = [
    new RegExp(String.raw`(?:under|below|less than|at most|max(?:imum)?|up to|not more than|within|chini ya|isiyozidi)\s*` + amount),
    new RegExp(String.raw`budget(?: of| is)?\s*` + amount),
    new RegExp(amount + String.raw`\s*(?:or less|or below|max)`),
  ];
  // Kiswahili says the thousand first: "chini ya elfu 10" is under 10,000.
  const elfu = /(?:chini ya|isiyozidi|bajeti ya|bajeti)\s*(?:kes|ksh)?\s*elfu\s*(\d+)/.exec(t);
  if (elfu) return Number(elfu[1]) * 1000;
  for (const p of patterns) {
    const m = p.exec(t);
    if (!m) continue;
    const n = Number(m[1]) * (m[2] ? 1000 : 1);
    // Below KES 100 it is not a budget ("up to 5 people").
    if (Number.isFinite(n) && n >= 100) return Math.round(n);
  }
  return null;
}

/** A rate card as she wrote it, checked: what is wrong with it, or null. */
export function rateCardProblem(card: RateItem[], allowed: string[]): string | null {
  if (card.length > RATE_CARD_MAX) return `A rate card has at most ${RATE_CARD_MAX} lines.`;
  for (const i of card) {
    if (i.service.trim().length < 2) return 'Give each line a name, for example "Land search and title report".';
    if (!allowed.includes(i.area)) return `"${i.service}" is not something your profession may offer.`;
    if (i.unit !== 'free' && (!i.price_kes || i.price_kes <= 0)) return `Give "${i.service}" a price in KES, or mark it free.`;
  }
  return null;
}
