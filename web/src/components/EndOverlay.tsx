'use client';

import React from 'react';
import { Play, RotateCcw, Sparkles } from 'lucide-react';
import Image from 'next/image';

interface EndCard {
  slug: string;
  title: string;
  thumbnailUrl?: string;
  duration?: number;
  creator?: { username?: string; handle?: string; avatarUrl?: string };
  authorName?: string;
  authorAvatar?: string;
}

interface EndOverlayProps {
  recommendations: EndCard[];
  currentUser?: any;
  onReplay: () => void;
  onSelectRecommendation: (slug: string) => void;
  formatTime: (secs: number) => string;
  t?: any;
}

export function EndOverlay({
  recommendations,
  currentUser,
  onReplay,
  onSelectRecommendation,
  formatTime,
  t,
}: EndOverlayProps) {
  return (
    <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-20 flex flex-col justify-between p-3 sm:p-6 pb-20 select-none animate-fadeIn">
      {/* Top Bar with Title and Replay Button */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5 sm:pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="text-xs sm:text-sm font-extrabold text-white tracking-tight">
            {currentUser
              ? t?.player?.recommendedForYou || 'Empfohlene Videos für dich'
              : t?.player?.discoverMore || 'Weitere Empfehlungen entdecken'}
          </span>
        </div>

        {/* Replay Button */}
        <button
          type="button"
          onClick={onReplay}
          className="px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
          title={t?.player?.replay || 'Erneut abspielen'}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t?.player?.replay || 'Erneut abspielen'}</span>
        </button>
      </div>

      {/* Mobile Layout: 1 Featured Horizontal Recommendation Card */}
      <div className="block sm:hidden my-auto py-1">
        {recommendations.slice(0, 1).map((rec) => {
          const creator = rec.creator;
          const creatorName = creator?.username || creator?.handle || rec.authorName || 'Omni Creator';
          const creatorAvatar = creator?.avatarUrl || rec.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80';

          return (
            <a
              key={rec.slug}
              href={`/video/${rec.slug}`}
              onClick={() => onSelectRecommendation(rec.slug)}
              className="group relative bg-surface border border-subtle hover:border-indigo-500/60 rounded-xl overflow-hidden p-2 flex items-center gap-2.5 shadow-xl transition-all"
            >
              <div className="relative w-28 aspect-video bg-surface-raised rounded-lg overflow-hidden shrink-0">
                <Image
                  src={rec.thumbnailUrl || '/media/thumbnails/default.png'}
                  alt={rec.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow">
                    <Play className="w-3 h-3 fill-white ml-0.5" />
                  </div>
                </div>
                {Boolean(rec.duration && rec.duration > 0) && (
                  <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 text-[8px] font-mono text-white">
                    {formatTime(rec.duration || 0)}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 font-mono">Nächstes Video</span>
                <h4 className="font-semibold text-xs text-primary line-clamp-2 leading-tight group-hover:text-indigo-400 transition-colors">
                  {rec.title}
                </h4>
                <div className="flex items-center gap-1.5 text-[10px] text-muted">
                  <Image
                    src={creatorAvatar}
                    alt={creatorName}
                    className="w-3.5 h-3.5 rounded-full object-cover border border-subtle shrink-0"
                  />
                  <span className="truncate font-medium">{creatorName}</span>
                </div>
              </div>
            </a>
          );
        })}
      </div>

      {/* Desktop & Tablet Layout: 3 Vertical Recommendation Cards Grid */}
      <div className="hidden sm:grid sm:grid-cols-3 gap-3 md:gap-4 my-auto py-2">
        {recommendations.slice(0, 3).map((rec) => {
          const creator = rec.creator;
          const creatorName = creator?.username || creator?.handle || rec.authorName || 'Omni Creator';
          const creatorAvatar = creator?.avatarUrl || rec.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80';

          return (
            <a
              key={rec.slug}
              href={`/video/${rec.slug}`}
              onClick={() => onSelectRecommendation(rec.slug)}
              className="group relative bg-surface border border-subtle hover:border-indigo-500/50 rounded-xl overflow-hidden shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex flex-col justify-between"
            >
              <div className="relative aspect-video w-full bg-surface-raised overflow-hidden block">
                <Image
                  src={rec.thumbnailUrl || '/media/thumbnails/default.png'}
                  alt={rec.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  </div>
                </div>
                {Boolean(rec.duration && rec.duration > 0) && (
                  <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-white border border-white/10">
                    {formatTime(rec.duration || 0)}
                  </span>
                )}
              </div>

              <div className="p-2.5 space-y-1">
                <h4 className="font-semibold text-xs text-primary line-clamp-1 group-hover:text-indigo-400 transition-colors">
                  {rec.title}
                </h4>
                <div className="flex items-center gap-1.5 pt-0.5 text-[10px] text-muted">
                  <Image
                    src={creatorAvatar}
                    alt={creatorName}
                    className="w-3.5 h-3.5 rounded-full object-cover border border-subtle shrink-0"
                  />
                  <span className="truncate font-medium">{creatorName}</span>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
