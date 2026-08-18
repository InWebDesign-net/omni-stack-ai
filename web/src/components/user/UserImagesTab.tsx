'use client';

import React from 'react';
import { Play, Image as ImageIcon, FileText, Heart, Info, User } from 'lucide-react';
import Image from 'next/image';

interface UserImagesTabProps {
  images: any[];
  slug: string;
  t?: any;
}

export function UserImagesTab({ images, slug, t }: UserImagesTabProps) {
  if (!images || images.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <ImageIcon className="w-12 h-12 mx-auto text-slate-600" />
        <p className="text-slate-400">{t?.user?.noImages || 'Keine Bilder vorhanden'}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {images.map((img) => (
        <a
          key={img.documentId || img.id}
          href={`/image/${img.slug}`}
          className="group relative aspect-square bg-slate-900 rounded-xl overflow-hidden border border-slate-800 hover:border-indigo-500/50 transition-all"
        >
          <Image
            src={img.thumbnailUrl || img.imageUrl || '/media/thumbnails/default.png'}
            alt={img.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-xs font-semibold text-white truncate">{img.title}</p>
          </div>
        </a>
      ))}
    </div>
  );
}
