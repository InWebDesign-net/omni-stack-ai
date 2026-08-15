import { io, Socket } from 'socket.io-client';
import { getStoredJwt } from './affinity';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://omni-socket.inwebdesign.net';

let socketInstance: Socket | null = null;

export function getSocket(): Socket | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const jwt = getStoredJwt();

  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      auth: { token: jwt || '' },
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
  } else {
    // Refresh auth token if needed
    if (jwt && (!socketInstance.auth || (socketInstance.auth as any).token !== jwt)) {
      socketInstance.auth = { token: jwt };
      if (!socketInstance.connected) {
        socketInstance.connect();
      }
    }
  }

  return socketInstance;
}
