import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

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

      // If 1:1 message, push notification to recipient's private room
      if (recipientId && String(recipientId) !== String(user?.id)) {
        const recipientRoom = `user:${recipientId}`;
        const notificationPayload = {
          id: `notif-${Date.now()}`,
          type: 'chat_message',
          title: `Neue Nachricht von ${user?.username || senderName || 'Nutzer'}`,
          message: content.length > 80 ? content.slice(0, 77) + '...' : content,
          link: `chat:${roomId}`,
          createdAt: new Date().toISOString(),
          isRead: false,
          sender: user
            ? {
                id: Number(user.id),
                username: user.username,
                avatarUrl: senderAvatar,
              }
            : null,
        };

        console.log(`🔔 Direct notification pushed to ${recipientRoom}`);
        io.to(recipientRoom).emit('notification:new', notificationPayload);
      }
    }
  );

  // 4. Typing Indicator
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
