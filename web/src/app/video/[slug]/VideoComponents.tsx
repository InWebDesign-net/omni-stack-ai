'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Heart, Share2, Send, MessageSquare, Eye, Clock,
  Pencil, Trash2, Check, X, ChevronDown, ChevronUp, Play,
} from 'lucide-react';
import SubscribeButton from '@/components/SubscribeButton';
import { formatRelativeDate } from '@/lib/date';
import Image from 'next/image';
import { UnifiedCommentsSection } from '@/components/comments/UnifiedCommentsSection';

interface VideoInfoProps {
  video: any;
  creator: {
    username: string;
    handle: string;
    avatarUrl: string;
    id?: string | number;
  };
  currentUser?: any;
  isSubscribed: boolean;
  isLiked: boolean;
  likesCount: number;
  viewsCount: number;
  descExpanded: boolean;
  commentsCount: number;
  onToggleLike: () => void;
  onToggleSubscribe: () => void;
  onToggleDesc: () => void;
  onShare: () => void;
  onOpenChannel: () => void;
  showToast: (msg: string) => void;
  t?: any;
}

export function VideoInfo({
  video,
  creator,
  currentUser,
  isSubscribed,
  isLiked,
  likesCount,
  viewsCount,
  descExpanded,
  commentsCount,
  onToggleLike,
  onToggleSubscribe,
  onToggleDesc,
  onShare,
  onOpenChannel,
  showToast,
  t,
}: VideoInfoProps) {
  const summary = video?.summary || video?.description || '';
  const truncated = summary.length > 200 ? `${summary.slice(0, 200)}...` : summary;

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-extrabold text-primary leading-tight">
        {video?.title}
      </h1>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
        <span className="flex items-center gap-1">
          <Eye className="w-3.5 h-3.5" />
          {viewsCount} {t?.common?.views || 'Aufrufe'}
        </span>
        <span className="flex items-center gap-1">
          <Heart className="w-3.5 h-3.5" />
          {likesCount}
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare className="w-3.5 h-3.5" />
          {commentsCount} {t?.common?.comments || 'Kommentare'}
        </span>
        {video?.createdAt && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatRelativeDate(video.createdAt, 'de')}
          </span>
        )}
      </div>

      {summary && (
        <div className="bg-surface border border-subtle rounded-xl p-3">
          <p className="text-sm text-primary whitespace-pre-wrap">
            {descExpanded ? summary : truncated}
          </p>
          {summary.length > 200 && (
            <button
              onClick={onToggleDesc}
              className="mt-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              {descExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  {t?.common?.showLess || 'Weniger anzeigen'}
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  {t?.common?.showMore || 'Mehr anzeigen'}
                </>
              )}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          onClick={onOpenChannel}
          className="flex items-center gap-3 hover:bg-surface-raised rounded-xl p-2 -ml-2 transition-colors"
        >
          <Image
            src={creator.avatarUrl}
            alt={creator.username}
            className="w-10 h-10 rounded-full object-cover border-2 border-subtle"
          />
          <div className="text-left">
            <div className="text-sm font-bold text-primary">{creator.username}</div>
            <div className="text-xs text-muted">{creator.handle}</div>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <SubscribeButton
            targetId={creator.handle}
            initialIsSubscribed={isSubscribed}
            onStatusChange={(subscribed) => {
              if (subscribed !== isSubscribed) onToggleSubscribe();
            }}
          />
          <button
            onClick={onToggleLike}
            className={`p-2.5 rounded-xl transition-all ${
              isLiked ? 'bg-rose-500/20 text-rose-400' : 'bg-surface-raised border border-subtle text-muted hover:text-primary'
            }`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={onShare}
            className="p-2.5 bg-surface-raised border border-subtle text-muted hover:text-primary rounded-xl transition-colors"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface VideoCommentsProps {
  slug: string;
  lang: 'de' | 'en';
  currentUser?: any;
  onOpenAuth?: () => void;
  showToast?: (msg: string) => void;
  t?: any;
}

export function VideoComments({
  slug,
  lang,
  t,
}: VideoCommentsProps) {
  return <UnifiedCommentsSection slug={slug} lang={lang} t={t} accentColor="indigo" />;
}

interface RelatedVideosProps {
  items: any[];
  t?: any;
}

export function RelatedVideos({ items, t }: RelatedVideosProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-primary flex items-center gap-2">
        <Play className="w-5 h-5 text-indigo-400" />
        {t?.common?.relatedVideos || 'Ähnliche Videos'}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((item) => (
          <Link
            key={item.slug || item.id}
            href={`/video/${item.slug}`}
            className="group relative bg-surface border border-subtle rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all"
          >
            <div className="relative aspect-video bg-surface-raised">
              {item.thumbnailUrl ? (
                <Image
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-purple-950 via-indigo-950 to-slate-900 flex items-center justify-center">
                  <Play className="w-6 h-6 text-cyan-400" />
                </div>
              )}
              {item.duration > 0 && (
                <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-surface-raised/80 text-[8px] font-mono text-primary">
                  {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
                </span>
              )}
            </div>
            <div className="p-2">
              <h4 className="text-xs font-semibold text-primary line-clamp-2 group-hover:text-indigo-300 transition-colors">
                {item.title}
              </h4>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-muted">
                <span>{item.creator?.username || item.authorName || 'Omni Creator'}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
