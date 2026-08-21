'use client';

import React from 'react';
import Image from 'next/image';
import { Settings, Edit3 } from 'lucide-react';
import SubscribeButton from '@/components/SubscribeButton';
import { resolveAvatarUrl } from '@/lib/avatar';

interface CreatorBadgeProps {
  creator?: {
    id?: string | number;
    username?: string;
    handle?: string;
    avatarUrl?: string;
    name?: string;
    [key: string]: any;
  } | null;
  isOwner?: boolean;
  onEdit?: () => void;
  editLabel?: string;
  onOpenProfile?: (creator: any) => void;
  className?: string;
}

export default function CreatorBadge({
  creator,
  isOwner,
  onEdit,
  editLabel = 'Bearbeiten',
  onOpenProfile,
  className = '',
}: CreatorBadgeProps) {
  const username = creator?.name || creator?.username || 'Creator';
  const handle = creator?.handle || (username ? `@${username.toLowerCase().replace(/\s+/g, '')}` : '@creator');
  const avatarUrl = resolveAvatarUrl(creator?.avatarUrl);
  const targetId = String(creator?.handle || creator?.username || creator?.id || '');

  return (
    <div className={`flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-subtle ${className}`}>
      {/* Creator Avatar & Name/Handle */}
      <div
        onClick={() => onOpenProfile?.(creator)}
        className={`flex items-center gap-3 min-w-0 max-w-[70%] ${onOpenProfile ? 'cursor-pointer group' : ''}`}
      >
        <Image
          src={avatarUrl}
          alt={username}
          width={44}
          height={44}
          className="w-11 h-11 rounded-full object-cover border border-subtle group-hover:border-indigo-500 transition-colors shrink-0"
          unoptimized
        />
        <div className="flex flex-col min-w-0">
          <span className="font-extrabold text-sm text-primary group-hover:text-indigo-400 transition-colors truncate">
            {username}
          </span>
          <span className="text-xs text-muted font-mono truncate">
            {handle}
          </span>
        </div>
      </div>

      {/* Action Button: Owner Edit or Subscribe */}
      <div className="shrink-0">
        {isOwner && onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-surface-raised hover:bg-surface border border-subtle text-primary hover:border-indigo-500/50 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Settings className="w-4 h-4 text-indigo-400" />
            <span>{editLabel}</span>
          </button>
        ) : (
          <SubscribeButton targetId={targetId} size="md" />
        )}
      </div>
    </div>
  );
}
