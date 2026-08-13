'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUserFromCookies } from '@/lib/auth-server';

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
  openChat: (roomId?: string) => void;
  closeChat: () => void;
  toggleExpand: () => void;
  setActiveRoomId: (roomId: string) => void;
  createRoom: (params: {
    name: string;
    type: 'direct' | 'group' | 'ai' | 'global';
    participantIds?: string[];
    language?: string;
  }) => Promise<string | null>;
  sendMessage: (roomId: string, content: string) => Promise<void>;
  updateUserPrivacySetting: (setting: 'everyone' | 'subscribers_only' | 'nobody') => Promise<void>;
  userPrivacySetting: 'everyone' | 'subscribers_only' | 'nobody';
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string | null>('ai-assistant');
  const [userPrivacySetting, setUserPrivacySetting] = useState<'everyone' | 'subscribers_only' | 'nobody'>('everyone');

  // Initial Demo / Active Chat Rooms State
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
    participantIds?: string[];
    language?: string;
  }): Promise<string | null> => {
    const newId = `room-${Date.now()}`;
    const newRoom: ChatRoom = {
      id: newId,
      slug: newId,
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
    return newId;
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
        } catch (err) {
          console.error('Error generating AI response:', err);
        }
      }, 1000);
    }
  };

  const updateUserPrivacySetting = async (setting: 'everyone' | 'subscribers_only' | 'nobody') => {
    setUserPrivacySetting(setting);
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
        openChat,
        closeChat,
        toggleExpand,
        setActiveRoomId,
        createRoom,
        sendMessage,
        updateUserPrivacySetting,
        userPrivacySetting,
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
