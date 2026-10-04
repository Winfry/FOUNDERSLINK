import { API_URL, currentToken } from './client';

export type LiveEvent = { type: 'message'; message: { conversation_id: string } } | { type: 'notification' } | { type: 'ready' };

/**
 * Listens to the backend's live connection and calls `onEvent` for each
 * thing it pushes: a new chat message or a new notification. Returns a
 * function that stops listening.
 *
 * The connection only tells the app that something new exists. The app
 * then asks for it in the normal way, so nothing is lost if the
 * connection drops; it is retried every few seconds.
 */
export function listenLive(onEvent: (event: LiveEvent) => void): () => void {
  if (!API_URL) return () => {};

  let socket: WebSocket | null = null;
  let stopped = false;
  let retry: ReturnType<typeof setTimeout> | null = null;

  const open = async () => {
    const token = await currentToken();
    if (stopped || !token) return;
    socket = new WebSocket(`${API_URL.replace(/^http/, 'ws')}/ws`);
    // The backend expects to be told who this is before anything else.
    socket.onopen = () => socket?.send(JSON.stringify({ type: 'auth', token }));
    socket.onmessage = (raw) => {
      try {
        onEvent(JSON.parse(String(raw.data)) as LiveEvent);
      } catch {
        /* not something we understand */
      }
    };
    socket.onclose = () => {
      if (!stopped) retry = setTimeout(() => void open(), 5000);
    };
    socket.onerror = () => socket?.close();
  };
  void open();

  return () => {
    stopped = true;
    if (retry) clearTimeout(retry);
    socket?.close();
  };
}
