'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  MessageSquare,
  MessageCircle,
  Play,
  UserPlus,
  Sparkles,
  ExternalLink,
  Mail,
  MailOpen,
} from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { useApp } from '@/context/AppContext';
import { useChat } from '@/context/ChatContext';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const router = useRouter();
  const { notifications, unreadCount, markAllAsRead, markAsRead, toggleRead, deleteNotification } =
    useNotifications();
  const { openChat } = useChat();
  const { t } = useApp();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  if (!isOpen) return null;

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'chat_message':
        return <MessageSquare className="w-4 h-4 text-indigo-400" />;
      case 'comment_reply':
        return <MessageCircle className="w-4 h-4 text-teal-400" />;
      case 'new_comment':
        return <MessageCircle className="w-4 h-4 text-indigo-400" />;
      case 'new_video':
        return <Play className="w-4 h-4 text-emerald-400" />;
      case 'new_subscriber':
        return <UserPlus className="w-4 h-4 text-amber-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-indigo-400" />;
    }
  };

  const handleNotificationClick = async (n: any) => {
    if (!n.isRead) {
      await markAsRead(n.id || n.documentId);
    }
    onClose();

    if (n.link) {
      const linkStr = String(n.link);
      if (linkStr.startsWith('chat:') || linkStr.includes('room=')) {
        let roomId = '';
        if (linkStr.startsWith('chat:')) {
          roomId = linkStr.replace('chat:', '');
        } else if (linkStr.includes('room=')) {
          const match = linkStr.match(/room=([^&]+)/);
          if (match) roomId = match[1];
        }
        if (roomId) {
          openChat(roomId);
          return;
        }
      }

      if (!linkStr.startsWith('chat:')) {
        router.push(n.link);
      }
    }
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return t.common?.justNow || 'Gerade eben';
      if (diffMins < 60) return `vor ${diffMins}m`;
      if (diffHours < 24) return `vor ${diffHours}h`;
      return `vor ${diffDays}d`;
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 bg-[#0c1324] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-sans backdrop-blur-xl animate-fadeIn">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-400" />
          <h3 className="font-extrabold text-sm text-white">Benachrichtigungen</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              title="Alle als gelesen markieren"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Alle gelesen</span>
            </button>
          )}
          <button
            onClick={onClose}
            aria-label={t.common?.close || 'Schließen'}
            title={t.common?.close || 'Schließen'}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-800/60 bg-slate-950/40 text-xs">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-2 font-semibold transition-all ${
            filter === 'all'
              ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Alle ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`flex-1 py-2 font-semibold transition-all ${
            filter === 'unread'
              ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Ungelesen ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60 scrollbar-none">
        {filtered.length === 0 ? (
          <div className="p-8 text-center space-y-2 text-slate-500">
            <Bell className="w-8 h-8 opacity-30 mx-auto" />
            <p className="text-xs">Keine Benachrichtigungen vorhanden</p>
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id || n.documentId}
              className={`group p-3.5 transition-all flex items-start justify-between gap-3 ${
                n.isRead ? 'bg-transparent hover:bg-slate-900/40 text-slate-400' : 'bg-indigo-500/10 hover:bg-indigo-500/15 text-white'
              }`}
            >
              <div
                onClick={() => handleNotificationClick(n)}
                className="flex items-start gap-3 flex-1 cursor-pointer min-w-0"
              >
                {/* Sender Avatar or Icon */}
                <div className="relative shrink-0 mt-0.5">
                  {n.sender?.avatarUrl ? (
                    <>
                      {/* ⚡ Bolt Optimization: Added loading="lazy" to defer loading of off-screen avatars, saving bandwidth. */}
                      <img
                        src={n.sender.avatarUrl}
                        alt={n.sender.username}
                        loading="lazy"
                        className="w-8 h-8 rounded-xl object-cover border border-slate-700"
                      />
                    </>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
                      {getIcon(n.type)}
                    </div>
                  )}
                  {!n.isRead && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-[#0c1324]" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4
                      className={`text-xs font-bold truncate ${
                        n.isRead ? 'text-slate-300 font-normal' : 'text-white font-extrabold'
                      }`}
                    >
                      {n.title}
                    </h4>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">
                      {formatTime(n.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {n.message}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRead(n.id || n.documentId, !n.isRead);
                  }}
                  aria-label={n.isRead ? 'Als ungelesen markieren' : 'Als gelesen markieren'}
                  title={n.isRead ? 'Als ungelesen markieren' : 'Als gelesen markieren'}
                  className="p-1 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                >
                  {n.isRead ? <Mail className="w-3.5 h-3.5" /> : <MailOpen className="w-3.5 h-3.5 text-indigo-400" />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(n.id || n.documentId);
                  }}
                  aria-label="Benachrichtigung löschen"
                  title="Löschen"
                  className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
