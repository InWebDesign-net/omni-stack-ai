'use client';

import React from 'react';
import { Bot, Sparkles, ArrowLeft, X, Minimize2, AlertCircle, Users } from 'lucide-react';

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
  onManageGroup?: () => void;
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
  onManageGroup,
  t,
}: RoomHeaderProps) {
  return (
    <>
      {/* Sleek & Compact Chat Room Header */}
      <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors shrink-0"
              title={t?.chat?.backToRooms || 'Zurück zur Übersicht'}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="relative shrink-0">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-500 to-teal-400 flex items-center justify-center font-bold text-xs text-white shadow-sm">
              {roomType === 'ai' ? <Bot className="w-4 h-4" /> : roomType === 'group' ? <Users className="w-4 h-4" /> : roomName.charAt(0)}
            </div>
            {showOnlineStatus && (
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border-2 border-[#080e1e] rounded-full" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-xs text-white truncate flex items-center gap-1.5">
              <span className="truncate">{roomName}</span>
              {roomType === 'ai' && (
                <span className="px-1.5 py-0.2 text-[9px] font-mono bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full shrink-0">
                  AI
                </span>
              )}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {roomType === 'group' && onManageGroup && (
            <button
              onClick={onManageGroup}
              className="px-2 py-0.5 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 rounded-lg transition-all flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
              title="Gruppe verwalten & Mitglieder"
            >
              <Users className="w-3 h-3 text-indigo-400" />
              <span>Verwalten</span>
            </button>
          )}

          {roomType === 'ai' ? (
            <span className="px-2 py-0.5 text-[10px] font-mono bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Omni AI</span>
            </span>
          ) : isAiEnabled ? (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full text-[10px] font-medium">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Omni AI</span>
              <button
                onClick={onRemoveAi}
                className="ml-0.5 p-0.5 hover:bg-rose-500/40 hover:text-rose-200 rounded-full transition-colors"
                title="KI aus Chat entfernen"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onInviteAi}
              className="px-2 py-0.5 bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 hover:text-teal-200 rounded-lg transition-all flex items-center gap-1 text-[11px] font-semibold"
              title="KI in diesen Chat einladen"
            >
              <Sparkles className="w-3 h-3 text-teal-400" />
              <span>+ KI</span>
            </button>
          )}

          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all"
              title="Fenster vergrößern / verkleinern"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Privacy / Error notification banner */}
      {privacyError && (
        <div className="m-2 p-2 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{privacyError}</span>
        </div>
      )}
    </>
  );
}
