'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { X, CheckCircle2, ArrowUpRight, MessageSquare, Sparkles } from 'lucide-react';
import { ChannelProfileData, useApp } from '@/context/AppContext';
import { useChat } from '@/context/ChatContext';
import SubscribeButton from '@/components/SubscribeButton';

interface ChannelProfileModalProps {
  selectedChannel: ChannelProfileData | null;
  onClose: () => void;
}

export default function ChannelProfileModal({
  selectedChannel,
  onClose,
}: ChannelProfileModalProps) {
  const { t, currentUser, openAuthModal } = useApp();
  const { createRoom, openChat } = useChat();
  const router = useRouter();

  if (!selectedChannel) return null;

  const isOwner = Boolean(
    currentUser &&
      (currentUser.id === selectedChannel.id ||
        currentUser.username === selectedChannel.username)
  );

  const cleanHandle = (selectedChannel.handle || '').replace(/^@/, '').toLowerCase();
  const handleMap: Record<string, string> = {
    demotech: '1',
    demogourmet: '2',
    greenplanet: '3',
    finanzkompass: '4',
    astro: '10',
  };
  const targetId = selectedChannel.id
    ? String(selectedChannel.id)
    : (handleMap[cleanHandle] || cleanHandle);

  const dmSetting = selectedChannel.allowDirectMessages || 'everyone';
  const canSendDM = !isOwner && dmSetting !== 'nobody';

  const handleStartChat = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!currentUser) {
      onClose();
      openAuthModal('login');
      return;
    }

    onClose();

    const res = await createRoom({
      name: selectedChannel.username,
      type: 'direct',
      recipientId: targetId,
    });

    openChat(res?.roomId || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md animate-fadeIn" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0d1528] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 z-50 animate-scaleIn font-sans">
        
        {/* Channel Header (Avatar + Details + Top Actions) */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-indigo-500 via-[#8083ff] to-teal-400 opacity-60 blur-sm" />
              <img
                src={selectedChannel.avatarUrl}
                alt={selectedChannel.username}
                className="relative h-14 w-14 rounded-full object-cover border-2 border-white/20 shadow-xl"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <h3 className="text-base font-extrabold text-white truncate">{selectedChannel.username}</h3>
                <CheckCircle2 className="h-4 w-4 text-[#44e2cd] shrink-0" />
              </div>
              <p className="text-xs font-mono text-[#9ba4bf] truncate">{selectedChannel.handle}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-[#44e2cd] font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {selectedChannel.subscribersCount && selectedChannel.subscribersCount >= 1000
                    ? `${(selectedChannel.subscribersCount / 1000).toFixed(1)}k Abonnenten`
                    : `${(selectedChannel.subscribersCount || 0).toLocaleString()} Abonnenten`}
                </span>
              </div>
            </div>
          </div>

          {/* Compact Top Action Buttons (Icon-only for Abonnieren & Nachricht) */}
          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
            {!isOwner && (
              <SubscribeButton
                targetId={targetId}
                size="sm"
                iconOnly
                showCount={false}
              />
            )}

            {canSendDM && (
              <button
                onClick={handleStartChat}
                aria-label="Direktnachricht senden"
                title="Direktnachricht senden"
                className="p-2 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
              >
                <MessageSquare className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={onClose}
              aria-label={t.common?.close || 'Schließen'}
              title={t.common?.close || 'Schließen'}
              className="p-2 text-[#9ba4bf] hover:text-white rounded-xl hover:bg-white/5 transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Bio */}
        <div className="bg-[#080e1e]/60 p-3.5 rounded-2xl border border-white/5 text-xs text-[#dae2fd] leading-relaxed">
          {selectedChannel.bio || 'Creator & Content Publisher im Omni Network.'}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/6 gap-2">
          <button
            onClick={() => {
              const channelHandle = (selectedChannel.handle || '').replace(/^@/, '');
              if (channelHandle) {
                onClose();
                router.push(`/user/${encodeURIComponent(channelHandle)}`);
              }
            }}
            className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 bg-[#44e2cd] text-[#003731] hover:bg-[#3bcbb8] shadow-lg shadow-[#44e2cd]/20 active:scale-95 cursor-pointer"
          >
            <ArrowUpRight className="h-4 w-4" />
            <span>Zum Kanal</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs rounded-xl transition-all"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
}
