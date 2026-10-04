import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { listenLive } from '../services/http/realtime';
import { useAuthStore } from '../stores/authStore';

/**
 * While she is signed in, refreshes chats and the notification bell the
 * moment the backend says there is something new.
 */
export function useLiveUpdates() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const hydrated = useAuthStore((s) => s.hydrated);
  const hydrate = useAuthStore((s) => s.hydrate);

  // The saved session is normally read back on the opening screen. When
  // the app starts somewhere else (a reload, a link), read it here.
  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrated, hydrate]);

  useEffect(() => {
    if (!userId) return;
    return listenLive((event) => {
      if (event.type === 'message') {
        void qc.invalidateQueries({ queryKey: ['messages', event.message.conversation_id] });
        void qc.invalidateQueries({ queryKey: ['conversations'] });
      }
      if (event.type === 'notification') {
        void qc.invalidateQueries({ queryKey: ['notifications'] });
        void qc.invalidateQueries({ queryKey: ['notifications-badge'] });
        // A notice often means something else changed: a request, a decision, a deal.
        void qc.invalidateQueries({ queryKey: ['connections'] });
        void qc.invalidateQueries({ queryKey: ['funding-matches'] });
        void qc.invalidateQueries({ queryKey: ['vetting'] });
      }
    });
  }, [qc, userId]);
}
