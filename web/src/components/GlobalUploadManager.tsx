'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  Upload,
  X,
  FileVideo,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Film,
  Play,
  Trash2,
  Maximize2,
  Minimize2,
  Sparkles,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useUploadManager, UploadTask } from '@/context/UploadContext';

export default function GlobalUploadManager() {
  const { t } = useApp();
  const {
    tasks,
    isManagerOpen,
    isMinimized,
    openManager,
    closeManager,
    setIsMinimized,
    addFiles,
    retryTask,
    removeTask,
    updateTaskMediaType,
    clearCompleted,
  } = useUploadManager();

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (tasks.length === 0 && !isManagerOpen) return null;

  const activeTasks = tasks.filter((t) => t.status === 'uploading' || t.status === 'processing' || t.status === 'queued');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const getItemDetailUrl = (task: UploadTask) => {
    if (!task.slug) return null;
    if (task.mediaType === 'image') return `/image/${task.slug}`;
    if (task.mediaType === 'short') return `/video/${task.slug}`;
    return `/video/${task.slug}`;
  };

  // Minimized Bar Bottom Right
  if (isMinimized || (!isManagerOpen && tasks.length > 0)) {
    return (
      <div
        onClick={openManager}
        style={{ bottom: `calc(1.25rem + var(--footer-overlap, 0px) + var(--chat-dock-height, 0px))` }} className="fixed right-5 z-[9999] bg-surface border border-indigo-500/40 rounded-2xl p-4 shadow-2xl flex items-center gap-3 cursor-pointer hover:border-indigo-500 transition-all animate-fadeIn"
      >
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
            {activeTasks.length > 0 ? (
              <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-teal-400" />
            )}
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-primary">
            {activeTasks.length > 0
              ? `${activeTasks.length} ${t.upload?.processing || 'Uploads in Arbeit...'}`
              : `${completedTasks.length} ${t.upload?.completedMin || 'Uploads abgeschlossen'}`}
          </span>
          <span className="text-[10px] text-muted">
            {t.upload?.clickToOpenManager || 'Klicken zum Öffnen des Managers'}
          </span>
        </div>
        <Maximize2 className="h-4 w-4 text-indigo-400 ml-2" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-fadeIn" onClick={closeManager} />

      {/* Canvas */}
      <div
        className="relative w-full max-w-2xl bg-base border border-subtle rounded-3xl p-6 shadow-2xl z-50 flex flex-col gap-5 max-h-[90vh] overflow-hidden animate-scaleIn font-sans"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-teal-400 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-surface rounded-[14px] flex items-center justify-center">
                <Upload className="h-5 w-5 text-teal-400" />
              </div>
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-extrabold text-primary leading-tight">
                {t.upload?.managerTitle || 'Medien-Upload Manager'}
              </h3>
              <p className="text-xs text-muted">
                {t.upload?.managerSubtitle || 'Zentraler Upload für Videos, Shorts & Bilder (WebP + Converter)'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              aria-label="Minimieren"
              title="Minimieren"
              className="p-2 rounded-xl text-muted hover:text-primary hover:bg-surface-raised transition-colors"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
            <button
              onClick={closeManager}
              aria-label={t.common?.close || 'Schließen'}
              title={t.common?.close || 'Schließen'}
              className="p-2 rounded-xl text-muted hover:text-primary hover:bg-surface-raised transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-subtle bg-surface/60 hover:border-indigo-500/50 hover:bg-surface'
          }`}
        >
          <input
            ref={fileInputRef}
            id="global-media-file-upload-input"
            aria-label="Medien-Dateien auswählen"
            type="file"
            accept="video/*,image/*,.mp4,.mov,.avi,.mkv,.webm,.ts,.jpg,.jpeg,.png,.webp,.gif"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-surface flex items-center justify-center">
              <Film className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="p-2.5 rounded-xl bg-surface flex items-center justify-center">
              <ImageIcon className="h-5 w-5 text-teal-400" />
            </div>
          </div>
          <h4 className="text-sm font-bold text-primary mb-0.5">
            {t.upload?.dragDropLabel || 'Medien hier hineinziehen oder klicken'}
          </h4>
          <p className="text-xs text-muted max-w-sm">
            {t.upload?.supportedFormats || 'Unterstützt MP4, MKV, MOV, WebM (Videos & Shorts) sowie JPG, PNG, WebP (Bilder)'}
          </p>
        </div>

        {/* Tasks List */}
        {tasks.length > 0 && (
          <div className="flex flex-col gap-3 overflow-y-auto pr-1 max-h-64 custom-scrollbar">
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">
                {t.upload?.activeList || 'Aktive Uploads & Warteschlange'} ({tasks.length})
              </span>
              <button
                onClick={clearCompleted}
                disabled={completedTasks.length === 0}
                className="text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-40 transition-colors font-medium"
              >
                {t.upload?.clearCompleted || 'Abgeschlossene bereinigen'}
              </button>
            </div>

            {tasks.map((task) => {
              const detailUrl = getItemDetailUrl(task);

              return (
                <div
                  key={task.id}
                  className="bg-surface border border-subtle rounded-2xl p-4 flex flex-col gap-3 transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Info & Type badge */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-surface-raised border border-subtle flex items-center justify-center shrink-0">
                        {task.mediaType === 'image' ? (
                          <ImageIcon className="h-4.5 w-4.5 text-teal-400" />
                        ) : task.mediaType === 'short' ? (
                          <Film className="h-4.5 w-4.5 text-rose-400" />
                        ) : (
                          <Play className="h-4.5 w-4.5 text-indigo-400" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-bold text-primary truncate" title={task.title}>
                          {task.title}
                        </span>
                        <span className="text-[10px] font-mono text-faint truncate">
                          {(task.file.size / (1024 * 1024)).toFixed(1)} MB • {task.file.name}
                        </span>
                      </div>
                    </div>

                    {/* Actions on right: View Link / Retry / Delete */}
                    <div className="flex items-center gap-2 shrink-0">
                      {task.status === 'completed' && detailUrl && (
                        <Link
                          href={detailUrl}
                          onClick={closeManager}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>{t.upload?.viewEntry || 'Beitrag ansehen'}</span>
                        </Link>
                      )}

                      {task.status === 'error' && (
                        <button
                          type="button"
                          onClick={() => retryTask(task.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-semibold transition-all shadow-sm"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>{t.upload?.retry || 'Wiederholen'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => removeTask(task.id)}
                        aria-label={t.upload?.dismiss || 'Entfernen'}
                        title={t.upload?.dismiss || 'Entfernen'}
                        className="p-1.5 rounded-lg text-faint hover:text-red-400 hover:bg-surface-raised transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar & Status Text */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-medium">
                        {task.status === 'queued' && (
                          <span className="text-muted">{t.upload?.queued || 'Eingereiht'}</span>
                        )}
                        {task.status === 'uploading' && (
                          <span className="text-indigo-400 flex items-center gap-1.5">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {t.upload?.uploading || 'Lädt hoch'} {task.progress}%
                          </span>
                        )}
                        {task.status === 'processing' && (
                          <span className="text-amber-400 flex items-center gap-1.5 font-semibold">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {task.mediaType === 'image' ? 'WebP Konvertierung & Wasserzeichen...' : (t.upload?.transcoding || 'HLS Transcoding...')}
                          </span>
                        )}
                        {task.status === 'completed' && (
                          <span className="text-teal-400 flex items-center gap-1.5 font-bold">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {/* Uploads start private, so "published" would be a
                                lie — and the author needs to know the item is
                                not visible to anyone else yet. */}
                            {t.upload?.completedPrivate || 'Fertig — noch privat'}
                          </span>
                        )}
                        {task.status === 'error' && (
                          <span className="text-red-400 flex items-center gap-1.5 font-semibold">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {task.errorMsg || t.upload?.error || 'Fehler beim Upload'}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-muted font-bold">{task.progress}%</span>
                    </div>

                    <div className="w-full h-2 bg-base rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          task.status === 'completed'
                            ? 'bg-teal-400'
                            : task.status === 'error'
                            ? 'bg-red-500'
                            : task.status === 'processing'
                            ? 'bg-gradient-to-r from-indigo-500 to-amber-400 animate-pulse'
                            : 'bg-indigo-500'
                        }`}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
