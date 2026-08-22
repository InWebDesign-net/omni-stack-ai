import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://omni-socket.inwebdesign.net';

let socketInstance: Socket | null = null;

export function getSocket(): Socket | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      /**
       * Socket.IO calls this before every connection attempt, including each
       * reconnect, so the handshake always carries a token for the session that
       * is valid *now* — a page that was open across a logout or a login picks
       * up the change on its next reconnect instead of reusing a stale copy.
       *
       * Fetching it per attempt is also why the browser no longer has to store
       * the token: it lives in this callback for the length of one handshake.
       * A guest, or any failure to reach the route, connects with an empty
       * token, which the gateway accepts as an anonymous connection.
       */
      auth: (cb: (data: { token: string }) => void) => {
        fetch('/api/auth/socket-token', { credentials: 'same-origin' })
          .then((res) => (res.ok ? res.json() : { token: null }))
          .then((data) => cb({ token: data?.token || '' }))
          .catch(() => cb({ token: '' }));
      },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('⚡ Connected to Omni WebSocket Gateway:', socketInstance?.id);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('⚠️ WebSocket connection error:', err.message);
    });
  } else if (!socketInstance.connected) {
    // The auth callback above runs again on this attempt, so a socket that was
    // opened as a guest and is now reconnecting after a login authenticates
    // itself — nothing here has to carry the token over.
    socketInstance.connect();
  }

  return socketInstance;
}
