import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export function useNetworkStatus() {
  const [isOffline, setIsOffline] = useState(false);
  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      setIsOffline(!(state.isConnected && state.isInternetReachable !== false));
    });
    return () => sub();
  }, []);
  return { isOffline };
}
