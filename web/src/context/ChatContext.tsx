'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { jsonAuthHeaders } from '@/lib/affinity';
import { getSocket } from '@/lib/socket';
import { useApp } from '@/context/AppContext';

export interface ChatMessage {
  id: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  senderType: 'user' | 'ai' | 'system';
  content: string;
  timestamp: string;
  meta?: any;
}

export interface ChatRoom {
  id: string;
  documentId?: string;
  slug: string;
  name: string;
  type: 'direct' | 'group' | 'ai' | 'global';
  language: string;
  isAiEnabled?: boolean;
  aiSystemPrompt?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  ownerId?: string;
  adminUser?: any;
  participants?: Array<{
    id: string;
    username: string;
    avatarUrl?: string;
    allowDirectMessages?: 'everyone' | 'subscribers_only' | 'nobody';
  }>;
  messages: ChatMessage[];
}

export interface SearchableUser {
  id: string;
  username: string;
  handle?: string;
  avatarUrl?: string;
  allowDirectMessages?: 'everyone' | 'subscribers_only' | 'nobody';
}

interface ChatContextType {
  isOpen: boolean;
  isExpanded: boolean;
  activeRoomId: string | null;
  rooms: ChatRoom[];
  activeRoom: ChatRoom | null;
  totalUnreadCount: number;
  soundEnabled: boolean;
  showOnlineStatus: boolean;
  showReadReceipts: boolean;
  userPrivacySetting: 'everyone' | 'subscribers_only' | 'nobody';
  roomSubscriptions: Record<string, boolean>;
  typingUsersByRoom: Record<string, string[]>;
  /** Rooms in which the assistant is composing an answer but has not started it. */
  assistantThinkingByRoom: Record<string, boolean>;
  isLoadingMoreByRoom: Record<string, boolean>;
  hasMoreMessagesByRoom: Record<string, boolean>;
  openChat: (roomId?: string) => void;
  closeChat: () => void;
  toggleExpand: () => void;
  setActiveRoomId: (roomId: string | null) => void;
  createRoom: (params: {
    name: string;
    type: 'direct' | 'group' | 'ai' | 'global';
    recipientId?: string;
    participantIds?: string[];
    language?: string;
  }) => Promise<{ roomId: string | null; error?: string }>;
  sendMessage: (roomId: string, content: string) => Promise<void>;
  sendTyping: (roomId: string, isTyping: boolean) => void;
  toggleRoomSubscription: (roomId: string, isSubscribed: boolean) => Promise<void>;
  loadMoreMessages: (roomId: string) => Promise<void>;
  updateUserPrivacySetting: (setting: 'everyone' | 'subscribers_only' | 'nobody') => Promise<void>;
  searchEligibleUsers: (query: string) => Promise<SearchableUser[]>;
  addParticipantToRoom: (roomId: string, userOrAi: { name: string; type: 'user' | 'ai' }) => Promise<void>;
  removeParticipantFromRoom: (roomId: string, participantId: string) => Promise<void>;
  addMemberToRoom: (roomId: string, targetUserId: string | number) => Promise<{ success: boolean; error?: string }>;
  removeMemberFromRoom: (roomId: string, targetUserId: string | number) => Promise<{ success: boolean; error?: string }>;
  refreshRooms: () => Promise<void>;
  setSoundEnabled: (enabled: boolean) => void;
  setShowOnlineStatus: (enabled: boolean) => void;
  setShowReadReceipts: (enabled: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Web Audio API Sound Chime
function playMessageChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) { /* expected: AudioContext may be suspended or unsupported */ }
}

/**
 * A typing entry survives this long without a refresh. The sender re-emits
 * every ~2s while typing, so this tolerates one missed event without cutting
 * off someone who is still writing.
 */
const TYPING_TTL_MS = 5000;
/** Whether an indicator belongs to a person or to the assistant. */
type TypingKind = 'human' | 'assistant';

const TYPING_SWEEP_MS = 1000;

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [userPrivacySetting, setUserPrivacySetting] = useState<'everyone' | 'subscribers_only' | 'nobody'>('everyone');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showReadReceipts, setShowReadReceipts] = useState(true);

  // Room subscriptions map (#96)
  const [roomSubscriptions, setRoomSubscriptions] = useState<Record<string, boolean>>({});

  // Typing indicators (#91)
  const [typingUsersByRoom, setTypingUsersByRoom] = useState<Record<string, string[]>>({});

  /**
   * Who is typing, per room, keyed by user id with an expiry timestamp.
   * `typingUsersByRoom` above stays the public shape — room to display names —
   * so consumers do not need to know about the bookkeeping.
   */
  /**
   * Rooms whose creation is still in flight, keyed by the provisional local id.
   *
   * A room appears in the UI before the server knows about it, under an id like
   * `room-1787426690453`. Sending in that window used to post the provisional id
   * to `/api/chat`, which resolves rooms with `getOrCreateRoomBySlug` — so the
   * server created a *second* room carrying just that message. It came back from
   * the next `fetchRooms` as a room of its own, which is how the first message
   * showed up twice (#134). Anything addressing a room waits on this first.
   */
  const roomCreationRef = useRef<Record<string, Promise<string>>>({});

  /**
   * Resolves a possibly-provisional room id to the one the server knows.
   * Returns immediately for rooms that already exist.
   */
  const resolveRoomId = useCallback(async (roomId: string): Promise<string> => {
    const pending = roomCreationRef.current[roomId];
    return pending ? await pending : roomId;
  }, []);

  const typingStateRef = useRef<
    Record<string, Record<string, { username: string; expiresAt: number; kind: TypingKind }>>
  >({});

  /**
   * Whether the assistant is composing, per room.
   *
   * Kept apart from `typingUsersByRoom` rather than distinguished by name: the
   * assistant is not typing, it is deciding what to say, and the reader is told
   * so in different words. Matching on the display name would also break the
   * moment a person is called "Omni AI".
   */
  const [assistantThinkingByRoom, setAssistantThinkingByRoom] = useState<Record<string, boolean>>({});

  const publishTypingState = useCallback(() => {
    const now = Date.now();
    const next: Record<string, string[]> = {};
    const nextAssistant: Record<string, boolean> = {};
    let changed = false;

    for (const [roomId, entries] of Object.entries(typingStateRef.current)) {
      const live: Record<string, { username: string; expiresAt: number; kind: TypingKind }> = {};
      for (const [userKey, entry] of Object.entries(entries)) {
        if (entry.expiresAt > now) live[userKey] = entry;
        else changed = true;
      }
      typingStateRef.current[roomId] = live;
      const values = Object.values(live);
      const names = values.filter((e) => e.kind === 'human').map((e) => e.username);
      if (names.length > 0) next[roomId] = names;
      if (values.some((e) => e.kind === 'assistant')) nextAssistant[roomId] = true;
    }

    setAssistantThinkingByRoom((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(nextAssistant);
      const same = prevKeys.length === nextKeys.length && nextKeys.every((k) => prev[k]);
      return same ? prev : nextAssistant;
    });

    setTypingUsersByRoom((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      const same =
        prevKeys.length === nextKeys.length &&
        nextKeys.every((k) => (prev[k] || []).join('\u0000') === next[k].join('\u0000'));
      return same && !changed ? prev : next;
    });
  }, []);

  /**
   * Shows a locally-driven indicator — currently "Omni AI" while the assistant
   * is still producing its first token. It goes through the same store as the
   * socket-driven ones, because the sweep rebuilds state from that store and
   * would otherwise wipe an entry written straight into React state.
   */
  const setLocalTyping = useCallback(
    (roomId: string, label: string, on: boolean, kind: TypingKind = 'assistant') => {
      const room = { ...(typingStateRef.current[roomId] || {}) };
      const key = `local:${label}`;
      if (on) {
        // Refreshed by the caller; the long TTL is a safety net, not the timer.
        room[key] = { username: label, expiresAt: Date.now() + 60_000, kind };
      } else {
        delete room[key];
      }
      typingStateRef.current = { ...typingStateRef.current, [roomId]: room };
      publishTypingState();
    },
    [publishTypingState]
  );

  // Sweep expired entries. Cheap, and the only thing that clears an indicator
  // left behind by a client that went away without saying so.
  useEffect(() => {
    const interval = setInterval(publishTypingState, TYPING_SWEEP_MS);
    return () => clearInterval(interval);
  }, [publishTypingState]);

  // Incremental history loading (#98)
  const [isLoadingMoreByRoom, setIsLoadingMoreByRoom] = useState<Record<string, boolean>>({});
  const [hasMoreMessagesByRoom, setHasMoreMessagesByRoom] = useState<Record<string, boolean>>({});

  // Track in-flight message posting to prevent double-send and duplicate AI replies
  const [postingRoomIds, setPostingRoomIds] = useState<Set<string>>(new Set());
  const [aiPendingRoomIds, setAiPendingRoomIds] = useState<Set<string>>(new Set());

  const withRoomUpdate = (roomIdOrSlug: string, updater: (room: ChatRoom) => ChatRoom) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === roomIdOrSlug || r.slug === roomIdOrSlug) {
          return updater(r);
        }
        return r;
      })
    );
  };

  // Initial Rooms List
  const [rooms, setRooms] = useState<ChatRoom[]>([]);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat?roomId=${encodeURIComponent(activeRoomId || '')}`, {
        headers: jsonAuthHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();

      if (data.subscriptions && typeof data.subscriptions === 'object') {
        setRoomSubscriptions(data.subscriptions);
      }

      if (Array.isArray(data.rooms) && data.rooms.length > 0) {
        const loadedRooms: ChatRoom[] = data.rooms.map((r: any) => ({
          id: r.slug || r.id || String(r.documentId),
          documentId: r.documentId,
          slug: r.slug || String(r.id),
          name: r.name || 'Chatraum',
          type: r.type || 'direct',
          language: r.language || 'de',
          isAiEnabled: r.isAiEnabled || r.type === 'ai',
          unreadCount: 0,
          adminUser: r.adminUser ? {
            id: String(r.adminUser.id || r.adminUser),
            username: r.adminUser.username,
            handle: r.adminUser.handle,
          } : undefined,
          participants: Array.isArray(r.participants)
            ? r.participants.map((p: any) => ({
                id: String(p.id),
                username: p.username || 'Nutzer',
                avatarUrl: p.avatarUrl,
                allowDirectMessages: p.allowDirectMessages || 'everyone',
              }))
            : [],
          messages: Array.isArray(r.messages)
            ? r.messages.map((m: any) => ({
                id: m.documentId || String(m.id),
                senderId: m.sender?.id ? String(m.sender.id) : (m.senderId ? String(m.senderId) : undefined),
                senderType: m.senderType || 'user',
                senderName: m.senderType === 'ai' ? 'Omni AI' : (m.sender?.username || 'Nutzer'),
                content: m.content || '',
                timestamp: m.createdAt || new Date().toISOString(),
                meta: m.meta,
              }))
            : [],
        }));

        setRooms((prev) => {
          const map = new Map<string, ChatRoom>();
          for (const item of loadedRooms) {
            if (item && item.id) map.set(item.id, item);
          }
          for (const item of prev || []) {
            if (!item || !item.id) continue;
            const existing = map.get(item.id);
            if (existing) {
              const itemMsgs = Array.isArray(item.messages) ? item.messages : [];
              const itemParts = Array.isArray(item.participants) ? item.participants : [];
              map.set(item.id, {
                ...existing,
                adminUser: existing.adminUser || item.adminUser,
                messages: itemMsgs.length > 0 ? itemMsgs : (existing.messages || []),
                participants: itemParts.length > 0 ? itemParts : (existing.participants || []),
              });
            } else {
              map.set(item.id, item);
            }
          }
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.error('Error loading chat rooms:', err);
    }
  }, [activeRoomId]);

  // Load real rooms from Strapi and listen for real-time WebSocket events
  useEffect(() => {
    let active = true;

    fetchRooms();

    // WebSocket real-time connection
    const socket = getSocket();
    if (socket) {
      if (activeRoomId) {
        socket.emit('chat:join_room', { roomId: activeRoomId });
      }

      const handleIncomingMessage = (msgData: any) => {
        if (!msgData || !msgData.roomId) return;
        console.log('⚡ Incoming chat:message_received via WebSocket:', msgData);

        const newMsg: ChatMessage = {
          id: msgData.id || `msg-${Date.now()}`,
          senderId: msgData.senderId ? String(msgData.senderId) : undefined,
          senderType: msgData.senderType || 'user',
          senderName: msgData.senderName || 'Nutzer',
          content: msgData.content,
          timestamp: msgData.timestamp || new Date().toISOString(),
        };

        setRooms((prev) =>
          prev.map((r) => {
            if (r.id === msgData.roomId || r.slug === msgData.roomId) {
              const exists = r.messages.some((m) => m.id === newMsg.id || (m.content === newMsg.content && Math.abs(new Date(m.timestamp).getTime() - new Date(newMsg.timestamp).getTime()) < 3000));
              if (exists) return r;
              return {
                ...r,
                lastMessageAt: newMsg.timestamp,
                messages: [...r.messages, newMsg],
              };
            }
            return r;
          })
        );

        if (msgData.senderName !== 'Du' && soundEnabled) {
          playMessageChime();
        }
      };

      const handleTyping = (data: any) => {
        if (!data || !data.roomId) return;

        // Identify by user id, not by display name. Two users sharing a name
        // used to collide: one of them stopping cleared the indicator for both,
        // and a user with the same name as you never appeared at all because
        // the self-check dropped them.
        const senderId = data.userId != null ? String(data.userId) : null;
        const myId = currentUser?.id != null ? String(currentUser.id) : null;
        if (senderId && myId && senderId === myId) return;
        if (!senderId && data.username && data.username === (currentUser?.username || 'Du')) return;

        const key = senderId || `name:${data.username}`;
        const room = { ...(typingStateRef.current[data.roomId] || {}) };

        if (data.isTyping) {
          room[key] = {
            username: data.username || 'Nutzer',
            // The sender refreshes every ~2s while typing continues, so an
            // entry that is not renewed within this window means the client
            // stopped, crashed or lost the connection. Without an expiry a
            // dropped client leaves the indicator up forever.
            expiresAt: Date.now() + TYPING_TTL_MS,
            kind: 'human',
          };
        } else {
          delete room[key];
        }

        typingStateRef.current = { ...typingStateRef.current, [data.roomId]: room };
        publishTypingState();
      };

      // A dropped connection means every indicator we are holding is stale.
      const handleDisconnect = () => {
        typingStateRef.current = {};
        publishTypingState();
      };

      socket.on('chat:message_received', handleIncomingMessage);
      socket.on('chat:typing', handleTyping);
      socket.on('disconnect', handleDisconnect);
      
      socket.on('chat:group_created', (data: any) => {
        console.log('Group created:', data);
        const g = data?.group || data;
        if (g && (g.slug || g.id || g.documentId)) {
          const realSlug = g.slug || `room-group-${g.id || Date.now()}`;
          const newRoom: ChatRoom = {
            id: realSlug,
            slug: realSlug,
            documentId: g.documentId,
            name: g.name || 'Gruppe',
            type: 'group',
            language: 'de',
            isAiEnabled: false,
            unreadCount: 0,
            participants: Array.isArray(g.participants) ? g.participants.map((p: any) => ({
              id: String(p.id || p.documentId),
              username: p.username || 'Nutzer',
              avatarUrl: p.avatarUrl,
              allowDirectMessages: p.allowDirectMessages || 'everyone',
            })) : [],
            messages: [],
          };
          setRooms((prev) => {
            const exists = prev.some((r) => r.id === realSlug || r.slug === realSlug);
            if (exists) {
              return prev.map((r) => (r.id === realSlug || r.slug === realSlug ? { ...r, ...newRoom } : r));
            }
            return [newRoom, ...prev];
          });
          setActiveRoomId(realSlug);
          setIsOpen(true);
        }
      });

      return () => {
        active = false;
        socket.off('chat:message_received', handleIncomingMessage);
        socket.off('chat:typing', handleTyping);
        socket.off('disconnect', handleDisconnect);
        socket.off('chat:group_created');
      };
    }

    return () => {
      active = false;
    };
  }, [activeRoomId, soundEnabled, currentUser?.id, fetchRooms]);

  const activeRoom = rooms.find((r) => r.id === activeRoomId || r.slug === activeRoomId) || null;

  const totalUnreadCount = rooms.reduce((sum, r) => sum + (r.unreadCount || 0), 0);

  const openChat = (roomId?: string) => {
    setIsOpen(true);
    if (roomId) {
      setActiveRoomId(roomId);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).openChatRoom = (roomId?: string) => {
        openChat(roomId);
      };
    }
  }, []);

  const closeChat = () => {
    setIsOpen(false);
  };

  const toggleExpand = () => {
    setIsExpanded((prev) => !prev);
  };

  const searchEligibleUsers = async (query: string): Promise<SearchableUser[]> => {
    try {
      const res = await fetch(`/api/chat?searchUser=${encodeURIComponent(query.trim())}`, {
        headers: jsonAuthHeaders(),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.users || []).map((u: any) => ({
        id: String(u.id),
        username: u.username || u.handle || 'Nutzer',
        handle: u.handle || u.username,
        avatarUrl: u.avatarUrl,
        allowDirectMessages: u.allowDirectMessages || 'everyone',
      }));
    } catch (e) {
      console.error('Failed to search eligible users:', e);
      return [];
    }
  };

  const createRoom = async (params: {
    name: string;
    type: 'direct' | 'group' | 'ai' | 'global';
    recipientId?: string;
    participantIds?: string[];
    language?: string;
  }): Promise<{ roomId: string | null; error?: string }> => {
    if (params.type === 'direct' && params.recipientId) {
      const existing = rooms.find(
        (r) => r.type === 'direct' && r.participants?.some((p) => String(p.id) === String(params.recipientId))
      );
      if (existing) {
        setActiveRoomId(existing.id);
        setIsOpen(true);
        return { roomId: existing.id };
      }
    }

    const localId = `room-${Date.now()}`;
    const localRoom: ChatRoom = {
      id: localId,
      slug: localId,
      name: params.name,
      type: params.type,
      language: params.language || 'de',
      isAiEnabled: params.type === 'ai',
      unreadCount: 0,
      participants: params.recipientId ? [{ id: params.recipientId, username: params.name }] : [],
      messages: params.type === 'ai' ? [
        {
          id: `msg-ai-welcome`,
          senderType: 'ai',
          senderName: 'Omni AI',
          content: 'Hallo! Schön, dass du da bist. Ich bin dein Omni KI-Assistent von InWebDesign.net. Hast du schon eine eigene Website oder Fragen zu unseren Hosting & KI-Lösungen?',
          timestamp: new Date().toISOString(),
        }
      ] : [],
    };

    setRooms((prev) => [localRoom, ...prev.filter(r => r.id !== localId)]);
    setActiveRoomId(localId);
    setIsOpen(true);

    // Published before the request goes out, so a message sent in the meantime
    // has something to wait on rather than racing it.
    let settleCreation: (realId: string) => void = () => {};
    roomCreationRef.current[localId] = new Promise<string>((resolve) => {
      settleCreation = (realId: string) => {
        delete roomCreationRef.current[localId];
        resolve(realId);
      };
    });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          ...jsonAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_room',
          ...params,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Nothing was created, so waiters fall back to the local id rather than
        // hanging forever on a promise that will never settle.
        settleCreation(localId);
        return { roomId: localId, error: data.error };
      }

      const newRoomData = data.room;
      if (newRoomData) {
        const realSlug = newRoomData.slug || localId;
        const realDocId = newRoomData.documentId;
        setRooms((prev) =>
          prev.map((r) => (r.id === localId ? { ...r, id: realSlug, slug: realSlug, documentId: realDocId } : r))
        );
        setActiveRoomId(realSlug);
        settleCreation(realSlug);
        return { roomId: realSlug };
      }
      settleCreation(localId);
    } catch (err: any) {
      console.error('Failed to persist room to backend:', err);
      settleCreation(localId);
    }

    return { roomId: localId };
  };

  const addParticipantToRoom = async (roomId: string, userOrAi: { name: string; type: 'user' | 'ai' }) => {
    const isAi = userOrAi.type === 'ai';
    const sysMsg: ChatMessage = {
      id: `sys-${Date.now()}`,
      senderType: 'system',
      content: `${userOrAi.name} (${isAi ? 'KI-Assistent' : 'Nutzer'}) wurde zum Chat hinzugefügt.`,
      timestamp: new Date().toISOString(),
    };

    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === roomId || r.slug === roomId) {
          return {
            ...r,
            isAiEnabled: isAi ? true : r.isAiEnabled,
            messages: [...r.messages, sysMsg],
          };
        }
        return r;
      })
    );

    try {
      if (isAi) {
        await fetch('/api/chat', {
          method: 'POST',
          headers: {
            ...jsonAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'update_room',
            roomId,
            isAiEnabled: true,
          }),
        });
      }
    } catch (e) { /* expected: AudioContext may be suspended or unsupported */ }

    const socket = getSocket();
    if (socket) {
      socket.emit('chat:send_message', {
        roomId,
        content: sysMsg.content,
        senderName: 'System',
        senderType: 'system',
      });
    }

    if (isAi) {
      setTimeout(async () => {
        const aiGreeting: ChatMessage = {
          id: `msg-ai-greeting-${Date.now()}`,
          senderType: 'ai',
          senderName: 'Omni AI',
          content: 'Hallo! Ich bin jetzt im Chat und unterstütze euch gerne mit Antworten & KI-Funktionen.',
          timestamp: new Date().toISOString(),
        };

        setRooms((prev) =>
          prev.map((r) => {
            if (r.id === roomId || r.slug === roomId) {
              return {
                ...r,
                messages: [...r.messages, aiGreeting],
              };
            }
            return r;
          })
        );

        if (socket) {
          socket.emit('chat:send_message', {
            roomId,
            content: aiGreeting.content,
            senderName: 'Omni AI',
            senderType: 'ai',
          });
        }
      }, 500);
    }
  };

  const removeParticipantFromRoom = async (roomId: string, participantIdOrType: string) => {
    const isAi = participantIdOrType === 'ai';
    const sysMsg: ChatMessage = {
      id: `sys-${Date.now()}`,
      senderType: 'system',
      content: isAi ? 'Omni KI-Assistent wurde aus dem Chat entfernt.' : 'Teilnehmer wurde aus dem Chat entfernt.',
      timestamp: new Date().toISOString(),
    };

    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === roomId || r.slug === roomId) {
          return {
            ...r,
            isAiEnabled: isAi ? false : r.isAiEnabled,
            messages: [...r.messages, sysMsg],
          };
        }
        return r;
      })
    );

    try {
      if (isAi) {
        await fetch('/api/chat', {
          method: 'POST',
          headers: {
            ...jsonAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'update_room',
            roomId,
            isAiEnabled: false,
          }),
        });
      }
    } catch (e) { /* expected: AudioContext may be suspended or unsupported */ }

    const socket = getSocket();
    if (socket) {
      socket.emit('chat:send_message', {
        roomId,
        content: sysMsg.content,
        senderName: 'System',
        senderType: 'system',
      });
    }
  };

  const sendMessage = async (requestedRoomId: string, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    /**
     * Wait for the room to exist on the server before addressing it.
     *
     * Sending into a brand-new room used to post its provisional local id,
     * which the API happily turned into a second room holding only this
     * message (#134). Everything below — the optimistic insert, the socket
     * emit, the persist call and the assistant's stream — then has one id that
     * all of them agree on. For a room that already exists this resolves
     * immediately, so the common case is unaffected.
     */
    const roomId = await resolveRoomId(requestedRoomId);

    // Prevent double-send while a message is being posted to this room
    let alreadyPosting = false;
    setPostingRoomIds((prev) => {
      if (prev.has(roomId)) {
        alreadyPosting = true;
        return prev;
      }
      return new Set(prev).add(roomId);
    });
    if (alreadyPosting) return;

    const targetRoom = rooms.find((r) => r.id === roomId || r.slug === roomId);
    const recipient = targetRoom?.participants?.find((p) => p.username !== 'Nutzer');

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderType: 'user',
      senderName: 'Du',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    withRoomUpdate(roomId, (r) => ({
      ...r,
      lastMessageAt: userMsg.timestamp,
      messages: [...r.messages, userMsg],
    }));

    if (soundEnabled) {
      playMessageChime();
    }

    // Broadcast message instantly via WebSocket Gateway
    const socket = getSocket();
    if (socket) {
      socket.emit('chat:send_message', {
        roomId,
        content: trimmed,
        messageId: userMsg.id,
        senderName: 'Du',
        recipientId: recipient?.id,
      });
    }

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: {
          ...jsonAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send_message',
          roomId,
          senderType: 'user',
          content: trimmed,
        }),
      });
    } catch (e) {
      console.error('Failed to persist user message:', e);
    } finally {
      setPostingRoomIds((prev) => {
        const next = new Set(prev);
        next.delete(roomId);
        return next;
      });
    }

    // Trigger AI response if room is AI enabled (#90: Streamed AI response)
    if (targetRoom && (targetRoom.type === 'ai' || targetRoom.isAiEnabled)) {
      let alreadyAiPending = false;
      setAiPendingRoomIds((prev) => {
        if (prev.has(roomId)) {
          alreadyAiPending = true;
          return prev;
        }
        return new Set(prev).add(roomId);
      });
      if (alreadyAiPending) return;

      const aiMsgId = `msg-ai-${Date.now()}`;
      const placeholderAiMsg: ChatMessage = {
        id: aiMsgId,
        senderType: 'ai',
        senderName: 'Omni AI',
        content: '',
        timestamp: new Date().toISOString(),
      };

      // Shown until the first token arrives; real streaming makes this brief.
      setLocalTyping(roomId, 'Omni AI', true);

      (async () => {
        let accumulatedText = '';
        let vectorSummary: string | undefined = undefined;

        try {
          const latestRoom = rooms.find((r) => r.id === roomId || r.slug === roomId);
          const historySnapshot = latestRoom?.messages ?? targetRoom.messages;

          const res = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: trimmed, history: historySnapshot, locale: targetRoom.language || 'de', roomId }),
          });

          // Remove AI typing indicator as stream starts
          setLocalTyping(roomId, 'Omni AI', false);

          if (res.ok && res.body) {
            // Append initial empty message placeholder
            withRoomUpdate(roomId, (r) => ({
              ...r,
              messages: [...r.messages, placeholderAiMsg],
            }));

            const reader = res.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const parsed = JSON.parse(line.slice(6));
                    if (parsed.chunk) {
                      accumulatedText += parsed.chunk;
                      withRoomUpdate(roomId, (r) => ({
                        ...r,
                        lastMessageAt: placeholderAiMsg.timestamp,
                        messages: r.messages.map((m) =>
                          m.id === aiMsgId ? { ...m, content: accumulatedText, meta: parsed.vectorSummary ? { vectorSummary: parsed.vectorSummary } : m.meta } : m
                        ),
                      }));
                    }
                    if (parsed.vectorSummary) {
                      vectorSummary = parsed.vectorSummary;
                    }
                  } catch {
                    /* ignore chunk parse error */
                  }
                }
              }
            }
          } else {
            accumulatedText = targetRoom.language?.startsWith('en')
              ? 'Hello! How can I help you today with Omni and InWebDesign.net?'
              : 'Hallo! Wie kann ich dir heute mit Omni und InWebDesign.net weiterhelfen?';

            withRoomUpdate(roomId, (r) => ({
              ...r,
              messages: [...r.messages, { ...placeholderAiMsg, content: accumulatedText }],
            }));
          }

          if (soundEnabled) {
            playMessageChime();
          }

          if (accumulatedText) {
            await fetch('/api/chat', {
              method: 'POST',
              headers: {
                ...jsonAuthHeaders(),
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                action: 'send_message',
                roomId,
                senderType: 'ai',
                content: accumulatedText,
              }),
            });
          }
        } catch (err) {
          console.error('Error in streamed AI chat response:', err);
        } finally {
          setLocalTyping(roomId, 'Omni AI', false);
          setAiPendingRoomIds((prev) => {
            const next = new Set(prev);
            next.delete(roomId);
            return next;
          });
        }
      })();
    }
  };

  const sendTyping = useCallback((roomId: string, isTyping: boolean) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('chat:typing', {
        roomId,
        username: currentUser?.username || 'Du',
        isTyping,
      });
    }
  }, [currentUser]);

  const toggleRoomSubscription = useCallback(async (roomId: string, isSubscribed: boolean) => {
    setRoomSubscriptions((prev) => ({ ...prev, [roomId]: isSubscribed }));
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: {
          ...jsonAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'toggle_subscription',
          roomId,
          isSubscribed,
        }),
      });
    } catch (err) {
      console.error('Failed to toggle subscription:', err);
    }
  }, []);

  const loadMoreMessages = useCallback(async (roomId: string) => {
    if (isLoadingMoreByRoom[roomId] || hasMoreMessagesByRoom[roomId] === false) return;
    setIsLoadingMoreByRoom((prev) => ({ ...prev, [roomId]: true }));
    try {
      const targetRoom = rooms.find((r) => r.id === roomId || r.slug === roomId);
      const currentCount = targetRoom?.messages?.length || 0;
      const res = await fetch(
        `/api/chat?roomId=${encodeURIComponent(roomId)}&offset=${currentCount}&pageSize=30`,
        { headers: jsonAuthHeaders() }
      );
      if (!res.ok) return;
      const data = await res.json();
      const olderMessages: any[] = data.messages || [];
      if (olderMessages.length < 30) {
        setHasMoreMessagesByRoom((prev) => ({ ...prev, [roomId]: false }));
      }
      if (olderMessages.length > 0) {
        const parsedOlder: ChatMessage[] = olderMessages.map((m: any) => ({
          id: m.documentId || String(m.id),
          senderId: m.sender?.id ? String(m.sender.id) : (m.senderId ? String(m.senderId) : undefined),
          senderType: m.senderType || 'user',
          senderName: m.senderType === 'ai' ? 'Omni AI' : (m.sender?.username || 'Nutzer'),
          content: m.content || '',
          timestamp: m.createdAt || new Date().toISOString(),
          meta: m.meta,
        }));
        withRoomUpdate(roomId, (r) => {
          const existingIds = new Set(r.messages.map((m) => m.id));
          const toAdd = parsedOlder.filter((m) => !existingIds.has(m.id));
          return {
            ...r,
            messages: [...toAdd, ...r.messages],
          };
        });
      }
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      setIsLoadingMoreByRoom((prev) => ({ ...prev, [roomId]: false }));
    }
  }, [rooms, isLoadingMoreByRoom, hasMoreMessagesByRoom]);

  const updateUserPrivacySetting = async (setting: 'everyone' | 'subscribers_only' | 'nobody') => {
    setUserPrivacySetting(setting);
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          ...jsonAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ allowDirectMessages: setting }),
      });
    } catch (e) {
      console.error('Failed to save privacy setting:', e);
    }
  };

  const addMemberToRoom = async (roomId: string, targetUserId: string | number): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          ...jsonAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add_member',
          roomId,
          targetUserId,
        }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };

      if (data.room) {
        setRooms((prev) =>
          (prev || []).map((r) => {
            if (r.id === roomId || r.slug === roomId) {
              const updatedParts = Array.isArray(data.room.participants)
                ? data.room.participants.map((p: any) => ({
                    id: String(p.id),
                    username: p.username || 'Nutzer',
                    avatarUrl: p.avatarUrl,
                    allowDirectMessages: p.allowDirectMessages || 'everyone',
                  }))
                : r.participants;
              return { ...r, participants: updatedParts };
            }
            return r;
          })
        );
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const removeMemberFromRoom = async (roomId: string, targetUserId: string | number): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          ...jsonAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'remove_member',
          roomId,
          targetUserId,
        }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };

      if (data.room) {
        setRooms((prev) =>
          (prev || []).map((r) => {
            if (r.id === roomId || r.slug === roomId) {
              const updatedParts = (r.participants || []).filter(
                (p) => String(p.id) !== String(targetUserId)
              );
              return { ...r, participants: updatedParts };
            }
            return r;
          })
        );
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        isExpanded,
        activeRoomId,
        rooms,
        activeRoom,
        totalUnreadCount,
        soundEnabled,
        showOnlineStatus,
        showReadReceipts,
        userPrivacySetting,
        roomSubscriptions,
        typingUsersByRoom,
        assistantThinkingByRoom,
        isLoadingMoreByRoom,
        hasMoreMessagesByRoom,
        openChat,
        closeChat,
        toggleExpand,
        setActiveRoomId,
        createRoom,
        sendMessage,
        sendTyping,
        toggleRoomSubscription,
        loadMoreMessages,
        updateUserPrivacySetting,
        searchEligibleUsers,
        addParticipantToRoom,
        removeParticipantFromRoom,
        addMemberToRoom,
        removeMemberFromRoom,
        refreshRooms: fetchRooms,
        setSoundEnabled,
        setShowOnlineStatus,
        setShowReadReceipts,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    return {
      isOpen: false,
      isExpanded: false,
      activeRoomId: null,
      rooms: [],
      activeRoom: null,
      totalUnreadCount: 0,
      soundEnabled: true,
      showOnlineStatus: true,
      showReadReceipts: true,
      userPrivacySetting: 'everyone' as const,
      roomSubscriptions: {},
      typingUsersByRoom: {},
      assistantThinkingByRoom: {},
      isLoadingMoreByRoom: {},
      hasMoreMessagesByRoom: {},
      openChat: () => {},
      closeChat: () => {},
      toggleExpand: () => {},
      setActiveRoomId: () => {},
      createRoom: async (): Promise<{ roomId: string | null; error?: string }> => ({ roomId: null }),
      sendMessage: async () => {},
      sendTyping: () => {},
      toggleRoomSubscription: async () => {},
      loadMoreMessages: async () => {},
      updateUserPrivacySetting: async () => {},
      searchEligibleUsers: async () => [],
      addParticipantToRoom: async () => {},
      removeParticipantFromRoom: async () => {},
      addMemberToRoom: async (): Promise<{ success: boolean; error?: string }> => ({ success: false }),
      removeMemberFromRoom: async (): Promise<{ success: boolean; error?: string }> => ({ success: false }),
      refreshRooms: async () => {},
      setSoundEnabled: () => {},
      setShowOnlineStatus: () => {},
      setShowReadReceipts: () => {},
    };
  }
  return context;
}
