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
  participants?: Array<{
    id: string;
    username: string;
    avatarUrl?: string;
    allowDirectMessages?: 'everyone' | 'subscribers_only' | 'nobody';
  }>;
  messages: ChatMessage[];
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
  setActiveRoomId: (roomId: string) => void;
  createRoom: (params: {
    name: string;
    type: 'direct' | 'group' | 'ai' | 'global';
    recipientId?: string;
    participantIds?: string[];
    language?: string;
  }) => Promise<{ roomId: string | null; error?: string }>;
  sendMessage: (roomId: string, content: string) => Promise<void>;
  updateUserPrivacySetting: (setting: 'everyone' | 'subscribers_only' | 'nobody') => Promise<void>;
  setSoundEnabled: (enabled: boolean) => void;
  setShowOnlineStatus: (enabled: boolean) => void;
  setShowReadReceipts: (enabled: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Web Audio API Sound Chime (0 asset dependencies)
function playMessageChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5 note

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
  const [activeRoomId, setActiveRoomId] = useState<string | null>('ai-assistant');
  const [userPrivacySetting, setUserPrivacySetting] = useState<'everyone' | 'subscribers_only' | 'nobody'>('everyone');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showReadReceipts, setShowReadReceipts] = useState(true);

  // Initial Rooms List (Merged with server data)
  const [rooms, setRooms] = useState<ChatRoom[]>([
    {
      id: 'ai-assistant',
      slug: 'ai-assistant',
      name: 'Omni KI-Assistent',
      type: 'ai',
      language: 'de',
      isAiEnabled: true,
      unreadCount: 0,
      messages: [
        {
          id: 'm1',
          senderType: 'ai',
          senderName: 'Omni AI',
          content: 'Hallo! Ich bin dein Omni KI-Assistent. Wie kann ich dir heute mit Videos, Dokumenten oder Navigation helfen?',
          timestamp: new Date().toISOString(),
        },
      ],
    },
    {
      id: 'global-lounge',
      slug: 'global-lounge',
      name: 'Allgemeiner Tech-Lounge',
      type: 'global',
      language: 'de',
      unreadCount: 1,
      messages: [
        {
          id: 'm2',
          senderType: 'user',
          senderName: 'Database Guru',
          content: 'Willkommen in der Omni Lounge! Habt ihr schon die neuen Vektor-Personalisierten Videos gesehen?',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
    },
  ]);

  // Load real rooms and active room messages from backend
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
            for (const item of prev) map.set(item.id, item);
            for (const item of loadedRooms) {
              if (!map.has(item.id)) map.set(item.id, item);
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

  const activeRoom = rooms.find((r) => r.id === activeRoomId || r.slug === activeRoomId) || rooms[0] || null;

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

  const createRoom = async (params: {
    name: string;
    type: 'direct' | 'group' | 'ai' | 'global';
    recipientId?: string;
    participantIds?: string[];
    language?: string;
  }): Promise<{ roomId: string | null; error?: string }> => {
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
        return { roomId: null, error: data.error || 'Chatraum konnte nicht erstellt werden.' };
      }

      const newRoomData = data.room;
      const newId = newRoomData?.slug || `room-${Date.now()}`;
      const newRoom: ChatRoom = {
        id: newId,
        slug: newId,
        documentId: newRoomData?.documentId,
        name: params.name,
        type: params.type,
        language: params.language || 'de',
        isAiEnabled: params.type === 'ai',
        unreadCount: 0,
        messages: [],
      };

      setRooms((prev) => [newRoom, ...prev]);
      setActiveRoomId(newId);
      setIsOpen(true);
      return { roomId: newId };
    } catch (err: any) {
      return { roomId: null, error: err?.message || 'Netzwerkfehler' };
    }
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

    // Play chime sound if enabled
    if (soundEnabled) {
      playMessageChime();
    }

    // Persist user message to Strapi
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

    // AI Chat Handler: Trigger automated LLM response for 'ai' type rooms
    const targetRoom = rooms.find((r) => r.id === roomId || r.slug === roomId);
    if (targetRoom && targetRoom.type === 'ai') {
      setTimeout(async () => {
        try {
          const res = await fetch('/api/ai-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: content, history: targetRoom.messages }),
          });

          let replyText = 'Ich habe deine Anfrage analysiert und den Inhalt im Feed für dich aktualisiert!';
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
