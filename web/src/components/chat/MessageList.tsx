'use client';

import React from 'react';
import { Bot, Sparkles, CheckCheck } from 'lucide-react';

interface Message {
  id: string;
  senderId?: string;
  senderName?: string;
  senderType?: string;
  content: string;
  timestamp: string;
  meta?: { vectorSummary?: string };
}

interface MessageListProps {
  messages: Message[];
  currentUserId?: string | null;
  showReadReceipts?: boolean;
  messagesEndRef?: React.RefObject<HTMLDivElement | null>;
}

export function MessageList({ messages, currentUserId, showReadReceipts, messagesEndRef }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-3.5 min-h-0">
      {messages.map((msg) => {
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
  );
}
