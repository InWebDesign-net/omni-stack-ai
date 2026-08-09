'use client';

import React from 'react';
import { X, CheckCircle2, UserPlus } from 'lucide-react';
import { ChannelProfileData, useApp } from '@/context/AppContext';

interface ChannelProfileModalProps {
  selectedChannel: ChannelProfileData | null;
  onClose: () => void;
}

export default function ChannelProfileModal({
  selectedChannel,
  onClose,
}: ChannelProfileModalProps) {
  const { subscribedChannels, toggleSubscribeChannel, t } = useApp();

  if (!selectedChannel) return null;

  const isSubscribed = subscribedChannels.includes(selectedChannel.handle);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0d1528] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 z-50 animate-scaleIn">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#9ba4bf] hover:text-white rounded-xl"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-4">
          <img
            src={selectedChannel.avatarUrl}
            alt={selectedChannel.username}
            className="h-16 w-16 rounded-full object-cover border-2 border-[#8083ff]"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-lg font-bold text-white">{selectedChannel.username}</h3>
              <CheckCircle2 className="h-4 w-4 text-[#44e2cd]" />
            </div>
            <p className="text-xs font-mono text-[#9ba4bf]">{selectedChannel.handle}</p>
            <span className="text-[11px] text-[#44e2cd] font-semibold mt-1 inline-block">
              {((selectedChannel.subscribersCount || 15400) / 1000).toFixed(1)}k Abonnenten
            </span>
          </div>
        </div>

        <p className="text-xs text-[#dae2fd] leading-relaxed">
          {selectedChannel.bio || 'Creator & Content Publisher im Omni Network.'}
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-white/6">
          <button
            onClick={() => toggleSubscribeChannel(selectedChannel.handle)}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              isSubscribed
                ? 'bg-[#121a30] border border-white/10 text-[#9ba4bf]'
                : 'bg-[#44e2cd] text-[#003731] hover:bg-[#3bcbb8] shadow-lg shadow-[#44e2cd]/20'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            <span>{isSubscribed ? t.channel.subscribed : t.common.subscribe}</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#8083ff] hover:bg-[#6b6eff] text-white font-extrabold text-xs rounded-xl shadow-md transition-all"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
}
