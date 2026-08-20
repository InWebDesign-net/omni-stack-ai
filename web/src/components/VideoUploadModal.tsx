'use client';

import React, { useRef } from 'react';
import { Upload, X, FileVideo } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useUploadManager } from '@/context/UploadContext';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen?: () => void;
  lang?: 'de' | 'en';
  onUploadSuccess?: () => void;
}

export default function VideoUploadModal({
  isOpen,
  onClose,
}: VideoUploadModalProps) {
  const { t, lang } = useApp();
  const { addFiles, openManager } = useUploadManager();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (files: FileList | null) => {
    if (files && files.length > 0) {
      addFiles(files, 'video');
      openManager();
      onClose();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files, 'video');
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
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <FileVideo className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">{t.upload?.uploadVideo || (lang === 'de' ? 'Video hochladen' : 'Upload Video')}</h3>
              <p className="text-xs text-muted">{t.upload?.selectVideosSubtitle || (lang === 'de' ? 'Wähle Videos zum Hochladen aus' : 'Select videos to upload')}</p>
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
          className="border-2 border-dashed border-subtle bg-surface hover:border-indigo-500/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,.mp4,.mov,.mkv,.webm,.avi,.m4v,.ts,.flv,.wmv"
            multiple
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files)}
          />
          <Upload className="h-8 w-8 text-indigo-400 mb-3" />
          <h4 className="text-sm font-bold text-white mb-1">{t.upload?.dragVideosHere || (lang === 'de' ? 'Video-Dateien hier hineinziehen' : 'Drag & drop video files here')}</h4>
          <p className="text-xs text-[#9ba4bf]">{t.upload?.orClickVideos || (lang === 'de' ? 'oder klicken um Dateien auszuwählen (MP4, MOV, MKV)' : 'or click to select files (MP4, MOV, MKV)')}</p>
        </div>
      </div>
    </div>
  );
}
