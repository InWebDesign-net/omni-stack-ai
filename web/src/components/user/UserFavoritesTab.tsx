'use client';

import React from 'react';
import { Play, Image as ImageIcon, FileText, Heart } from 'lucide-react';

interface UserFavoritesTabProps {
  favorites: any[];
  slug: string;
  t?: any;
}

export function UserFavoritesTab({ favorites, slug, t }: UserFavoritesTabProps) {
  if (!favorites || favorites.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <Heart className="w-12 h-12 mx-auto text-slate-600" />
        <p className="text-slate-400">{t?.user?.noFavorites || 'Keine Favoriten vorhanden'}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {favorites.map((item) => {
        const type = item.mediaType || 'video';
        const url = type === 'video' ? `/video/${item.slug}` : type === 'image' ? `/image/${item.slug}` : `/article/${item.slug}`;
        const Icon = type === 'video' ? Play : type === 'image' ? ImageIcon : FileText;
        const thumb = item.thumbnailUrl || item.thumbnail || item.imageUrl || '/media/thumbnails/default.png';

        return (
          <a
            key={`${type}-${item.documentId || item.id}`}
            href={url}
            className="group relative bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
          >
            <div className="relative aspect-video bg-slate-950 overflow-hidden">
              <img
                src={thumb}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-2 left-2 p-1.5 bg-slate-900/80 backdrop-blur-md rounded-lg">
                <Icon className="w-3.5 h-3.5 text-indigo-400" />
              </div>
            </div>
            <div className="p-3 space-y-1">
              <h3 className="font-bold text-sm text-white line-clamp-2 group-hover:text-indigo-300 transition-colors">
                {item.title}
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <span className="capitalize">{type}</span>
                <span>•</span>
                <span>{item.creator?.username || item.authorName || 'Omni Creator'}</span>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
