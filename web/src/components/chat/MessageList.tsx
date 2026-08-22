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

/**
 * How close to the bottom still counts as "at the bottom".
 *
 * Exact equality is unusable: sub-pixel rounding and a partially visible last
 * line leave a few pixels that never close, which would silently switch
 * following off for a reader who is plainly at the end.
 */
const BOTTOM_FOLLOW_THRESHOLD_PX = 80;

interface MessageListProps {
  messages: Message[];
  currentUserId?: string | null;
  showReadReceipts?: boolean;
  messagesEndRef?: React.RefObject<HTMLDivElement | null>;
  typingUsers?: string[];
  /** The assistant is composing but has not sent its first token yet. */
  assistantThinking?: boolean;
  /** Display name for the assistant in the thinking indicator. */
  assistantName?: string;
  t?: any;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
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

export function MessageList({
  messages,
  currentUserId,
  showReadReceipts,
  messagesEndRef,
  typingUsers,
  assistantThinking,
  assistantName = 'Omni AI',
  t,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: MessageListProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const prevScrollHeightRef = React.useRef<number>(0);

  /**
   * Whether the reader is at the bottom, and therefore wants to be carried
   * along as the conversation grows. Someone who scrolled up to re-read
   * something must not be yanked back down mid-sentence, so this gates every
   * automatic scroll below.
   */
  const isAtBottomRef = React.useRef(true);

  const scrollToBottom = React.useCallback(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    isAtBottomRef.current =
      target.scrollHeight - target.scrollTop - target.clientHeight <= BOTTOM_FOLLOW_THRESHOLD_PX;

    if (target.scrollTop <= 15 && hasMore && !isLoadingMore && onLoadMore) {
      prevScrollHeightRef.current = target.scrollHeight;
      onLoadMore();
    }
  };

  /**
   * Two opposite jobs, in one effect so their order is not left to chance.
   *
   * Prepending older messages must hold the reader's position — that is the
   * restore below, and it deliberately returns before the follow can undo it by
   * scrolling to the bottom of a list that just grew upwards.
   *
   * Otherwise, follow the end of the conversation. This re-runs on the last
   * message's content, not only on the message count, because a streamed answer
   * grows in place: the array length never changes while the text arrives, so a
   * dependency on `messages.length` alone would leave the reader stranded in the
   * middle of it.
   */
  const lastMessageContent = messages[messages.length - 1]?.content;

  React.useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    if (prevScrollHeightRef.current > 0) {
      const heightDiff = el.scrollHeight - prevScrollHeightRef.current;
      if (heightDiff > 0) el.scrollTop += heightDiff;
      prevScrollHeightRef.current = 0;
      return;
    }

    if (isAtBottomRef.current) scrollToBottom();
  }, [messages.length, lastMessageContent, typingUsers?.length, assistantThinking, scrollToBottom]);

  /**
   * The input grows with the text (#136), which shrinks this list rather than
   * changing its content. Without this the last message would slide out of
   * sight behind a field that got taller, and nothing above would notice.
   */
  React.useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      if (isAtBottomRef.current) scrollToBottom();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [scrollToBottom]);
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
        dayKey: currentDayKey,
        dateDividerText: formatDateDivider(msg.timestamp),
        isFirstInGroup,
        isLastInGroup,
      };
    });
  }, [messages, currentUserId]);

  /**
   * Messages grouped by day.
   *
   * The date labels are `sticky`, and sticky elements sharing a scroll container
   * all pin to the same offset — so with more than one day in view the older
   * label slid underneath "Heute" instead of making way for it. Wrapping each
   * day in its own section fixes that with no JavaScript: a sticky header can
   * only travel within its own section, so the next day's section pushes the
   * previous label out as it arrives.
   */
  const dayGroups = React.useMemo(() => {
    const groups: { dayKey: string; label: string; items: typeof processedMessages }[] = [];
    for (const msg of processedMessages) {
      const last = groups[groups.length - 1];
      if (!last || last.dayKey !== (msg as any).dayKey) {
        groups.push({ dayKey: (msg as any).dayKey, label: msg.dateDividerText, items: [] as any });
      }
      groups[groups.length - 1].items.push(msg as any);
    }
    return groups;
  }, [processedMessages]);

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto overscroll-contain p-3 min-h-0"
    >
      {isLoadingMore && (
        <div className="flex items-center justify-center py-2 text-xs text-muted font-mono">
          <span>Lade ältere Nachrichten...</span>
        </div>
      )}
      {dayGroups.map((group) => (
        <section key={group.dayKey} className="relative">
          <div className="flex justify-center my-3 sticky top-2 z-10">
            <span className="px-3 py-1 bg-surface-raised/90 border border-subtle text-primary rounded-full text-[11px] font-mono shadow-md backdrop-blur-md">
              {group.label}
            </span>
          </div>
          {group.items.map((msg) => {
        if (msg.isSystem) {
          return (
            <React.Fragment key={msg.id}>
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
        </section>
      ))}

      {/* Typing Indicator with 3 animated bouncing dots (#91) */}
      {(assistantThinking || (typingUsers && typingUsers.length > 0)) && (
        <div className="flex justify-start my-2 animate-fadeIn">
          <div className="bg-surface border border-subtle text-primary rounded-2xl rounded-bl-sm px-3.5 py-2 shadow-md flex items-center gap-2">
            <span className="text-xs text-muted font-medium">
              {/*
                The assistant gets its own wording: it is not typing yet, it is
                working out what to say, and the typing that follows looks
                different — the text arrives token by token.
              */}
              {assistantThinking
                ? (t?.chat?.aiThinking || '{name} überlegt').replace('{name}', assistantName)
                : typingUsers!.length === 1
                  ? (t?.chat?.typing || '{name} tippt').replace('{name}', typingUsers![0])
                  : (t?.chat?.typingPlural || '{names} tippen').replace('{names}', typingUsers!.join(', '))}
            </span>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
