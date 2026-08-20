'use client';

import React, { useMemo } from 'react';
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

// Format date divider label (e.g., "Heute", "Gestern", or "19. August 2026")
function formatDateDivider(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - targetDate.getTime()) / (1000 * 3600 * 24));

  if (diffDays === 0) return 'Heute';
  if (diffDays === 1) return 'Gestern';

  return d.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// Get YYYY-MM-DD for date boundary checks
function getDayKey(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function MessageList({ messages, currentUserId, showReadReceipts, messagesEndRef }: MessageListProps) {
  // Pre-process messages with WhatsApp-style grouping logic
  const processedMessages = useMemo(() => {
    return messages.map((msg, index) => {
      const isMe =
        msg.senderName === 'Du' ||
        (Boolean(currentUserId) && Boolean(msg.senderId) && String(msg.senderId) === currentUserId);
      const isSystem = msg.senderType === 'system';

      const prevMsg = index > 0 ? messages[index - 1] : null;
      const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;

      const currentDayKey = getDayKey(msg.timestamp);
      const prevDayKey = prevMsg ? getDayKey(prevMsg.timestamp) : '';
      const showDateDivider = currentDayKey !== prevDayKey;

      const currentTimestamp = new Date(msg.timestamp).getTime();
      const prevTimestamp = prevMsg ? new Date(prevMsg.timestamp).getTime() : 0;
      const nextTimestamp = nextMsg ? new Date(nextMsg.timestamp).getTime() : 0;

      // Group threshold: 5 minutes (300,000 ms) between consecutive messages by same sender on same day
      const FIVE_MINUTES_MS = 5 * 60 * 1000;

      const isSameSenderAsPrev =
        prevMsg &&
        !showDateDivider &&
        prevMsg.senderType !== 'system' &&
        !isSystem &&
        ((isMe && (prevMsg.senderName === 'Du' || (currentUserId && String(prevMsg.senderId) === currentUserId))) ||
          (!isMe && prevMsg.senderName === msg.senderName)) &&
        Math.abs(currentTimestamp - prevTimestamp) < FIVE_MINUTES_MS;

      const isSameSenderAsNext =
        nextMsg &&
        getDayKey(nextMsg.timestamp) === currentDayKey &&
        nextMsg.senderType !== 'system' &&
        !isSystem &&
        ((isMe && (nextMsg.senderName === 'Du' || (currentUserId && String(nextMsg.senderId) === currentUserId))) ||
          (!isMe && nextMsg.senderName === msg.senderName)) &&
        Math.abs(nextTimestamp - currentTimestamp) < FIVE_MINUTES_MS;

      const isFirstInGroup = !isSameSenderAsPrev;
      const isLastInGroup = !isSameSenderAsNext;

      return {
        ...msg,
        isMe,
        isSystem,
        showDateDivider,
        dateDividerText: showDateDivider ? formatDateDivider(msg.timestamp) : '',
        isFirstInGroup,
        isLastInGroup,
      };
    });
  }, [messages, currentUserId]);

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain p-3 min-h-0">
      {processedMessages.map((msg) => {
        if (msg.isSystem) {
          return (
            <React.Fragment key={msg.id}>
              {msg.showDateDivider && msg.dateDividerText && (
                <div className="flex justify-center my-3 sticky top-2 z-10">
                  <span className="px-3 py-1 bg-surface-raised/90 border border-subtle text-primary rounded-full text-[11px] font-mono shadow-md backdrop-blur-md">
                    {msg.dateDividerText}
                  </span>
                </div>
              )}
              <div className="flex justify-center my-2">
                <span className="px-3 py-1 bg-surface border border-subtle text-muted rounded-full text-[11px] font-mono">
                  {msg.content}
                </span>
              </div>
            </React.Fragment>
          );
        }

        // WhatsApp-style Bubble Border Radius per grouping
        let bubbleCorners = 'rounded-2xl';
        if (msg.isMe) {
          if (msg.isFirstInGroup && msg.isLastInGroup) {
            bubbleCorners = 'rounded-2xl rounded-br-sm';
          } else if (msg.isFirstInGroup && !msg.isLastInGroup) {
            bubbleCorners = 'rounded-2xl rounded-br-none';
          } else if (!msg.isFirstInGroup && msg.isLastInGroup) {
            bubbleCorners = 'rounded-2xl rounded-tr-none rounded-br-sm';
          } else {
            bubbleCorners = 'rounded-2xl rounded-r-none';
          }
        } else {
          if (msg.isFirstInGroup && msg.isLastInGroup) {
            bubbleCorners = 'rounded-2xl rounded-bl-sm';
          } else if (msg.isFirstInGroup && !msg.isLastInGroup) {
            bubbleCorners = 'rounded-2xl rounded-bl-none';
          } else if (!msg.isFirstInGroup && msg.isLastInGroup) {
            bubbleCorners = 'rounded-2xl rounded-tl-none rounded-bl-sm';
          } else {
            bubbleCorners = 'rounded-2xl rounded-l-none';
          }
        }

        const formattedTime = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
          <React.Fragment key={msg.id}>
            {/* Sticky Date Divider (0 Uhr / Neuer Tag) */}
            {msg.showDateDivider && msg.dateDividerText && (
              <div className="flex justify-center my-3.5 sticky top-2 z-10">
                <span className="px-3 py-1 bg-surface-raised/90 border border-subtle text-primary rounded-full text-[11px] font-mono shadow-md backdrop-blur-md">
                  {msg.dateDividerText}
                </span>
              </div>
            )}

            {/* Message Item Container with Dynamic Spacing (Flush when grouped) */}
            <div className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'} ${msg.isFirstInGroup ? 'mt-3' : 'mt-0.5'}`}>
              <div
                className={`max-w-[78%] sm:max-w-[72%] px-4 py-2.5 text-sm shadow-md transition-all ${bubbleCorners} ${
                  msg.isMe
                    ? 'bg-indigo-600 text-white'
                    : 'bg-surface border border-subtle text-primary'
                }`}
              >
                {/* Sender Name: Only rendered on first message of a group for incoming messages */}
                {!msg.isMe && msg.isFirstInGroup && (
                  <div className="text-[11px] font-extrabold text-indigo-400 mb-1 flex items-center gap-1.5">
                    {msg.senderType === 'ai' && <Bot className="w-3.5 h-3.5 text-teal-400" />}
                    <span>{msg.senderName}</span>
                  </div>
                )}

                <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                {/* AI Vector Summary Metadata */}
                {msg.meta?.vectorSummary && (
                  <div className="mt-2 pt-2 border-t border-indigo-500/20 text-[11px] font-mono text-indigo-300 flex items-center gap-1.5 bg-indigo-950/40 px-2.5 py-1.5 rounded-xl border border-indigo-500/20">
                    <Sparkles className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>{msg.meta.vectorSummary}</span>
                  </div>
                )}

                {/* Inline Bubble Footer: Micro Timestamp & Read Status only on last message of group */}
                {msg.isLastInGroup && (
                  <div className="flex items-center justify-end gap-1.5 mt-1 -mb-0.5">
                    <span className={`text-[10px] font-mono opacity-75 ${msg.isMe ? 'text-indigo-200' : 'text-muted'}`}>
                      {formattedTime}
                    </span>
                    {msg.isMe && showReadReceipts && (
                      <CheckCheck className="w-3.5 h-3.5 text-indigo-200 opacity-90" />
                    )}
                  </div>
                )}
              </div>
            </div>
          </React.Fragment>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
