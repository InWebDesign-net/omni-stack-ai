'use client';

import React, { useState } from 'react';
import { 
  MessageCircle, X, Maximize2, Minimize2, Settings, 
  Search, Edit, Send, Paperclip, Smile
} from 'lucide-react';
import ChatSettingsModal from './ChatSettingsModal';
import { useApp } from '@/context/AppContext';

export default function ChatWidget() {
  const { currentUser } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  // Mock data for UI presentation
  const mockRooms = [
    { id: '1', name: 'AI Assistant', type: 'ai', lastMessage: 'How can I help you today?', time: '10:42 AM', unread: 0 },
    { id: '2', name: 'Tech Talk', type: 'group', lastMessage: 'Did anyone see the new release?', time: '09:15 AM', unread: 3 },
    { id: '3', name: 'Alex Johnson', type: 'direct', lastMessage: 'Sure, I can send that over.', time: 'Yesterday', unread: 0 },
  ];

  const mockMessages = [
    { id: '1', sender: 'Alex Johnson', content: 'Hey, are we still on for the meeting?', time: '10:00 AM', isMe: false },
    { id: '2', sender: 'Me', content: 'Yes! Just finishing up another call.', time: '10:05 AM', isMe: true },
    { id: '3', sender: 'Alex Johnson', content: 'Great, see you in 10 mins.', time: '10:06 AM', isMe: false },
  ];

  if (!currentUser) return null;

  const toggleOpen = () => setIsOpen(!isOpen);
  const toggleExpand = () => setIsExpanded(!isExpanded);

  // 1. Floating Support Button (Closed State)
  if (!isOpen) {
    return (
      <button
        onClick={toggleOpen}
        className="fixed bottom-6 right-6 z-50 p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-2xl transition-transform hover:scale-105 active:scale-95 flex items-center justify-center"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-[#0f0f0f]">
          3
        </span>
      </button>
    );
  }

  // 2. Full-Screen 2-Column View (WhatsApp / Telegram Style)
  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0f0f0f] flex flex-col md:flex-row">
        {/* Left Column - Sidebar */}
        <div className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-white/10 ${activeRoomId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
            <h2 className="font-semibold text-lg">Chats</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-white/10 rounded-full">
                <Settings className="w-5 h-5 text-white/70" />
              </button>
              <button className="p-2 hover:bg-white/10 rounded-full">
                <Edit className="w-5 h-5 text-white/70" />
              </button>
              <button onClick={toggleOpen} className="p-2 hover:bg-white/10 rounded-full md:hidden">
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>
          </div>
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {mockRooms.map((room) => (
              <div 
                key={room.id}
                onClick={() => setActiveRoomId(room.id)}
                className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 border-b border-white/5 ${activeRoomId === room.id ? 'bg-white/10' : ''}`}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 flex items-center justify-center font-bold">
                  {room.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-medium truncate">{room.name}</h3>
                    <span className="text-xs text-white/50">{room.time}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-white/60 truncate">{room.lastMessage}</p>
                    {room.unread > 0 && (
                      <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-2">
                        {room.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - Main Chat Area */}
        <div className={`flex-1 flex flex-col bg-[#0f0f0f] ${!activeRoomId ? 'hidden md:flex' : 'flex'}`}>
          {activeRoomId ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveRoomId(null)} className="md:hidden p-2 -ml-2 hover:bg-white/10 rounded-full">
                    <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold">
                    {mockRooms.find(r => r.id === activeRoomId)?.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-medium">{mockRooms.find(r => r.id === activeRoomId)?.name}</h3>
                    <p className="text-xs text-white/50">Online</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={toggleExpand} className="p-2 hover:bg-white/10 rounded-full">
                    <Minimize2 className="w-5 h-5 text-white/70" />
                  </button>
                  <button onClick={toggleOpen} className="p-2 hover:bg-white/10 rounded-full">
                    <X className="w-5 h-5 text-white/70" />
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {mockMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${msg.isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white/10 text-white/90 rounded-bl-none'}`}>
                      <p>{msg.content}</p>
                      <span className={`text-[10px] block mt-1 ${msg.isMe ? 'text-blue-200 text-right' : 'text-white/50'}`}>
                        {msg.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-white/5 border-t border-white/10">
                <div className="flex items-end gap-2 bg-[#0f0f0f] border border-white/10 rounded-xl p-2">
                  <button className="p-2 text-white/50 hover:text-white/90 transition-colors">
                    <Smile className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-white/50 hover:text-white/90 transition-colors">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <textarea
                    placeholder="Type a message..."
                    className="flex-1 max-h-32 min-h-[40px] bg-transparent resize-none focus:outline-none py-2 text-sm"
                    rows={1}
                  />
                  <button className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex-shrink-0">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-white/50">
              <div className="flex items-center justify-between w-full absolute top-0 p-4">
                <div />
                <div className="flex items-center gap-2">
                  <button onClick={toggleExpand} className="p-2 hover:bg-white/10 rounded-full">
                    <Minimize2 className="w-5 h-5 text-white/70" />
                  </button>
                  <button onClick={toggleOpen} className="p-2 hover:bg-white/10 rounded-full">
                    <X className="w-5 h-5 text-white/70" />
                  </button>
                </div>
              </div>
              <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
              <p>Select a chat to start messaging</p>
            </div>
          )}
        </div>
        <ChatSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </div>
    );
  }

  // 3. Compact Overlay Card Modal (400x580px)
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[400px] h-[580px] bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-white/5">
        {activeRoomId ? (
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveRoomId(null)} className="p-1 hover:bg-white/10 rounded-full">
              <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="font-medium text-sm truncate max-w-[150px]">
              {mockRooms.find(r => r.id === activeRoomId)?.name}
            </h3>
          </div>
        ) : (
          <h2 className="font-semibold px-2">Messages</h2>
        )}
        
        <div className="flex items-center gap-1">
          <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors" title="Settings">
            <Settings className="w-4 h-4 text-white/70" />
          </button>
          <button onClick={toggleExpand} className="p-1.5 hover:bg-white/10 rounded-full transition-colors" title="Expand">
            <Maximize2 className="w-4 h-4 text-white/70" />
          </button>
          <button onClick={toggleOpen} className="p-1.5 hover:bg-white/10 rounded-full transition-colors" title="Close">
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeRoomId ? (
          // Active Chat View (Compact)
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {mockMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${msg.isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white/10 text-white/90 rounded-bl-none'}`}>
                    <p>{msg.content}</p>
                    <span className={`text-[9px] block mt-1 ${msg.isMe ? 'text-blue-200 text-right' : 'text-white/50'}`}>
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-white/5 border-t border-white/10">
              <div className="flex items-end gap-2 bg-[#0f0f0f] border border-white/10 rounded-xl p-1.5">
                <textarea
                  placeholder="Message..."
                  className="flex-1 max-h-24 min-h-[32px] bg-transparent resize-none focus:outline-none py-1.5 px-2 text-sm"
                  rows={1}
                />
                <button className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex-shrink-0">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          // Room List View (Compact)
          <div className="flex-1 overflow-y-auto">
            {mockRooms.map((room) => (
              <div 
                key={room.id}
                onClick={() => setActiveRoomId(room.id)}
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 border-b border-white/5"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 flex items-center justify-center font-bold text-sm">
                  {room.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-medium text-sm truncate">{room.name}</h3>
                    <span className="text-[10px] text-white/50">{room.time}</span>
                  </div>
                  <div className="flex justify-between items-center mt-0.5">
                    <p className="text-xs text-white/60 truncate">{room.lastMessage}</p>
                    {room.unread > 0 && (
                      <span className="bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-2">
                        {room.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <ChatSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
