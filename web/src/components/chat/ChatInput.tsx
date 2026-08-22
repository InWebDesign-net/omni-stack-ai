'use client';

import React, { useState, useLayoutEffect, useRef } from 'react';
import { Send } from 'lucide-react';

/** Lines the input grows to before it starts scrolling instead. */
const MAX_LINES = 3;

interface ChatInputProps {
  onSend: (text: string) => void;
  onTyping?: (isTyping: boolean) => void;
  t?: any;
}

export function ChatInput({ onSend, onTyping, t }: ChatInputProps) {
  const [inputMessage, setInputMessage] = useState('');
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  /**
   * Grow the field with the text, up to three lines.
   *
   * A textarea does not resize itself, so `rows={1}` used to fix it at one line
   * however much was typed and the `max-h-24` cap never came into play. The
   * height has to be measured: collapse to `auto` first, because `scrollHeight`
   * of an element already tall enough to fit its content only ever reports the
   * current height and the field could then never shrink again.
   *
   * The cap is derived from the computed line height rather than a fixed pixel
   * value — the field is `text-xs sm:text-sm`, so three lines is a different
   * number of pixels per breakpoint.
   */
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = 'auto';

    const styles = window.getComputedStyle(el);
    const lineHeight = parseFloat(styles.lineHeight) || parseFloat(styles.fontSize) * 1.5;
    const verticalPadding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const maxHeight = lineHeight * MAX_LINES + verticalPadding;

    const next = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${next}px`;
    // Only scroll once the field has stopped growing, so the scrollbar does not
    // flicker in and out on the first two lines.
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [inputMessage]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputMessage(val);

    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2500);
    }
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim()) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (onTyping) onTyping(false);
    onSend(inputMessage);
    setInputMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBlur = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (onTyping) onTyping(false);
  };

  return (
    <form onSubmit={handleSend} className="py-1.5 px-2 bg-surface-raised border-t border-subtle shrink-0">
      {/* Bottom-aligned: with a field that grows, a centred send button drifts
          upwards away from the last line the writer is looking at. */}
      <div className="flex items-end gap-1.5 bg-surface border border-subtle rounded-xl px-2 py-1 focus-within:border-indigo-500 transition-colors">
        <textarea
          ref={textareaRef}
          value={inputMessage}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={t?.chat?.writeMessagePlaceholder || 'Nachricht schreiben...'}
          className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-primary placeholder-slate-500 resize-none min-h-[28px] py-1"
          rows={1}
        />
        <button
          type="submit"
          disabled={!inputMessage.trim()}
          className="p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-surface-raised disabled:text-faint text-white rounded-lg transition-all shrink-0 cursor-pointer"
          title={t?.chat?.send || 'Senden'}
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </form>
  );
}
