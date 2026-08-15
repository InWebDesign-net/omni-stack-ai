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
              prev.map((r) => {
                if (r.id === activeRoomId || r.slug === activeRoomId) {
                  return { ...r, messages: serverMsgs };
                }
                return r;
              })
            );
          }

          setRooms((prev) => {
            const map = new Map<string, ChatRoom>();
            for (const item of loadedRooms) map.set(item.id, item);
            for (const item of prev) {
              const existing = map.get(item.id);
              if (existing) {
                map.set(item.id, {
                  ...existing,
                  messages: item.messages.length > 0 ? item.messages : existing.messages,
                  participants: item.participants && item.participants.length > 0 ? item.participants : existing.participants,
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

      return () => {
        active = false;
        socket.off('chat:message_received', handleIncomingMessage);
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
    const sysMsg: ChatMessage = {
      id: `sys-${Date.now()}`,
      senderType: 'system',
      content: `${userOrAi.name} (${userOrAi.type === 'ai' ? 'KI-Agent' : 'Nutzer'}) wurde zum Chat hinzugefügt.`,
      timestamp: new Date().toISOString(),
    };

    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === roomId || r.slug === roomId) {
          return {
            ...r,
            isAiEnabled: userOrAi.type === 'ai' ? true : r.isAiEnabled,
            messages: [...r.messages, sysMsg],
          };
        }
        return r;
      })
    );
  };

  const removeParticipantFromRoom = async (roomId: string, participantId: string) => {
    const sysMsg: ChatMessage = {
      id: `sys-${Date.now()}`,
      senderType: 'system',
      content: `Teilnehmer wurde aus dem Chat entfernt.`,
      timestamp: new Date().toISOString(),
    };

    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === roomId || r.slug === roomId) {
          return {
            ...r,
            messages: [...r.messages, sysMsg],
          };
        }
        return r;
      })
    );
  };

  const sendMessage = async (roomId: string, content: string) => {
    if (!content.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderType: 'user',
      senderName: 'Du',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === roomId || r.slug === roomId) {
          return {
            ...r,
            lastMessageAt: userMsg.timestamp,
            messages: [...r.messages, userMsg],
          };
        }
        return r;
      })
    );

    if (soundEnabled) {
      playMessageChime();
    }

    const targetRoom = rooms.find((r) => r.id === roomId || r.slug === roomId);
    const recipient = targetRoom?.participants?.find((p) => p.username !== 'Nutzer');

    // Broadcast message instantly via WebSocket Gateway
    const socket = getSocket();
    if (socket) {
      socket.emit('chat:send_message', {
        roomId,
        content: content.trim(),
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
          content: content.trim(),
        }),
      });
    } catch (e) {
      console.error('Failed to persist user message:', e);
    }

    // Trigger AI response if room is AI enabled
    if (targetRoom && (targetRoom.type === 'ai' || targetRoom.isAiEnabled)) {
      setTimeout(async () => {
        try {
          const res = await fetch('/api/ai-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: content, history: targetRoom.messages }),
          });

          let replyText = 'Hallo! Wie kann ich dir heute mit Omni und InWebDesign.net weiterhelfen?';
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

          setRooms((prev) =>
            prev.map((r) => {
              if (r.id === roomId || r.slug === roomId) {
                return {
                  ...r,
                  lastMessageAt: aiMsg.timestamp,
                  messages: [...r.messages, aiMsg],
                };
              }
              return r;
            })
          );

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
