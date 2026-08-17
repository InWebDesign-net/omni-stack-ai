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
    <form onSubmit={handleSend} className="p-4 bg-slate-900/60 border-t border-slate-800">
      <div className="flex items-end gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-2 focus-within:border-indigo-500 transition-colors">
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t?.chat?.messagePlaceholder || 'Nachricht eingeben...'}
          className="flex-1 bg-transparent border-none outline-none text-sm text-slate-200 placeholder-slate-500 resize-none max-h-32 min-h-[40px]"
          rows={1}
        />
        <button
          type="submit"
          disabled={!inputMessage.trim()}
          className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl transition-all shrink-0"
          title={t?.chat?.send || 'Senden'}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
