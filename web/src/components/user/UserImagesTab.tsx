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
      className="group relative aspect-square bg-surface rounded-xl overflow-hidden border border-subtle hover:border-teal-500/50 transition-all block"
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
        <div className="w-full h-full bg-gradient-to-tr from-teal-950 via-emerald-950 to-surface flex items-center justify-center">
          <ImageIcon className="w-10 h-10 text-teal-400/40" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {isOwner && onEditImage && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEditImage(img);
          }}
          title="Bild bearbeiten"
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-surface/80 backdrop-blur-md text-muted hover:text-teal-400 hover:bg-surface-raised border border-subtle transition-all cursor-pointer z-10"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-xs font-semibold text-primary truncate">{img.title}</p>
      </div>
    </a>
  );
}

export function UserImagesTab({ images, slug, t, isOwner, onEditImage }: UserImagesTabProps) {
  if (!images || images.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <ImageIcon className="w-12 h-12 mx-auto text-muted" />
        <p className="text-muted">{t?.user?.noImages || 'Keine Bilder vorhanden'}</p>
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
