'use client';

import React from 'react';
import { Bot, Sparkles, X, Minimize2, AlertCircle } from 'lucide-react';

interface RoomHeaderProps {
  roomName: string;
  roomType: string;
  isAiEnabled?: boolean;
  showOnlineStatus?: boolean;
  privacyError?: string | null;
  onToggleExpand?: () => void;
  onClose?: () => void;
  onRemoveAi?: () => void;
  onInviteAi?: () => void;
  t?: any;
}

export function RoomHeader({
  roomName,
  roomType,
  isAiEnabled,
  showOnlineStatus,
  privacyError,
  onToggleExpand,
  onClose,
  onRemoveAi,
  onInviteAi,
  t,
}: RoomHeaderProps) {
  return (
    <>
      {/* Chat Room Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-teal-400 flex items-center justify-center font-bold text-white shadow-md">
              {roomType === 'ai' ? <Bot className="w-5 h-5" /> : roomName.charAt(0)}
            </div>
            {showOnlineStatus && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#080e1e] rounded-full" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              {roomName}
              {roomType === 'ai' && (
                <span className="px-2 py-0.5 text-[10px] font-mono bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full">
                  Ollama AI
                </span>
              )}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {roomType === 'ai' ? (
            <span className="px-2 py-0.5 text-[10px] font-mono bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              Omni AI
            </span>
          ) : isAiEnabled ? (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full text-[11px] font-medium">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Omni AI</span>
              <button
                onClick={onRemoveAi}
                className="ml-1 p-0.5 hover:bg-rose-500/40 hover:text-rose-200 rounded-full transition-colors"
                title="KI aus Chat entfernen"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={onInviteAi}
              className="px-2.5 py-1 bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 hover:text-teal-200 rounded-xl transition-all flex items-center gap-1 text-xs font-semibold"
              title="KI in diesen Chat einladen"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">KI einladen</span>
            </button>
          )}

          <button onClick={onToggleExpand} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all" title="Fenster verkleinern">
            <Minimize2 className="w-5 h-5" />
          </button>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all" title={t?.common?.close || 'Schließen'}>
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
    </>
  );
}
