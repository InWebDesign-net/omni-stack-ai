'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MessageCircle, X, Maximize2, Minimize2, Settings, 
  Search, Send, Sparkles, AlertCircle, Bot, ArrowLeft,
  Plus, UserPlus, CheckCheck
} from 'lucide-react';
import ChatSettingsModal from './ChatSettingsModal';
import { useApp } from '@/context/AppContext';
import { useChat, SearchableUser } from '@/context/ChatContext';
import { useDebouncedCallback } from 'use-debounce';

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
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<SearchableUser[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [privacyError, setPrivacyError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // ⚡ Bolt Optimization: Memoized room filtering (Must be called at top level before early returns to satisfy Rules of Hooks)
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

  // Guest view (Unauthenticated User)
  if (!currentUser) {
    if (!isOpen) {
      return (
        <button
          onClick={() => openChat()}
          className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-teal-400 text-white rounded-2xl shadow-2xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center border border-indigo-400/30"
          title={t.chat?.title || 'Omni Chat'}
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      );
    }

    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[360px] sm:w-[400px] bg-[#080e1e] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden font-sans backdrop-blur-xl animate-fadeIn">
        {/* Header */}
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
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Guest Body */}
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
            <h4 className="font-extrabold text-base text-white">
              Mit der KI & der Community chatten 🚀
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              Melde dich an, um mit dem Omni KI-Assistenten zu chatten, deinen Feed in Echtzeit anzupassen und direkt in Gruppenräumen teilzunehmen.
            </p>
          </div>

          <div className="w-full space-y-2.5 pt-2">
            <button
              onClick={() => {
                closeChat();
                openAuthModal('register');
              }}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-500 hover:from-indigo-500 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <span>🔐 Jetzt Anmelden / Registrieren</span>
            </button>

            <button
              onClick={() => {
                closeChat();
                openAuthModal('login');
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs border border-slate-800 transition-all cursor-pointer"
            >
              Konto vorhanden? Einloggen
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || !activeRoomId) return;
    const text = inputMessage;
    setInputMessage('');
    setPrivacyError(null);

    await sendMessage(activeRoomId, text);
    setTimeout(scrollToBottom, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStartAiChat = async () => {
    setIsNewChatOpen(false);
    const res = await createRoom({
      name: t.feed?.aiAssistant || 'Omni KI-Assistent',
      type: 'ai',
    });
    if (res.error) {
      setPrivacyError(res.error);
    }
  };

  const handleStartDirectUserChat = async (targetUser: SearchableUser) => {
    setIsNewChatOpen(false);
    const res = await createRoom({
      name: targetUser.username,
      type: 'direct',
      recipientId: targetUser.id,
      participantIds: [targetUser.id],
    });
    if (res.error) {
      setPrivacyError(res.error);
    }
  };

  // 1. Floating Support Button (Collapsed Launcher)
  if (!isOpen) {
    return (
      <button
        onClick={() => openChat()}
        className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-teal-400 text-white rounded-2xl shadow-2xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center border border-indigo-400/30"
        title={t.chat?.title || 'Omni Chat'}
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

  // 2. Full-Screen 2-Column View (WhatsApp / Telegram Style)
  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 bg-[#080e1e] text-[#dae2fd] flex flex-col md:flex-row font-sans">
        {/* Left Column - Rooms Sidebar */}
        <div className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-800 bg-slate-900/60 ${activeRoomId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
            <h2 className="font-bold text-lg text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-indigo-400" />
              {t.chat?.title || 'Omni Chat'}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsNewChatOpen(true)}
                className="p-2 hover:bg-slate-800 text-indigo-400 hover:text-white rounded-xl transition-all"
                title={t.chat?.newChatTitle || 'Neuen Chat erstellen'}
              >
                <Plus className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"
                title={t.chat?.settingsTitle || 'Privatsphäre & Einstellungen'}
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={toggleExpand}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"
                title="Fenster verkleinern"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
              <button
                onClick={closeChat}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"
                title={t.common?.close || 'Schließen'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="p-3 border-b border-slate-800">
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

          {/* Room List or Empty State */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
            {filteredRooms.length === 0 ? (
              <div className="p-6 text-center space-y-4">
                <Sparkles className="w-10 h-10 mx-auto text-indigo-400 opacity-40 animate-pulse" />
                <div>
                  <h4 className="font-bold text-sm text-white mb-1">{t.chat?.noConversations || 'Keine Konversationen'}</h4>
                  <p className="text-xs text-slate-400">{t.chat?.noConversationsSub || 'Starte jetzt einen neuen Chat mit der KI oder einem Nutzer.'}</p>
                </div>
                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleStartAiChat}
                    className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    <Bot className="w-4 h-4" />
                    <span>{t.chat?.startAiChat || 'KI-Assistenten starten'}</span>
                  </button>
                  <button
                    onClick={() => setIsNewChatOpen(true)}
                    className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700"
                  >
                    <UserPlus className="w-4 h-4 text-teal-400" />
                    <span>{t.chat?.startDirectUserChat || 'Nutzer anschreiben'}</span>
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
        <div className={`flex-1 flex flex-col bg-[#080e1e] ${!activeRoomId ? 'hidden md:flex' : 'flex'}`}>
          {activeRoom ? (
            <>
              {/* Chat Room Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveRoomId(null)} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white rounded-xl">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="relative">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-teal-400 flex items-center justify-center font-bold text-white shadow-md">
                      {activeRoom.type === 'ai' ? <Bot className="w-5 h-5" /> : activeRoom.name.charAt(0)}
                    </div>
                    {showOnlineStatus && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#080e1e] rounded-full" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      {activeRoom.name}
                      {activeRoom.type === 'ai' && (
                        <span className="px-2 py-0.5 text-[10px] font-mono bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full">
                          Ollama AI
                        </span>
                      )}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {activeRoom.type === 'ai' ? (
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      Omni AI
                    </span>
                  ) : activeRoom.isAiEnabled ? (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full text-[11px] font-medium">
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      <span>Omni AI</span>
                      <button
                        onClick={() => removeParticipantFromRoom(activeRoom.id, 'ai')}
                        className="ml-1 p-0.5 hover:bg-rose-500/40 hover:text-rose-200 rounded-full transition-colors"
                        title="KI aus Chat entfernen"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addParticipantToRoom(activeRoom.id, { name: 'Omni KI-Assistent', type: 'ai' })}
                      className="px-2.5 py-1 bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 hover:text-teal-200 rounded-xl transition-all flex items-center gap-1 text-xs font-semibold"
                      title="KI in diesen Chat einladen"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                      <span className="hidden sm:inline">KI einladen</span>
                    </button>
                  )}

                  <button onClick={toggleExpand} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all" title="Maximize">
                    <Minimize2 className="w-5 h-5" />
                  </button>
                  <button onClick={closeChat} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all" title={t.common.close}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Privacy / Error notification banner */}
              {privacyError && (
                <div className="m-4 p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{privacyError}</span>
                </div>
              )}

              {/* Chat Message History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeRoom.messages.map((msg) => {
                  const currentUserId = currentUser?.id ? String(currentUser.id) : null;
                  const isMe =
                    msg.senderName === 'Du' ||
                    (Boolean(currentUserId) && Boolean(msg.senderId) && String(msg.senderId) === currentUserId);
                  const isSystem = msg.senderType === 'system';

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center my-2">
                        <span className="px-3 py-1 bg-slate-900 border border-slate-800 text-slate-400 rounded-full text-[11px] font-mono">
                          {msg.content}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-md ${
                        isMe 
                          ? 'bg-indigo-600 text-white rounded-br-none' 
                          : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                      }`}>
                        {!isMe && <div className="text-[11px] font-bold text-indigo-400 mb-1">{msg.senderName}</div>}
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        {msg.meta?.vectorSummary && (
                          <div className="mt-2 pt-2 border-t border-indigo-500/20 text-[11px] font-mono text-indigo-300 flex items-center gap-1.5 bg-indigo-950/40 px-2.5 py-1.5 rounded-xl border border-indigo-500/20">
                            <Sparkles className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                            <span>{msg.meta.vectorSummary}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-end gap-1.5 mt-1.5">
                          <span className={`text-[10px] font-mono ${isMe ? 'text-indigo-200' : 'text-slate-500'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && showReadReceipts && (
                            <CheckCheck className="w-3.5 h-3.5 text-indigo-200" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Field */}
              <form onSubmit={handleSend} className="p-4 bg-slate-900/60 border-t border-slate-800">
                <div className="flex items-end gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-2 focus-within:border-indigo-500 transition-colors">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    aria-label={t.chat?.writeMessagePlaceholder || 'Nachricht schreiben'}
                    placeholder={t.chat?.writeMessagePlaceholder || 'Nachricht schreiben...'}
                    className="flex-1 max-h-32 min-h-[40px] bg-transparent resize-none outline-none focus:outline-none focus:ring-0 ring-0 border-none shadow-none py-2 px-3 text-sm text-slate-100"
                    rows={1}
                  />
                  <button
                    type="submit"
                    aria-label="Nachricht senden"
                    title="Nachricht senden"
                    className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-md flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
              <Sparkles className="w-12 h-12 mb-3 opacity-30 text-indigo-400 animate-pulse" />
              <h3 className="font-bold text-base text-white mb-1">{t.chat?.noConversations || 'Kein Chat gewählt'}</h3>
              <p className="text-xs text-slate-400 max-w-sm">{t.chat?.noConversationsSub || 'Wähle einen Raum aus oder starte einen neuen Chat.'}</p>
            </div>
          )}
        </div>
        <ChatSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        {renderNewChatModal()}
      </div>
    );
  }

  // 3. Compact Support Overlay Card Modal (400x580px)
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[400px] h-[580px] bg-[#080e1e] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden font-sans backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-900/80">
        {activeRoom ? (
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveRoomId(null)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white" title="Zurück">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-sm text-white truncate max-w-[130px]">
              {activeRoom.name}
            </h3>
            {activeRoom.type === 'ai' ? (
              <span className="px-2 py-0.5 text-[10px] font-mono bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                Omni AI
              </span>
            ) : activeRoom.isAiEnabled ? (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full text-[10px] font-medium">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Omni AI</span>
                <button
                  onClick={() => removeParticipantFromRoom(activeRoom.id, 'ai')}
                  className="ml-0.5 p-0.5 hover:bg-rose-500/40 hover:text-rose-200 rounded-full transition-colors"
                  title="KI aus Chat entfernen"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => addParticipantToRoom(activeRoom.id, { name: 'Omni KI-Assistent', type: 'ai' })}
                className="px-2 py-0.5 bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 hover:text-teal-200 rounded-lg transition-all flex items-center gap-1 text-[11px] font-semibold"
                title="KI in diesen Chat einladen"
              >
                <Sparkles className="w-3 h-3 text-teal-400" />
                <span>+ KI</span>
              </button>
            )}
          </div>
        ) : (
          <h2 className="font-bold text-sm text-white px-1 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-indigo-400" />
            {t.chat?.title || 'Omni Chat'}
          </h2>
        )}
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsNewChatOpen(true)}
            className="p-1.5 hover:bg-slate-800 text-indigo-400 hover:text-white rounded-xl transition-colors"
            title={t.chat?.newChatTitle || 'Neuen Chat erstellen'}
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
            title={t.chat?.settingsTitle || 'Einstellungen'}
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={toggleExpand}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
            title="Maximize"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={closeChat}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
            title={t.common.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#080e1e]">
        {activeRoom ? (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {activeRoom.messages.map((msg) => {
                const currentUserId = currentUser?.id ? String(currentUser.id) : null;
                const isMe =
                  msg.senderName === 'Du' ||
                  (Boolean(currentUserId) && Boolean(msg.senderId) && String(msg.senderId) === currentUserId);
                const isSystem = msg.senderType === 'system';

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-1.5">
                      <span className="px-2.5 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-full text-[10px] font-mono">
                        {msg.content}
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-md ${
                      isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                    }`}>
                      {!isMe && <div className="text-[10px] font-bold text-indigo-400 mb-1">{msg.senderName}</div>}
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      {msg.meta?.vectorSummary && (
                        <div className="mt-2 pt-2 border-t border-indigo-500/20 text-[11px] font-mono text-indigo-300 flex items-center gap-1.5 bg-indigo-950/40 px-2 py-1 rounded-xl border border-indigo-500/20">
                          <Sparkles className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                          <span>{msg.meta.vectorSummary}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className={`text-[9px] font-mono ${isMe ? 'text-indigo-200' : 'text-slate-500'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && showReadReceipts && (
                          <CheckCheck className="w-3 h-3 text-indigo-200" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSend} className="p-3 bg-slate-900/60 border-t border-slate-800">
              <div className="flex items-end gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1.5 focus-within:border-indigo-500 transition-colors">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  aria-label={t.chat?.writeMessagePlaceholder || 'Nachricht schreiben'}
                  placeholder={t.chat?.writeMessagePlaceholder || 'Nachricht schreiben...'}
                  className="flex-1 max-h-24 min-h-[36px] bg-transparent resize-none outline-none focus:outline-none focus:ring-0 ring-0 border-none shadow-none py-1.5 px-2 text-xs text-slate-100"
                  rows={1}
                />
                <button
                  type="submit"
                  aria-label="Nachricht senden"
                  title="Nachricht senden"
                  className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex-shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
            {rooms.length === 0 ? (
              <div className="p-6 text-center space-y-4">
                <Sparkles className="w-10 h-10 mx-auto text-indigo-400 opacity-40 animate-pulse" />
                <div>
                  <h4 className="font-bold text-sm text-white mb-1">{t.chat?.noConversations || 'Keine Konversationen'}</h4>
                  <p className="text-xs text-slate-400">{t.chat?.noConversationsSub || 'Starte jetzt einen neuen Chat mit der KI oder einem Nutzer.'}</p>
                </div>
                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleStartAiChat}
                    className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    <Bot className="w-4 h-4" />
                    <span>{t.chat?.startAiChat || 'KI-Assistenten starten'}</span>
                  </button>
                  <button
                    onClick={() => setIsNewChatOpen(true)}
                    className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700"
                  >
                    <UserPlus className="w-4 h-4 text-teal-400" />
                    <span>{t.chat?.startDirectUserChat || 'Nutzer anschreiben'}</span>
                  </button>
                </div>
              </div>
            ) : (
              rooms.map((room) => (
                <div 
                  key={room.id}
                  onClick={() => setActiveRoomId(room.id)}
                  className="flex items-center gap-3 p-3.5 cursor-pointer hover:bg-slate-800/50 transition-colors"
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-teal-400 flex items-center justify-center font-bold text-white text-sm shadow-md">
                      {room.type === 'ai' ? <Bot className="w-4 h-4" /> : room.name.charAt(0)}
                    </div>
                    {showOnlineStatus && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#080e1e] rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-semibold text-xs text-white truncate">{room.name}</h3>
                      <span className="text-[9px] font-mono text-slate-500">
                        {room.messages.length > 0
                          ? new Date(room.messages[room.messages.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-0.5">
                      <p className="text-[11px] text-slate-400 truncate">
                        {room.messages.length > 0 ? room.messages[room.messages.length - 1].content : '...'}
                      </p>
                      {(room.unreadCount || 0) > 0 && (
                        <span className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-2">
                          {room.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <ChatSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      {renderNewChatModal()}
    </div>
  );

  function renderNewChatModal() {
    if (!isNewChatOpen) return null;
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <div className="bg-[#0b0f19] border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/80">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-400" />
              {t.chat?.newChatTitle || 'Neuen Chat starten'}
            </h3>
            <button onClick={() => setIsNewChatOpen(false)} className="p-1 text-slate-400 hover:text-white rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Quick Option 1: AI Assistant */}
            <button
              onClick={handleStartAiChat}
              className="w-full p-4 bg-indigo-600/15 border border-indigo-500/30 hover:border-indigo-500 rounded-2xl text-left transition-all flex items-center gap-3.5 group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">{t.chat?.speakWithAi || 'Mit KI-Assistent sprechen'}</h4>
                <p className="text-xs text-slate-400">{t.chat?.speakWithAiSub || 'Frage den Assistenten nach Videos, Inhalten oder Navigation.'}</p>
              </div>
            </button>

            {/* Quick Option 2: Search User */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="block text-xs font-bold text-slate-300">{t.chat?.searchUserLabel || 'Nutzer suchen & anschreiben'}</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => handleUserSearchChange(e.target.value)}
                  placeholder={t.chat?.searchUserPlaceholder || 'Nutzername suchen...'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {isSearchingUsers && (
                <div className="p-3 text-center text-xs text-slate-400">...</div>
              )}

              {userSearchResults.length > 0 ? (
                <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800/40 bg-slate-950">
                  {userSearchResults.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => handleStartDirectUserChat(u)}
                      className="p-3 flex items-center justify-between hover:bg-slate-900 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-teal-400 flex items-center justify-center font-bold text-xs text-white">
                          {u.username.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-white">{u.username}</div>
                          {u.handle && <div className="text-[10px] font-mono text-indigo-400">@{u.handle}</div>}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold bg-indigo-600/20 text-indigo-300 px-2 py-1 rounded-full">
                        {t.chat?.startChatBtn || 'Chat starten'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                !isSearchingUsers && (
                  <div className="p-3 text-center text-xs text-slate-500">
                    {t.chat?.noUsersFound || 'Keine Nutzer gefunden.'}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
