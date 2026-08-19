'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { UploadCloud, X, Loader2, ImagePlus, Trash2, AlertCircle } from 'lucide-react';
import { jsonAuthHeaders } from '@/lib/affinity';

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  description?: string;
  rounded?: boolean; // If true, displays circular preview (for avatar)
  aspectRatio?: 'square' | 'video' | 'banner';
  folder?: string;
}

export function ImageUploadField({
  value,
  onChange,
  label,
  description,
  rounded = false,
  aspectRatio = 'square',
  folder = 'avatars',
}: ImageUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadFile = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Bitte wähle eine gültige Bilddatei aus (PNG, JPG, WEBP, GIF).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Das Bild darf maximal 10 MB groß sein.');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const res = await fetch('/api/upload/direct', {
        method: 'POST',
        headers: jsonAuthHeaders(),
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload fehlgeschlagen');
      }

      if (data.url) {
        onChange(data.url);
      }
    } catch (err: any) {
      console.error('Image upload error:', err);
      setError(err.message || 'Fehler beim Hochladen des Bildes');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const aspectClass =
    aspectRatio === 'video'
      ? 'aspect-video w-full max-w-md'
      : aspectRatio === 'banner'
      ? 'aspect-[3/1] w-full'
      : rounded
      ? 'w-24 h-24 sm:w-28 sm:h-28 rounded-full'
      : 'w-24 h-24 sm:w-28 sm:h-28 rounded-2xl';

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-[11px] font-semibold text-[#9ba4bf] uppercase tracking-wider">
          {label}
        </label>
      )}

      {error && (
        <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* When Image exists: Show Preview ONLY + Remove Button */}
      {value ? (
        <div className="flex items-center gap-4">
          <div className={`relative group overflow-hidden border-2 border-[#44e2cd]/40 bg-slate-950 shadow-xl shrink-0 ${aspectClass}`}>
            <Image
              src={value}
              alt="Vorschau"
              className={`w-full h-full object-cover ${rounded ? 'rounded-full' : 'rounded-2xl'}`}
              width={128}
              height={128}
              unoptimized
            />
            {/* Hover overlay with Remove button */}
            <div className={`absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center ${rounded ? 'rounded-full' : 'rounded-2xl'}`}>
              <button
                type="button"
                onClick={handleRemove}
                title="Bild entfernen"
                aria-label="Bild entfernen"
                className="p-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white transition-all transform scale-90 group-hover:scale-100 shadow-lg cursor-pointer"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={handleRemove}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer w-fit"
            >
              <X className="w-3.5 h-3.5" />
              <span>Bild entfernen</span>
            </button>
            <span className="text-[11px] text-slate-400">
              {rounded ? 'Entfernt den aktuellen Avatar' : 'Entfernt das aktuelle Bild'}
            </span>
          </div>
        </div>
      ) : (
        /* When Image is empty: Show Dropzone / File Picker */
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-4 sm:p-6 transition-all flex flex-col items-center justify-center text-center gap-2 cursor-pointer ${
            dragActive
              ? 'border-[#44e2cd] bg-[#44e2cd]/10 scale-[1.01]'
              : 'border-slate-800 hover:border-slate-700 bg-slate-950/60 hover:bg-slate-900/60'
          } ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            onChange={handleFileSelect}
            className="hidden"
          />

          {isUploading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#44e2cd]" />
              <span className="text-xs text-slate-300 font-medium">Bild wird hochgeladen...</span>
            </div>
          ) : (
            <>
              <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <ImagePlus className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200">
                  Klicken zum Auswählen <span className="font-normal text-slate-400">oder Bild hierher ziehen</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {description || 'PNG, JPG, WEBP oder GIF (max. 10MB)'}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
