'use client';

import React, { useState } from 'react';
import { Image as ImageIcon, Settings } from 'lucide-react';
import Image from 'next/image';

interface UserImagesTabProps {
  images: any[];
  slug: string;
  t?: any;
  isOwner?: boolean;
  onEditImage?: (image: any) => void;
}

function ImageItemCard({
  img,
  isOwner,
  onEditImage,
}: {
  img: any;
  isOwner?: boolean;
  onEditImage?: (image: any) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const rawThumb = img.thumbnailUrl || img.imageUrl;
  const hasThumb = Boolean(rawThumb && typeof rawThumb === 'string' && rawThumb.trim() !== '' && !imgError);

  return (
    <a
      href={`/image/${img.slug}`}
      className="group relative aspect-square bg-slate-900 rounded-xl overflow-hidden border border-slate-800 hover:border-teal-500/50 transition-all block"
    >
      {hasThumb ? (
        <Image
          src={rawThumb}
          alt={img.title || 'Image'}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-tr from-teal-950 via-emerald-950 to-slate-900 flex items-center justify-center">
          <ImageIcon className="w-10 h-10 text-teal-400/40" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {isOwner && onEditImage && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEditImage(img);
          }}
          title="Bild bearbeiten"
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md text-slate-300 hover:text-teal-300 hover:bg-slate-800 border border-white/10 transition-all cursor-pointer z-10"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-xs font-semibold text-white truncate">{img.title}</p>
      </div>
    </a>
  );
}

export function UserImagesTab({ images, slug, t, isOwner, onEditImage }: UserImagesTabProps) {
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
      {images.map((img, idx) => (
        <ImageItemCard
          key={img.documentId || img.id || img.slug || idx}
          img={img}
          isOwner={isOwner}
          onEditImage={onEditImage}
        />
      ))}
    </div>
  );
}
