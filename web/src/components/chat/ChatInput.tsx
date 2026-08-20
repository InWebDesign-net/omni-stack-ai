'use client';

import React, { useState } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => void;
  t?: any;
}

export function ChatInput({ onSend, t }: ChatInputProps) {
  const [inputMessage, setInputMessage] = useState('');

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim()) return;
    onSend(inputMessage);
    setInputMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <form onSubmit={handleSend} className="py-1.5 px-2 bg-surface-raised border-t border-subtle shrink-0">
      <div className="flex items-center gap-1.5 bg-surface border border-subtle rounded-xl px-2 py-1 focus-within:border-indigo-500 transition-colors">
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t?.chat?.messagePlaceholder || 'Nachricht eingeben...'}
          className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-primary placeholder-slate-500 resize-none max-h-24 min-h-[28px] py-1"
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
