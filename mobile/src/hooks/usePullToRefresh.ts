import { useCallback, useState } from 'react';

/**
 * Pull-to-refresh for a list. The spinner shows only while a refresh she
 * asked for runs, not during the lists' own background checks (some ask
 * again every few seconds), which would make it flash.
 */
export function usePullToRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void refetch().finally(() => setRefreshing(false));
  }, [refetch]);
  return { refreshing, onRefresh };
}
