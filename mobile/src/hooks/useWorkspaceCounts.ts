import { useQuery } from '@tanstack/react-query';
import {
  complianceService,
  conversationService,
  dealService,
  expertService,
  fundingService,
  investorService,
} from '../services';
import type { CountKey } from '../components/layout/workspace';

/**
 * The counts beside the side menu's items: "Investors 9", "Readiness 4/7",
 * "Messages 2". Each uses the same query (and so the same cached answer)
 * as the screen it points to, so opening the menu costs nothing extra.
 * A count that fails to load, or is zero, is simply not shown.
 */
export function useWorkspaceCounts(role: 'founder' | 'investor' | 'expert' | null): Partial<Record<CountKey, string>> {
  const founder = role === 'founder';
  const investor = role === 'investor';
  const expert = role === 'expert';

  const matches = useQuery({ queryKey: ['funding-matches'], queryFn: () => fundingService.getMatches(), enabled: founder });
  const compliance = useQuery({ queryKey: ['compliance'], queryFn: () => complianceService.listItems(), enabled: founder });
  const discover = useQuery({ queryKey: ['discover', {}], queryFn: () => investorService.discover(), enabled: investor });
  const requests = useQuery({ queryKey: ['join-requests'], queryFn: () => investorService.getJoinRequests(), enabled: investor });
  const sessions = useQuery({ queryKey: ['expert-sessions'], queryFn: () => expertService.listSessions(), enabled: expert });
  const deals = useQuery({ queryKey: ['deals'], queryFn: () => dealService.list(), enabled: role !== null });
  const chats = useQuery({ queryKey: ['conversations'], queryFn: () => conversationService.list(), enabled: role !== null, refetchInterval: 15000 });

  const shown = (n: number | undefined) => (n ? String(n) : undefined);
  const m = matches.data;
  const items = compliance.data ?? [];

  return {
    investors: shown(m ? m.applyNow.length + m.applyAfter.length + m.notForYou.length : undefined),
    readiness: items.length ? `${items.filter((i) => i.status === 'complete').length}/${items.length}` : undefined,
    businesses: shown(discover.data?.founders.filter((f) => f.band === 'strong' || f.band === 'good').length),
    requests: shown(requests.data?.filter((r) => r.status === 'pending').length),
    sessions: shown(sessions.data?.filter((s) => s.status === 'requested').length),
    // Deals still being worked on; closed ones live in "My investments".
    deals: shown(deals.data?.filter((d) => d.stage !== 'closed' && d.stage !== 'active').length),
    messages: shown(chats.data?.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0)),
  };
}
