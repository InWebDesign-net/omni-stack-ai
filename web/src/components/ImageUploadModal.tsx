'use client';

import React, { useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useUploadManager } from '@/context/UploadContext';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageUploadModal({
  isOpen,
  onClose,
}: ImageUploadModalProps) {
  const { t, lang } = useApp();
  const { addFiles, openManager } = useUploadManager();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (files: FileList | null) => {
    if (files && files.length > 0) {
      addFiles(files, 'image');
      openManager();
      onClose();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files, 'image');
      openManager();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md animate-fadeIn" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-base border border-subtle rounded-3xl p-6 shadow-2xl z-50 flex flex-col gap-5 animate-scaleIn font-sans">
        <div className="flex items-center justify-between pb-4 border-b border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
              <ImageIcon className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">{t.upload?.uploadImage || (lang === 'de' ? 'Bilder hochladen' : 'Upload Images')}</h3>
              <p className="text-xs text-muted">{t.upload?.selectImagesSubtitle || (lang === 'de' ? 'Wähle ein oder mehrere Bilder aus' : 'Select one or more images')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t.common?.close || 'Schließen'}
            title={t.common?.close || 'Schließen'}
            className="p-2 rounded-xl text-muted hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-subtle bg-surface hover:border-teal-500/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.svg,.heic,.avif"
            multiple
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files)}
          />
          <Upload className="h-8 w-8 text-teal-400 mb-3" />
          <h4 className="text-sm font-bold text-white mb-1">{t.upload?.dragImagesHere || (lang === 'de' ? 'Bilder hier hineinziehen' : 'Drag & drop images here')}</h4>
          <p className="text-xs text-[#9ba4bf]">{t.upload?.orClickImages || (lang === 'de' ? 'oder klicken um Dateien auszuwählen (JPG, PNG, WebP)' : 'or click to select files (JPG, PNG, WebP)')}</p>
        </div>
      </div>
    </div>
  );
}
