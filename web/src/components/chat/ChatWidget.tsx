'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  MessageCircle, X, Maximize2, Minimize2, Settings,
  Search, Send, Sparkles, AlertCircle, Bot, ArrowLeft,
  Plus, UserPlus, CheckCheck, Users, Bell, BellOff, UserMinus, Trash2,
} from 'lucide-react';
import ChatSettingsModal from './ChatSettingsModal';
import { GroupCreateModal } from './GroupCreateModal';
import { GroupManageModal } from './GroupManageModal';
import { RoomHeader } from './RoomHeader';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useApp } from '@/context/AppContext';
import { useChat, SearchableUser } from '@/context/ChatContext';
import { useDebouncedCallback } from 'use-debounce';
import { getSocket } from '@/lib/socket';

export default function ChatWidget() {
  const { currentUser, openAuthModal, t } = useApp();
  const {
    isOpen,
    isExpanded,
    activeRoomId,
    rooms,
    activeRoom,
    totalUnreadCount,
    showOnlineStatus,
    showReadReceipts,
    openChat,
    closeChat,
    toggleExpand,
    setActiveRoomId,
    sendMessage,
    createRoom,
    searchEligibleUsers,
    addParticipantToRoom,
    removeParticipantFromRoom,
  } = useChat();

  const [inputMessage, setInputMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isGroupCreateOpen, setIsGroupCreateOpen] = useState(false);
  const [isGroupManageOpen, setIsGroupManageOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<SearchableUser[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [groupError, setGroupError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // ⚡ Bolt Optimization: Memoized room filtering
  const filteredRooms = useMemo(() => {
    const lowerQuery = (searchQuery || '').toLowerCase().trim();
    if (!rooms || !Array.isArray(rooms)) return [];
    if (!lowerQuery) return rooms;
    return rooms.filter((r) => r && (r.name || r.slug || '').toLowerCase().includes(lowerQuery));
  }, [rooms, searchQuery]);

  const debouncedSearchUsers = useDebouncedCallback(async (query: string) => {
    setIsSearchingUsers(true);
    const results = await searchEligibleUsers(query);
    setUserSearchResults(results);
    setIsSearchingUsers(false);
  }, 300);

  const handleUserSearchChange = (query: string) => {
    setUserSearchQuery(query);
    setIsSearchingUsers(true);
    debouncedSearchUsers(query);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeRoom?.messages?.length, isOpen, isExpanded, activeRoomId]);

  useEffect(() => {
    if (isNewChatOpen) {
      handleUserSearchChange(userSearchQuery || 'a');
    }
  }, [isNewChatOpen]);

  // Lock body scroll on mobile when full-screen chat is open
  useEffect(() => {
    if (isOpen && isExpanded) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isOpen, isExpanded]);

  // Guest view (Unauthenticated User)
  if (!currentUser) {
    if (!isOpen) {
      return (
        <button
          onClick={() => openChat()}
          className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-teal-400 text-white rounded-2xl shadow-2xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center border border-indigo-400/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          title={t.chat?.title || 'Omni Chat'}
          aria-label={t.chat?.title || 'Omni Chat öffnen'}
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      );
    }

    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[360px] sm:w-[400px] bg-[#080e1e] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden font-sans backdrop-blur-xl animate-fadeIn">
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-400 text-white shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Omni KI-Assistent & Chat</h3>
              <p className="text-[10px] text-teal-400 font-mono">Community & AI Hub</p>
            </div>
          </div>
          <button
            onClick={() => closeChat()}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            aria-label={t.common?.close || 'Schließen'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-5 text-center flex flex-col items-center justify-center bg-gradient-to-b from-[#080e1e] to-[#0d1528]">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-xl">
              <Sparkles className="w-8 h-8 text-teal-400 animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 p-1 bg-indigo-600 rounded-full text-white">
              <Bot className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-extrabold text-base text-white">Mit der KI & der Community chatten 🚀</h4>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              Melde dich an, um mit dem Omni KI-Assistenten zu chatten, deinen Feed in Echtzeit anzupassen und direkt in Gruppenräumen teilzunehmen.
            </p>
          </div>
          <div className="w-full space-y-2.5 pt-2">
            <button
              onClick={() => { closeChat(); openAuthModal('register'); }}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-500 hover:from-indigo-500 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <span>🔐 Jetzt Anmelden / Registrieren</span>
            </button>
            <button
              onClick={() => { closeChat(); openAuthModal('login'); }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs border border-slate-800 transition-all cursor-pointer"
            >
              Konto vorhanden? Einloggen
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSend = async (text: string) => {
    if (!text.trim() || !activeRoomId) return;
    setInputMessage('');
    setPrivacyError(null);
    await sendMessage(activeRoomId, text);
    setTimeout(scrollToBottom, 100);
  };

  const handleStartAiChat = async () => {
    setIsNewChatOpen(false);
    const res = await createRoom({
      name: t.feed?.aiAssistant || 'Omni KI-Assistent',
      type: 'ai',
    });
    if (res.error) setPrivacyError(res.error);
  };

  const handleStartDirectUserChat = async (targetUser: SearchableUser) => {
    setIsNewChatOpen(false);
    const res = await createRoom({
      name: targetUser.username,
      type: 'direct',
      recipientId: targetUser.id,
      participantIds: [targetUser.id],
    });
    if (res.error) setPrivacyError(res.error);
  };

  const handleCreateGroup = async (name: string) => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    setGroupError(null);
    try {
      // 1. Create group room via ChatContext
      const res = await createRoom({
        name,
        type: 'group',
      });
      if (res.error) {
        setGroupError(res.error);
        return;
      }

      // 2. Notify Socket.IO server if connected
      const socket = getSocket();
      if (socket) {
        socket.emit('chat:create_group', { name, userId: currentUser.id });
      }

      // 3. Close group create and new chat modals
      setIsGroupCreateOpen(false);
      setIsNewChatOpen(false);
    } catch (err: any) {
      setGroupError(err.message || 'Failed to create group');
    }
  };

  // 1. Floating Support Button (Collapsed Launcher)
  if (!isOpen) {
    return (
      <button
        onClick={() => openChat()}
        className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-teal-400 text-white rounded-2xl shadow-2xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center border border-indigo-400/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        title={t.chat?.title || 'Omni Chat'}
        aria-label={t.chat?.title || 'Omni Chat öffnen'}
      >
        <MessageCircle className="w-6 h-6" />
        {totalUnreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white border-2 border-[#080e1e]">
            {totalUnreadCount}
          </span>
        )}
      </button>
    );
  }

  // 2. Main Chat View (Full-Screen or Compact Floating Window) + Portals
  return (
    <>
      {isExpanded ? (
        <div className="fixed inset-0 h-full h-[100dvh] max-h-[100dvh] w-full z-50 bg-[#080e1e] text-[#dae2fd] flex flex-col md:flex-row font-sans overflow-hidden">
          {/* Left Column - Rooms Sidebar */}
          <div className={`w-full md:w-80 lg:w-96 flex flex-col min-h-0 h-full overflow-hidden border-r border-slate-800 bg-slate-900/60 ${activeRoomId ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between shrink-0">
              <h2 className="font-bold text-lg text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-indigo-400" />
                {t.chat?.title || 'Omni Chat'}
              </h2>
              <div className="flex items-center gap-1">
                <button onClick={() => setIsNewChatOpen(true)} className="p-2 hover:bg-slate-800 text-indigo-400 hover:text-white rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" title={t.chat?.newChatTitle || 'Neuen Chat erstellen'} aria-label={t.chat?.newChatTitle || 'Neuen Chat erstellen'}>
                  <Plus className="w-5 h-5" />
                </button>
                <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" title={t.chat?.settingsTitle || 'Privatsphäre & Einstellungen'} aria-label={t.chat?.settingsTitle || 'Privatsphäre & Einstellungen'}>
                  <Settings className="w-5 h-5" />
                </button>
                <button onClick={toggleExpand} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" title="Fenster verkleinern" aria-label="Fenster verkleinern">
                  <Minimize2 className="w-5 h-5" />
                </button>
                <button onClick={closeChat} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" title={t.common?.close || 'Schließen'} aria-label={t.common?.close || 'Schließen'}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-3 border-b border-slate-800 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.chat?.searchPlaceholder || 'Räume & Kontakte suchen...'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-slate-800/40">
              {filteredRooms.length === 0 ? (
                <div className="p-6 text-center space-y-4">
                  <Sparkles className="w-10 h-10 mx-auto text-indigo-400 opacity-40 animate-pulse" />
                  <div>
                    <h4 className="font-bold text-sm text-white mb-1">{t.chat?.noConversations || 'Keine Konversationen'}</h4>
                    <p className="text-xs text-slate-400">{t.chat?.noConversationsSub || 'Starte jetzt einen neuen Chat mit der KI oder einem Nutzer.'}</p>
                  </div>
                  <div className="space-y-2 pt-2">
                    <button onClick={handleStartAiChat} className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20">
                      <Bot className="w-4 h-4" />
                      <span>{t.chat?.startAiChat || 'KI-Assistenten starten'}</span>
                    </button>
                    <button onClick={() => setIsNewChatOpen(true)} className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700">
                      <UserPlus className="w-4 h-4 text-teal-400" />
                      <span>{t.chat?.startDirectUserChat || 'Nutzer anschreiben'}</span>
                    </button>
                    <button onClick={() => setIsGroupCreateOpen(true)} className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700">
                      <Users className="w-4 h-4 text-indigo-400" />
                      <span>{t.chat?.createGroup || 'Gruppe erstellen'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                filteredRooms.map((room) => {
                  const isActive = activeRoomId === room.id || activeRoomId === room.slug;
                  return (
                    <div
                      key={room.id}
                      onClick={() => setActiveRoomId(room.id)}
                      className={`flex items-center gap-3 p-3.5 cursor-pointer transition-all ${
                        isActive ? 'bg-indigo-600/15 border-l-4 border-indigo-500' : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="relative">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-teal-400 flex items-center justify-center font-bold text-white shadow-md">
                          {room.type === 'ai' ? <Bot className="w-5 h-5" /> : room.name.charAt(0)}
                        </div>
                        {showOnlineStatus && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#080e1e] rounded-full" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <h3 className="font-semibold text-sm text-white truncate">{room.name}</h3>
                          <span className="text-[11px] font-mono text-slate-500">
                            {room.messages.length > 0
                              ? new Date(room.messages[room.messages.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : ''}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-xs text-slate-400 truncate">
                            {room.messages.length > 0 ? room.messages[room.messages.length - 1].content : '...'}
                          </p>
                          {(room.unreadCount || 0) > 0 && (
                            <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-2">
                              {room.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column - Active Main Chat Conversation */}
          <div className={`flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-[#080e1e] ${!activeRoomId ? 'hidden md:flex' : 'flex'}`}>
            {activeRoom ? (
              <>
                <RoomHeader
                  roomName={activeRoom.name}
                  roomType={activeRoom.type}
                  isAiEnabled={activeRoom.isAiEnabled}
                  showOnlineStatus={showOnlineStatus}
                  privacyError={privacyError}
                  onToggleExpand={toggleExpand}
                  onClose={closeChat}
                  onRemoveAi={() => removeParticipantFromRoom(activeRoom.id, 'ai')}
                  onInviteAi={() => addParticipantToRoom(activeRoom.id, { name: 'Omni KI-Assistent', type: 'ai' })}
                  t={t}
                />
                <MessageList
                  messages={activeRoom.messages}
                  currentUserId={currentUser?.id ? String(currentUser.id) : null}
                  showReadReceipts={showReadReceipts}
                  messagesEndRef={messagesEndRef}
                />
                <ChatInput onSend={handleSend} t={t} />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                <p>{t.chat?.noConversations || 'Keine Konversationen'}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Compact Floating Window (Telegram Style) */
        <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[360px] sm:w-[420px] h-[580px] sm:h-[620px] max-h-[85vh] bg-[#080e1e] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden font-sans backdrop-blur-xl animate-fadeIn">
          {/* Header */}
          <div className="p-3 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-400 text-white shadow-md">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-xs sm:text-sm text-white">{t.chat?.title || 'Omni Chat'}</h3>
                <p className="text-[9px] text-teal-400 font-mono">Community & AI Hub</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsNewChatOpen(true)} className="p-1.5 hover:bg-slate-800 text-indigo-400 hover:text-white rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" title={t.chat?.newChatTitle || 'Neuen Chat erstellen'} aria-label={t.chat?.newChatTitle || 'Neuen Chat erstellen'}>
                <Plus className="w-4 h-4" />
              </button>
              <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" title={t.chat?.settingsTitle || 'Privatsphäre & Einstellungen'} aria-label={t.chat?.settingsTitle || 'Privatsphäre & Einstellungen'}>
                <Settings className="w-4 h-4" />
              </button>
              <button onClick={toggleExpand} className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" title="Maximieren" aria-label="Maximieren">
                <Maximize2 className="w-4 h-4" />
              </button>
              <button onClick={closeChat} className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" title={t.common?.close || 'Schließen'} aria-label={t.common?.close || 'Schließen'}>
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Room List or Active Chat */}
          {!activeRoomId ? (
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
              {filteredRooms.length === 0 ? (
                <div className="p-6 text-center space-y-4">
                  <Sparkles className="w-10 h-10 mx-auto text-indigo-400 opacity-40 animate-pulse" />
                  <div>
                    <h4 className="font-bold text-sm text-white mb-1">{t.chat?.noConversations || 'Keine Konversationen'}</h4>
                    <p className="text-xs text-slate-400">{t.chat?.noConversationsSub || 'Starte jetzt einen neuen Chat mit der KI oder einem Nutzer.'}</p>
                  </div>
                  <div className="space-y-2 pt-2">
                    <button onClick={handleStartAiChat} className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20">
                      <Bot className="w-4 h-4" />
                      <span>{t.chat?.startAiChat || 'KI-Assistenten starten'}</span>
                    </button>
                    <button onClick={() => setIsNewChatOpen(true)} className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700">
                      <UserPlus className="w-4 h-4 text-teal-400" />
                      <span>{t.chat?.startDirectUserChat || 'Nutzer anschreiben'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                filteredRooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => setActiveRoomId(room.id)}
                    className="flex items-center gap-3 p-3.5 cursor-pointer hover:bg-slate-800/50 transition-all"
                  >
                    <div className="relative">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-teal-400 flex items-center justify-center font-bold text-white shadow-md">
                        {room.type === 'ai' ? <Bot className="w-5 h-5" /> : room.name.charAt(0)}
                      </div>
                      {showOnlineStatus && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#080e1e] rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-semibold text-sm text-white truncate">{room.name}</h3>
                        <span className="text-[11px] font-mono text-slate-500">
                          {room.messages.length > 0
                            ? new Date(room.messages[room.messages.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ''}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-slate-400 truncate">
                          {room.messages.length > 0 ? room.messages[room.messages.length - 1].content : '...'}
                        </p>
                        {(room.unreadCount || 0) > 0 && (
                          <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-2">
                            {room.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <RoomHeader
                roomName={activeRoom?.name || 'Chat'}
                roomType={activeRoom?.type || 'direct'}
                isAiEnabled={activeRoom?.isAiEnabled}
                showOnlineStatus={showOnlineStatus}
                privacyError={privacyError}
                onClose={() => setActiveRoomId(null)}
                onRemoveAi={() => activeRoom && removeParticipantFromRoom(activeRoom.id, 'ai')}
                onInviteAi={() => activeRoom && addParticipantToRoom(activeRoom.id, { name: 'Omni KI-Assistent', type: 'ai' })}
                onManageGroup={() => setIsGroupManageOpen(true)}
                t={t}
              />
              {activeRoom && (
                <MessageList
                  messages={activeRoom.messages}
                  currentUserId={currentUser?.id ? String(currentUser.id) : null}
                  showReadReceipts={showReadReceipts}
                  messagesEndRef={messagesEndRef}
                />
              )}
              <ChatInput onSend={handleSend} t={t} />
            </div>
          )}
        </div>
      )}

      {/* Global Modals & Portals (rendered above both views with z-[99999]) */}
      {isSettingsOpen && (
        <ChatSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {isNewChatOpen && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setIsNewChatOpen(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-white">{t.chat?.newChatTitle || 'Neuen Chat erstellen'}</h3>
              <button onClick={() => setIsNewChatOpen(false)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" aria-label={t.common?.close || 'Schließen'}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={handleStartAiChat}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Bot className="w-5 h-5" />
              <span>{t.chat?.startAiChat || 'KI-Assistenten starten'}</span>
            </button>
            <button
              onClick={() => { setIsNewChatOpen(false); setIsGroupCreateOpen(true); }}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
            >
              <Users className="w-5 h-5 text-indigo-400" />
              <span>{t.chat?.createGroup || 'Gruppe erstellen'}</span>
            </button>
            <div className="text-xs text-slate-400 text-center">Nach Nutzern suchen:</div>
            <input
              type="text"
              value={userSearchQuery}
              onChange={(e) => handleUserSearchChange(e.target.value)}
              placeholder={t.chat?.searchPlaceholder || 'Name eingeben...'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            {isSearchingUsers && <div className="text-xs text-slate-500 text-center">Suche...</div>}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {userSearchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleStartDirectUserChat(user)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-slate-800 rounded-xl transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                    {user.username.charAt(0)}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-white">{user.username}</div>
                    <div className="text-xs text-slate-400">{user.handle}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {groupError && (
        <div className="fixed bottom-24 right-6 z-[99999] p-3 bg-rose-500/90 text-white font-medium rounded-xl text-xs flex items-center gap-2 shadow-2xl backdrop-blur-md border border-rose-400/40">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{groupError}</span>
        </div>
      )}

      <GroupCreateModal
        isOpen={isGroupCreateOpen}
        onClose={() => setIsGroupCreateOpen(false)}
        onCreate={handleCreateGroup}
        onNavigateToGroup={(groupId) => {
          setIsGroupCreateOpen(false);
          setActiveRoomId(groupId);
        }}
        t={t}
      />

      {activeRoom && isGroupManageOpen && (
        <GroupManageModal
          isOpen={isGroupManageOpen}
          onClose={() => setIsGroupManageOpen(false)}
          room={activeRoom}
        />
      )}
    </>
  );
}
