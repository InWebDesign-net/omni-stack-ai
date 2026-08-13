'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { jsonAuthHeaders } from '@/lib/affinity';

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

  // Load real rooms from Strapi
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
            messages: [],
          }));

          setRooms((prev) => {
            const map = new Map<string, ChatRoom>();
            // Add server rooms first
            for (const item of loadedRooms) map.set(item.id, item);
            // Preserve local rooms and their message histories
            for (const item of prev) {
              const existing = map.get(item.id);
              if (existing) {
                map.set(item.id, {
                  ...existing,
                  messages: item.messages.length > 0 ? item.messages : existing.messages,
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
    return () => {
      active = false;
    };
  }, [activeRoomId]);

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
    if (!query.trim()) return [];
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
    // Instant local room creation so UI responds instantly!
    const localId = `room-${Date.now()}`;
    const localRoom: ChatRoom = {
      id: localId,
      slug: localId,
      name: params.name,
      type: params.type,
      language: params.language || 'de',
      isAiEnabled: params.type === 'ai',
      unreadCount: 0,
      messages: params.type === 'ai' ? [
        {
          id: `msg-ai-welcome`,
          senderType: 'ai',
          senderName: 'Omni AI',
          content: 'Hallo! Ich bin dein Omni KI-Assistent. Wie kann ich dir heute mit Videos, Dokumenten oder Navigation helfen?',
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
          content: content.trim(),
        }),
      });
    } catch (e) {
      console.error('Failed to persist message:', e);
    }

    // Trigger AI response if room is AI enabled
    const targetRoom = rooms.find((r) => r.id === roomId || r.slug === roomId);
    if (targetRoom && (targetRoom.type === 'ai' || targetRoom.isAiEnabled)) {
      setTimeout(async () => {
        try {
          const res = await fetch('/api/ai-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: content, history: targetRoom.messages }),
          });

          let replyText = 'Ich habe deine Nachricht im Chat verarbeitet!';
          if (res.ok) {
            const data = await res.json();
            if (data.explanation || data.reply) {
              replyText = data.explanation || data.reply;
            }
          }

          const aiMsg: ChatMessage = {
            id: `msg-ai-${Date.now()}`,
            senderType: 'ai',
            senderName: 'Omni AI',
            content: replyText,
            timestamp: new Date().toISOString(),
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
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
