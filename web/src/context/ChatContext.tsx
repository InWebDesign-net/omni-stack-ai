'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { jsonAuthHeaders } from '@/lib/affinity';
import { getSocket } from '@/lib/socket';

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
  updateUserPrivacySetting: (setting: 'everyone' | 'subscribers_only' | 'nobody') => Promise<void>;
  searchEligibleUsers: (query: string) => Promise<SearchableUser[]>;
  addParticipantToRoom: (roomId: string, userOrAi: { name: string; type: 'user' | 'ai' }) => Promise<void>;
  removeParticipantFromRoom: (roomId: string, participantId: string) => Promise<void>;
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
  } catch (e) {}
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [userPrivacySetting, setUserPrivacySetting] = useState<'everyone' | 'subscribers_only' | 'nobody'>('everyone');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showReadReceipts, setShowReadReceipts] = useState(true);

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

  // Load real rooms from Strapi and listen for real-time WebSocket events
  useEffect(() => {
    let active = true;

    const fetchRooms = async () => {
      try {
        const res = await fetch(`/api/chat?roomId=${encodeURIComponent(activeRoomId || '')}`, {
          headers: jsonAuthHeaders(),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;

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

          if (activeRoomId && Array.isArray(data.messages)) {
            const serverMsgs: ChatMessage[] = data.messages.map((m: any) => ({
              id: m.documentId || String(m.id),
              senderId: m.sender?.id ? String(m.sender.id) : (m.senderId ? String(m.senderId) : undefined),
              senderType: m.senderType || 'user',
              senderName: m.senderType === 'ai' ? 'Omni AI' : (m.sender?.username || 'Nutzer'),
              content: m.content || '',
              timestamp: m.createdAt || new Date().toISOString(),
              meta: m.meta,
            }));

            setRooms((prev) =>
              (prev || []).map((r) => {
                if (r && (r.id === activeRoomId || r.slug === activeRoomId)) {
                  return { ...r, messages: serverMsgs };
                }
                return r;
              })
            );
          }

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
    };

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

      socket.on('chat:message_received', handleIncomingMessage);
      
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
        socket.off('chat:group_created');
      };
    }

    return () => {
      active = false;
    };
  }, [activeRoomId, soundEnabled]);

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
        return { roomId: realSlug };
      }
    } catch (err: any) {
      console.error('Failed to persist room to backend:', err);
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
    } catch (e) {}

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
    } catch (e) {}

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

  const sendMessage = async (roomId: string, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

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

    // Trigger AI response if room is AI enabled
    if (targetRoom && (targetRoom.type === 'ai' || targetRoom.isAiEnabled)) {
      // Avoid concurrent AI replies for the same room
      let alreadyAiPending = false;
      setAiPendingRoomIds((prev) => {
        if (prev.has(roomId)) {
          alreadyAiPending = true;
          return prev;
        }
        return new Set(prev).add(roomId);
      });
      if (alreadyAiPending) return;

      setTimeout(async () => {
        try {
          // Read the latest messages from state to include the just-sent user message
          const latestRoom = rooms.find((r) => r.id === roomId || r.slug === roomId);
          const historySnapshot = latestRoom?.messages ?? targetRoom.messages;

          const res = await fetch('/api/ai-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: trimmed, history: historySnapshot, locale: targetRoom.language || 'de' }),
          });

          let replyText = targetRoom.language?.startsWith('en')
            ? 'Hello! How can I help you today with Omni and InWebDesign.net?'
            : 'Hallo! Wie kann ich dir heute mit Omni und InWebDesign.net weiterhelfen?';
          let vectorSummary: string | undefined = undefined;

          if (res.ok) {
            const data = await res.json();
            const text = data.aiExplanation || data.response || data.explanation || data.reply || data.answer;
            if (text) {
              replyText = text.replace(/^🤖\s*Ollama\s*\([^)]*\):\s*/i, '');
            }
            if (data.vectorSummary) {
              vectorSummary = data.vectorSummary;
            }
          }

          const aiMsg: ChatMessage = {
            id: `msg-ai-${Date.now()}`,
            senderType: 'ai',
            senderName: 'Omni AI',
            content: replyText,
            timestamp: new Date().toISOString(),
            meta: vectorSummary ? { vectorSummary } : undefined,
          };

          withRoomUpdate(roomId, (r) => {
            const exists = r.messages.some(
              (m) =>
                m.id === aiMsg.id ||
                (m.senderType === 'ai' && m.content === aiMsg.content && Math.abs(new Date(m.timestamp).getTime() - new Date(aiMsg.timestamp).getTime()) < 3000)
            );
            if (exists) return r;
            return {
              ...r,
              lastMessageAt: aiMsg.timestamp,
              messages: [...r.messages, aiMsg],
            };
          });

          if (soundEnabled) {
            playMessageChime();
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
                senderType: 'ai',
                content: replyText,
              }),
            });
          } catch (e) {
            console.error('Failed to persist AI message:', e);
          }
        } catch (err) {
          console.error('Error generating AI response:', err);
        } finally {
          setAiPendingRoomIds((prev) => {
            const next = new Set(prev);
            next.delete(roomId);
            return next;
          });
        }
      }, 800);
    }
  };

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
        openChat,
        closeChat,
        toggleExpand,
        setActiveRoomId,
        createRoom,
        sendMessage,
        updateUserPrivacySetting,
        searchEligibleUsers,
        addParticipantToRoom,
        removeParticipantFromRoom,
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
      openChat: () => {},
      closeChat: () => {},
      toggleExpand: () => {},
      setActiveRoomId: () => {},
      createRoom: async (): Promise<{ roomId: string | null; error?: string }> => ({ roomId: null }),
      sendMessage: async () => {},
      updateUserPrivacySetting: async () => {},
      searchEligibleUsers: async () => [],
      addParticipantToRoom: async () => {},
      removeParticipantFromRoom: async () => {},
      setSoundEnabled: () => {},
      setShowOnlineStatus: () => {},
      setShowReadReceipts: () => {},
    };
  }
  return context;
}
