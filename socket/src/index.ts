import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// Socket.IO rate limiting for chat messages
interface SocketRateEntry { count: number; resetAt: number; }
const SOCKET_RATE_WINDOW_MS = 30_000; // 30 seconds
const SOCKET_RATE_MAX = 10; // 10 messages per 30s
const socketRateLimit = new Map<string, SocketRateEntry>();
  
// Notification debounce: room + user → last notified timestamp
const notificationDebounce = new Map<string, number>();
const NOTIFICATION_DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes

function isSocketRateLimited(socketId: string): boolean {
  const now = Date.now();
  const entry = socketRateLimit.get(socketId);
  if (!entry || now > entry.resetAt) {
    socketRateLimit.set(socketId, { count: 1, resetAt: now + SOCKET_RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= SOCKET_RATE_MAX) return true;
  entry.count++;
  return false;
}

// Cleanup every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of socketRateLimit) {
    if (now > v.resetAt) socketRateLimit.delete(k);
  }
}, 120_000);

const PORT = process.env.PORT || 4000;
if (!process.env.JWT_SECRET) {
  console.error('🚨 CRITICAL ERROR: JWT_SECRET environment variable is not set. Refusing to start in an insecure state.');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map((o) => o.trim());

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 30000,
  pingInterval: 10000,
});

interface AuthenticatedSocket extends Socket {
  user?: {
    id: number | string;
    username: string;
    email?: string;
    handle?: string;
  };
}

// Socket JWT Middleware
io.use((socket: AuthenticatedSocket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

  if (!token) {
    // Guest connection
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.id || decoded.sub;
    if (userId) {
      socket.user = {
        id: userId,
        username: decoded.username || `User-${userId}`,
        email: decoded.email,
        handle: decoded.handle,
      };
    }
    next();
  } catch (err) {
    console.warn('⚠️ Invalid Socket JWT token, connecting as guest:', (err as Error).message);
    next();
  }
});

// Socket Connections
io.on('connection', (socket: AuthenticatedSocket) => {
  const user = socket.user;
  console.log(`🔌 Socket connected: ${socket.id} (User: ${user ? `${user.username} [ID: ${user.id}]` : 'Guest'})`);

  // Join user's private notification channel if authenticated
  if (user?.id) {
    const userRoom = `user:${user.id}`;
    socket.join(userRoom);
    console.log(`👤 Socket ${socket.id} joined private channel: ${userRoom}`);
  }

  // 1. Join Chat Room
  socket.on('chat:join_room', ({ roomId }: { roomId: string }) => {
    if (!roomId) return;
    const roomKey = `room:${roomId}`;
    socket.join(roomKey);
    console.log(`💬 Socket ${socket.id} joined chat room: ${roomKey}`);
    socket.emit('chat:joined', { roomId, success: true });
  });

  // 2. Leave Chat Room
  socket.on('chat:leave_room', ({ roomId }: { roomId: string }) => {
    if (!roomId) return;
    const roomKey = `room:${roomId}`;
    socket.leave(roomKey);
    console.log(`💬 Socket ${socket.id} left chat room: ${roomKey}`);
  });

  // 3. Send Real-Time Chat Message
  socket.on(
    'chat:send_message',
    (data: {
      roomId: string;
      content: string;
      messageId?: string;
      senderName?: string;
      senderAvatar?: string;
      recipientId?: number | string;
    }) => {
      const { roomId, content, messageId, senderName, senderAvatar, recipientId } = data;
      if (!roomId || !content) return;

      // Rate limit: 10 messages per 30 seconds per socket
      if (isSocketRateLimited(socket.id)) {
        socket.emit('chat:error', { message: 'Rate limit: too many messages. Slow down.' });
        return;
      }

      const senderId = user?.id ? String(user.id) : ((data as any).senderId ? String((data as any).senderId) : undefined);

      const messagePayload = {
        id: messageId || `msg-${Date.now()}`,
        roomId,
        senderId,
        senderName: user?.username || (senderName && senderName !== 'Du' ? senderName : 'Nutzer'),
        senderAvatar: senderAvatar,
        senderType: 'user',
        content,
        timestamp: new Date().toISOString(),
      };

      const roomKey = `room:${roomId}`;
      console.log(`✉️ Broadcasting chat:message_received to ${roomKey}:`, messagePayload.content);
      io.to(roomKey).emit('chat:message_received', messagePayload);

      // Notification logic (debounce + subscription check)
      const notifyParticipants = async () => {
        try {
          const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';
          
          // Get room details to find participants
          const roomRes = await fetch(`${strapiUrl}/api/chat-rooms/${roomId}?populate=participants,adminUser`);
          if (!roomRes.ok) return;
          const roomData = await roomRes.json();
          const participants = roomData.data?.participants || [];
          
          const now = Date.now();
          
          for (const participant of participants) {
            const participantId = participant.id;
            // Skip sender
            if (participantId === user?.id) continue;
            
            // Check subscription in unified subscriptions collection
            const subRes = await fetch(`${strapiUrl}/api/subscriptions?filters[subscriber][id][$eq]=${participantId}&filters[targetChatRoom][id][$eq]=${roomId}&filters[type][$eq]=chat_room`);
            if (subRes.ok) {
              const subData = await subRes.json();
              const items = subData.data || [];
              // If there are subscription records for chat_rooms, ensure user is subscribed
              if (items.length > 0 && items[0].attributes?.type === 'unsubscribed') continue;
            }
            
            // Debounce check
            const debounceKey = `${roomId}:${participantId}`;
            const lastNotified = notificationDebounce.get(debounceKey) || 0;
            if (now - lastNotified < NOTIFICATION_DEBOUNCE_MS) continue;
            
            // Update debounce timestamp
            notificationDebounce.set(debounceKey, now);
            
            // Send notification
            const recipientRoom = `user:${participantId}`;
            const notificationPayload = {
              id: `notif-${Date.now()}-${participantId}`,
              type: 'chat_message',
              title: `Neue Nachricht in ${roomData.data?.name || 'einem Raum'}`,
              message: `${user?.username || 'Jemand'}: ${content.length > 60 ? content.slice(0, 57) + '...' : content}`,
              link: `chat:${roomId}`,
              createdAt: new Date().toISOString(),
              isRead: false,
              sender: user
                ? { id: Number(user.id), username: user.username, avatarUrl: senderAvatar }
                : null,
            };
            
            io.to(recipientRoom).emit('notification:new', notificationPayload);
          }
        } catch (err) {
          console.error('Notification error:', err);
        }
      };
      
      // Fire notifications asynchronously (don't block message delivery)
      notifyParticipants();
    }
  );

  // 4. Group Management Events
  socket.on('chat:create_group', async (data: { name: string; userId: number }) => {
    const { name, userId } = data;
    if (!name || !userId) return;
    
    try {
      const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';
      const res = await fetch(`${strapiUrl}/api/chat-groups/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, userId }),
      });
      
      if (res.ok) {
        const result = await res.json();
        socket.emit('chat:group_created', result);
      } else {
        socket.emit('chat:error', { message: 'Failed to create group' });
      }
    } catch (err) {
      socket.emit('chat:error', { message: 'Network error' });
    }
  });

  socket.on('chat:invite_user', async (data: { documentId: string; userId: number; targetUserId: number }) => {
    const { documentId, userId, targetUserId } = data;
    if (!documentId || !userId || !targetUserId) return;
    
    try {
      const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';
      const res = await fetch(`${strapiUrl}/api/chat-groups/${documentId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, userId, targetUserId }),
      });
      
      if (res.ok) {
        socket.emit('chat:user_invited', { documentId, targetUserId });
        // Notify invited user
        const targetRoom = `user:${targetUserId}`;
        io.to(targetRoom).emit('notification:new', {
          id: `notif-invite-${Date.now()}`,
          type: 'group_invite',
          title: 'Du wurdest eingeladen!',
          message: 'Du wurdest zu einer Gruppe eingeladen.',
          link: `chat:${documentId}`,
          createdAt: new Date().toISOString(),
          isRead: false,
        });
      } else {
        const err = await res.json();
        socket.emit('chat:error', { message: err.error?.message || 'Failed to invite user' });
      }
    } catch (err) {
      socket.emit('chat:error', { message: 'Network error' });
    }
  });

  socket.on('chat:kick_user', async (data: { documentId: string; userId: number; targetUserId: number }) => {
    const { documentId, userId, targetUserId } = data;
    if (!documentId || !userId || !targetUserId) return;
    
    try {
      const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';
      const res = await fetch(`${strapiUrl}/api/chat-groups/${documentId}/kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, userId, targetUserId }),
      });
      
      if (res.ok) {
        socket.emit('chat:user_kicked', { documentId, targetUserId });
        // Notify kicked user
        const targetRoom = `user:${targetUserId}`;
        io.to(targetRoom).emit('notification:new', {
          id: `notif-kick-${Date.now()}`,
          type: 'group_kick',
          title: 'Du wurdest entfernt',
          message: 'Du wurdest aus einer Gruppe entfernt.',
          link: `chat:${documentId}`,
          createdAt: new Date().toISOString(),
          isRead: false,
        });
      } else {
        const err = await res.json();
        socket.emit('chat:error', { message: err.error?.message || 'Failed to kick user' });
      }
    } catch (err) {
      socket.emit('chat:error', { message: 'Network error' });
    }
  });

  socket.on('chat:close_group', async (data: { documentId: string; userId: number }) => {
    const { documentId, userId } = data;
    if (!documentId || !userId) return;
    
    try {
      const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';
      const res = await fetch(`${strapiUrl}/api/chat-groups/${documentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, userId }),
      });
      
      if (res.ok) {
        socket.emit('chat:group_closed', { documentId });
        // Notify all participants
        const roomKey = `room:${documentId}`;
        io.to(roomKey).emit('notification:new', {
          id: `notif-close-${Date.now()}`,
          type: 'group_closed',
          title: 'Gruppe geschlossen',
          message: 'Diese Gruppe wurde vom Admin geschlossen.',
          link: `chat:${documentId}`,
          createdAt: new Date().toISOString(),
          isRead: false,
        });
      } else {
        const err = await res.json();
        socket.emit('chat:error', { message: err.error?.message || 'Failed to close group' });
      }
    } catch (err) {
      socket.emit('chat:error', { message: 'Network error' });
    }
  });

  socket.on('chat:subscribe_room', async (data: { documentId: string; userId: number; isSubscribed?: boolean }) => {
    const { documentId, userId, isSubscribed } = data;
    if (!documentId || !userId) return;
    
    try {
      const strapiUrl = process.env.STRAPI_URL || 'http://127.0.0.1:1337';
      const res = await fetch(`${strapiUrl}/api/chat-groups/${documentId}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, userId, isSubscribed }),
      });
      
      if (res.ok) {
        socket.emit('chat:subscription_updated', { documentId, userId, isSubscribed });
      } else {
        socket.emit('chat:error', { message: 'Failed to update subscription' });
      }
    } catch (err) {
      socket.emit('chat:error', { message: 'Network error' });
    }
  });

  // 5. Typing Indicator
  socket.on(
    'chat:typing',
    ({ roomId, isTyping }: { roomId: string; isTyping: boolean }) => {
      if (!roomId) return;
      const roomKey = `room:${roomId}`;
      socket.to(roomKey).emit('chat:typing', {
        roomId,
        userId: user?.id,
        username: user?.username || 'Nutzer',
        isTyping,
      });
    }
  );

  socket.on('disconnect', (reason) => {
    console.log(`❌ Socket disconnected: ${socket.id} (Reason: ${reason})`);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'omni-socket',
    activeConnections: io.sockets.sockets.size,
    timestamp: new Date().toISOString(),
  });
});

// Internal HTTP Webhook endpoint for Strapi CMS or external triggers
app.post('/emit', (req, res) => {
  const { event, room, data } = req.body || {};
  if (!event || !room) {
    return res.status(400).json({ error: 'event and room are required' });
  }

  console.log(`📢 Webhook emit event "${event}" to room "${room}"`);
  io.to(room).emit(event, data);
  res.json({ success: true, emittedTo: room });
});

server.listen(PORT, () => {
  console.log(`🚀 Dedicated Omni WebSocket Server running on http://0.0.0.0:${PORT}`);
});
