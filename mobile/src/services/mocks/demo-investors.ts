import type { FounderProfile, FundingMatches, InvestorMatchCard, MatchBand, MatchReason } from '../../types';

/**
 * The demo's investors, across every sector, so a new founder is matched on
 * her own business: an agriculture founder in Nakuru sees farm investors, a
 * fintech founder sees fintech investors. The real server matches from the
 * investors on FoundersLink; this stands in for it, with the same kind of
 * reasons. Before she is verified, she sees what each one funds, never who
 * they are.
 */
interface DemoInvestor {
  id: string;
  kind: string;
  /** Sector ids; 'any' funds every sector. */
  sectors: string[];
  stages: string[];
  /** Empty: anywhere in Kenya. */
  counties: string[];
  min: number;
  max: number;
  /** A paper they ask for before they will talk (a checklist item id). */
  needs?: string;
  /** What they fund, in a few words, for the card. */
  line: string;
}

const EARLY = ['idea', 'mvp'];
const BUILT = ['mvp', 'early_revenue'];
const LATER = ['early_revenue', 'growth'];

export const DEMO_INVESTORS: DemoInvestor[] = [
  // Health (the same people Amina sees, once she is verified)
  { id: 'inv-lakeside', kind: 'Venture capital fund', sectors: ['health', 'fintech'], stages: BUILT, counties: [], min: 1_000_000, max: 5_000_000, line: 'Invests in health and fintech technology' },
  { id: 'inv-savanna', kind: 'Angel network', sectors: ['health', 'agri', 'education'], stages: [...EARLY, 'early_revenue'], counties: ['Nairobi', 'Kiambu', 'Nakuru'], min: 500_000, max: 2_000_000, line: 'Backs early businesses around Nairobi and Nakuru' },
  { id: 'inv-syndicate', kind: 'Angel network', sectors: ['health'], stages: BUILT, counties: ['Nairobi'], min: 300_000, max: 1_000_000, line: 'Funds clinics and health apps only' },
  { id: 'inv-pwani', kind: 'Impact fund', sectors: ['health', 'climate'], stages: BUILT, counties: [], min: 300_000, max: 1_500_000, needs: 'brs', line: 'Funds health and clean-energy businesses' },
  // Agriculture
  { id: 'inv-shamba', kind: 'Venture capital fund', sectors: ['agri'], stages: [...BUILT, 'growth'], counties: [], min: 1_000_000, max: 10_000_000, line: 'Funds farming and food businesses only' },
  { id: 'inv-mavuno', kind: 'Impact fund', sectors: ['agri', 'climate'], stages: [...EARLY, 'early_revenue'], counties: ['Nakuru', 'Kisumu', 'Kiambu'], min: 250_000, max: 2_500_000, line: 'Backs farms and cooperatives outside Nairobi' },
  { id: 'inv-rift', kind: 'Angel investor', sectors: ['agri', 'retail'], stages: BUILT, counties: ['Nakuru'], min: 500_000, max: 2_500_000, needs: 'cr12', line: 'Invests in Rift Valley businesses' },
  // Fintech
  { id: 'inv-pesa', kind: 'Venture capital fund', sectors: ['fintech'], stages: LATER, counties: [], min: 2_000_000, max: 15_000_000, line: 'Backs payments and lending businesses' },
  { id: 'inv-chama', kind: 'Angel network', sectors: ['fintech', 'retail'], stages: [...EARLY, 'early_revenue'], counties: [], min: 200_000, max: 1_500_000, line: 'Funds money tools for small traders' },
  // Retail, education, logistics, climate
  { id: 'inv-retail', kind: 'Angel investor', sectors: ['retail'], stages: BUILT, counties: [], min: 300_000, max: 2_000_000, line: 'Funds shops and retail brands only' },
  { id: 'inv-darasa', kind: 'Impact fund', sectors: ['education'], stages: [...EARLY, 'early_revenue'], counties: [], min: 300_000, max: 3_000_000, line: 'Backs schools and learning apps' },
  { id: 'inv-safari', kind: 'Venture capital fund', sectors: ['logistics', 'retail'], stages: LATER, counties: [], min: 1_000_000, max: 8_000_000, line: 'Invests in delivery and logistics' },
  { id: 'inv-jua', kind: 'Impact fund', sectors: ['climate'], stages: BUILT, counties: [], min: 500_000, max: 5_000_000, needs: 'brs', line: 'Funds solar, water and clean cooking' },
  // Anywhere, any sector
  { id: 'inv-coast', kind: 'Angel investor', sectors: ['any'], stages: BUILT, counties: ['Mombasa', 'Kilifi'], min: 200_000, max: 1_000_000, line: 'Funds businesses at the coast' },
  { id: 'inv-growth', kind: 'Venture capital fund', sectors: ['any'], stages: ['growth'], counties: [], min: 20_000_000, max: 100_000_000, line: 'Backs larger, growing businesses' },
  { id: 'inv-first', kind: 'Angel investor', sectors: ['any'], stages: EARLY, counties: [], min: 100_000, max: 500_000, line: 'Writes first cheques for new founders' },
];

const SECTOR: Record<string, string> = {
  health: 'Health', agri: 'Agriculture', fintech: 'Fintech', climate: 'Climate', retail: 'Retail', education: 'Education', logistics: 'Logistics', other: 'Other',
};
const STAGE: Record<string, string> = { idea: 'an idea', mvp: 'a first product', early_revenue: 'early revenue', growth: 'growth' };
const PAPER: Record<string, string> = { brs: 'Business registration (BRS)', cr12: 'CR12', kra_pin: 'KRA PIN', tax_compliance: 'Tax compliance certificate' };

/** "KES 500k", "KES 2M": short, as the cards show amounts. */
function short(n: number): string {
  if (n >= 1_000_000) return `KES ${Number((n / 1_000_000).toFixed(1))}M`;
  return `KES ${Math.round(n / 1000)}k`;
}
/** "health", "health and fintech", "health, agriculture and education". */
const andList = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const ticketOf = (i: DemoInvestor) => `${short(i.min)} to ${short(i.max)}`;

type Verdict = { list: 'now' | 'after' | 'no'; band: MatchBand; reasons: MatchReason[]; gap?: string };

/** One investor against her business: whether it fits, and why, in plain words. */
export function judge(i: DemoInvestor, p: Pick<FounderProfile, 'sector' | 'stage' | 'county' | 'fundingAmountKes' | 'alreadyHave'>): Verdict {
  const ask = p.fundingAmountKes ?? 0;
  const sector = i.sectors.includes('any') || i.sectors.includes(p.sector);
  const county = i.counties.length === 0 || i.counties.includes(p.county);
  const amount = ask >= i.min && ask <= i.max;
  const stage = i.stages.includes(p.stage);
  const sectorWords = i.sectors.includes('any') ? 'Funds every sector' : `Funds ${andList(i.sectors.map((s) => (SECTOR[s] ?? s).toLowerCase()))} businesses`;

  // The first thing that rules them out is the one reason given.
  if (!sector) return { list: 'no', band: 'not_a_fit', reasons: [{ signal: 'sector', fits: false, text: `${sectorWords} only` }] };
  if (!county) return { list: 'no', band: 'not_a_fit', reasons: [{ signal: 'county', fits: false, text: `Funds businesses in ${i.counties.join(' and ')} only` }] };
  if (!amount) {
    const text = ask < i.min ? `Their smallest investment is ${short(i.min)}` : `Their largest investment is ${short(i.max)}`;
    return { list: 'no', band: 'not_a_fit', reasons: [{ signal: 'amount', fits: false, text }] };
  }
  if (!stage) return { list: 'no', band: 'not_a_fit', reasons: [{ signal: 'stage', fits: false, text: `Backs businesses at ${i.stages.map((s) => STAGE[s] ?? s).join(' or ')}` }] };

  const reasons: MatchReason[] = [
    { signal: 'sector', fits: true, text: i.sectors.includes('any') ? 'Funds businesses in every sector' : `Invests in ${(SECTOR[p.sector] ?? p.sector).toLowerCase()}` },
    { signal: 'amount', fits: true, text: `Your ${short(ask)} ask is in their range` },
    i.counties.length ? { signal: 'county', fits: true, text: `${p.county} is one of their counties` } : { signal: 'stage', fits: true, text: `Backs businesses at ${STAGE[p.stage] ?? p.stage}` },
  ];
  if (i.needs && !p.alreadyHave.includes(i.needs)) return { list: 'after', band: 'good', reasons: reasons.slice(0, 2), gap: i.needs };
  // A narrow investor who funds only her sector, or only her county, fits best.
  const strong = (i.sectors.length <= 2 && !i.sectors.includes('any')) || i.counties.length > 0;
  return { list: 'now', band: strong ? 'strong' : 'good', reasons };
}

/** Her investor list, as the real server builds it, with names hidden until she is verified. */
export function matchesFor(p: FounderProfile): FundingMatches {
  const out: FundingMatches = { applyNow: [], applyAfter: [], notForYou: [] };
  const label = SECTOR[p.sector] ?? 'Your sector';
  for (const i of DEMO_INVESTORS) {
    const v = judge(i, p);
    const card: InvestorMatchCard = {
      investorUserId: i.id,
      personUserId: i.id,
      displayName: v.list === 'no' ? 'Investor' : `${i.kind} · ${i.sectors.includes('any') ? 'Any sector' : label}`,
      band: v.band,
      reasons: v.list === 'no' ? v.reasons : [{ signal: 'mandate', fits: true, text: i.line }, ...v.reasons].slice(0, 3),
      gaps: v.gap ? [{ kind: 'requirement', text: PAPER[v.gap] ?? v.gap, complianceItemId: v.gap }] : [],
      riskFactors: [],
      anonymised: true,
      ticket: ticketOf(i),
    };
    (v.list === 'now' ? out.applyNow : v.list === 'after' ? out.applyAfter : out.notForYou).push(card);
  }
  const rank: Record<MatchBand, number> = { strong: 0, good: 1, possible: 2, not_a_fit: 3 };
  out.applyNow.sort((a, b) => rank[a.band] - rank[b.band]);
  // A few who are not a fit, with why, are enough.
  out.notForYou = out.notForYou.slice(0, 4);
  return out;
}
