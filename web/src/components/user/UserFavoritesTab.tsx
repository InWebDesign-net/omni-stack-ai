'use client';

import React, { useState } from 'react';
import { Play, Image as ImageIcon, FileText, Heart, Sparkles } from 'lucide-react';
import Image from 'next/image';

interface UserFavoritesTabProps {
  favorites: any[];
  slug: string;
  t?: any;
}

function FavoriteItemCard({ item }: { item: any }) {
  const [imgError, setImgError] = useState(false);
  const type = item.mediaType || 'video';
  const url =
    type === 'video'
      ? `/video/${item.slug}`
      : type === 'image'
      ? `/image/${item.slug}`
      : type === 'article'
      ? `/article/${item.slug}`
      : `/content/${item.slug}`;

  const Icon =
    type === 'video'
      ? Play
      : type === 'image'
      ? ImageIcon
      : type === 'article'
      ? FileText
      : Sparkles;

  const rawThumb = item.thumbnailUrl || item.thumbnail || item.imageUrl;
  const hasThumb = Boolean(rawThumb && typeof rawThumb === 'string' && rawThumb.trim() !== '' && !imgError);

  const gradientClasses =
    type === 'article'
      ? 'from-purple-950 via-indigo-950 to-surface'
      : type === 'image'
      ? 'from-teal-950 via-emerald-950 to-surface'
      : 'from-indigo-950 via-surface to-canvas';

  const iconColor =
    type === 'article'
      ? 'text-purple-400'
      : type === 'image'
      ? 'text-teal-400'
      : 'text-indigo-400';

  return (
    <a
      key={`${type}-${item.documentId || item.id || item.slug}`}
      href={url}
      className="group relative bg-surface border border-subtle hover:border-indigo-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-video bg-surface-raised overflow-hidden">
        {hasThumb ? (
          <Image
            src={rawThumb}
            alt={item.title || 'Favorite'}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-tr ${gradientClasses} flex items-center justify-center`}>
            <Icon className={`w-10 h-10 ${iconColor} opacity-40`} />
          </div>
        )}
        <div className="absolute top-2 left-2 p-1.5 bg-surface/80 backdrop-blur-md rounded-lg border border-subtle">
          <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        </div>
      </div>
      <div className="p-3 space-y-1">
        <h3 className="font-bold text-sm text-primary line-clamp-2 group-hover:text-indigo-400 transition-colors">
          {item.title}
        </h3>
        <div className="flex items-center gap-2 text-[10px] text-muted">
          <span className="capitalize">{type}</span>
          <span>•</span>
          <span>{item.creator?.username || item.authorName || 'Omni Creator'}</span>
        </div>
      </div>
    </a>
  );
}

export function UserFavoritesTab({ favorites, slug, t }: UserFavoritesTabProps) {
  /*
   * A favourite whose target was deleted arrives with nothing to render. A
   * lifecycle now removes those rows when the content goes, but data written
   * before that existed — and any row deleted directly in the database — would
   * otherwise render an empty card and make the count disagree with the list.
   */
  const renderable = (favorites || []).filter((item) => item && (item.slug || item.documentId || item.id));

  if (renderable.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <Heart className="w-12 h-12 mx-auto text-muted" />
        <p className="text-muted">{t?.user?.noFavorites || 'Keine Favoriten vorhanden'}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {renderable.map((item, idx) => (
        <FavoriteItemCard
          key={`${item.mediaType || 'fav'}-${item.documentId || item.id || item.slug || idx}`}
          item={item}
        />
      ))}
    </div>
  );
}
