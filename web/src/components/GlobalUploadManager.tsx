'use client';

import React, { useState, useRef } from 'react';
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
    removeTask,
    updateTaskTitle,
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

  // Minimized Bar Bottom Right
  if (isMinimized || (!isManagerOpen && tasks.length > 0)) {
    return (
      <div
        onClick={openManager}
        className="fixed bottom-5 right-5 z-[9999] bg-surface border border-[#8083ff]/40 rounded-2xl p-4 shadow-2xl flex items-center gap-3 cursor-pointer hover:border-[#8083ff] transition-all animate-fadeIn"
        style={{ boxShadow: '0 12px 32px -8px rgba(8,14,30,0.95), 0 1px 0 rgba(128,131,255,0.3)' }}
      >
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-[#8083ff]/20 border border-[#8083ff]/40 flex items-center justify-center">
            {activeTasks.length > 0 ? (
              <Loader2 className="h-5 w-5 text-[#8083ff] animate-spin" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-[#44e2cd]" />
            )}
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-white">
            {activeTasks.length > 0
              ? `${activeTasks.length} ${t.upload?.processing || 'Uploads in Arbeit...'}`
              : `${completedTasks.length} ${t.upload?.completedMin || 'Uploads abgeschlossen'}`}
          </span>
          <span className="text-[10px] text-muted">
            {t.upload?.clickToOpenManager || 'Klicken zum Öffnen des Managers'}
          </span>
        </div>
        <Maximize2 className="h-4 w-4 text-[#8083ff] ml-2" />
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
        style={{ boxShadow: '0 20px 50px -10px rgba(8,14,30,0.95), 0 1px 0 rgba(128,131,255,0.2)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#8083ff] to-[#44e2cd] p-0.5 flex items-center justify-center shadow-lg shadow-[#8083ff]/20">
              <div className="w-full h-full bg-surface rounded-[14px] flex items-center justify-center">
                <Upload className="h-5 w-5 text-[#44e2cd]" />
              </div>
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-extrabold text-white leading-tight">
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
              className="p-2 rounded-xl text-muted hover:text-white hover:bg-white/5 transition-colors"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
            <button
              onClick={closeManager}
              aria-label={t.common?.close || 'Schließen'}
              title={t.common?.close || 'Schließen'}
              className="p-2 rounded-xl text-muted hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-[#8083ff] bg-[#8083ff]/10'
              : 'border-subtle bg-surface/60 hover:border-[#8083ff]/50 hover:bg-surface'
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
              <Film className="h-5 w-5 text-[#8083ff]" />
            </div>
            <div className="p-2.5 rounded-xl bg-surface flex items-center justify-center">
              <ImageIcon className="h-5 w-5 text-[#44e2cd]" />
            </div>
          </div>
          <h4 className="text-sm font-bold text-white mb-0.5">
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
                className="text-xs text-[#8083ff] hover:text-[#c0c1ff] disabled:opacity-40 transition-colors font-medium"
              >
                {t.upload?.clearCompleted || 'Abgeschlossene bereinigen'}
              </button>
            </div>

            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-surface border border-subtle rounded-2xl p-4 flex flex-col gap-3 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Info & Type badge */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0">
                      {task.mediaType === 'image' ? (
                        <ImageIcon className="h-4.5 w-4.5 text-[#44e2cd]" />
                      ) : task.mediaType === 'short' ? (
                        <Film className="h-4.5 w-4.5 text-[#ff6b81]" />
                      ) : (
                        <Play className="h-4.5 w-4.5 text-[#8083ff]" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <input
                        type="text"
                        aria-label="Titel bearbeiten"
                        value={task.title}
                        onChange={(e) => updateTaskTitle(task.id, e.target.value)}
                        className="bg-transparent text-sm font-bold text-white focus:outline-none border-b border-transparent focus:border-[#8083ff] truncate"
                        placeholder={t.upload?.titlePlaceholder || 'Titel eingeben...'}
                      />
                      <span className="text-[10px] font-mono text-faint truncate">
                        {(task.file.size / (1024 * 1024)).toFixed(1)} MB • {task.file.name}
                      </span>
                    </div>
                  </div>

                  {/* Delete Task */}
                  <button
                    type="button"
                    onClick={() => removeTask(task.id)}
                    aria-label="Aufgabe entfernen"
                    title="Aufgabe entfernen"
                    className="p-1.5 rounded-lg text-faint hover:text-red-400 hover:bg-white/5 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Progress Bar & Status Text */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-medium">
                      {task.status === 'queued' && (
                        <span className="text-muted">{t.upload?.queued || 'Eingereiht'}</span>
                      )}
                      {task.status === 'uploading' && (
                        <span className="text-[#8083ff] flex items-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {t.upload?.uploading || 'Lädt hoch'} {task.progress}%
                        </span>
                      )}
                      {task.status === 'processing' && (
                        <span className="text-[#ffb783] flex items-center gap-1.5 font-semibold">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {task.mediaType === 'image' ? 'WebP Konvertierung & Wasserzeichen...' : (t.upload?.transcoding || 'HLS Transcoding...')}
                        </span>
                      )}
                      {task.status === 'completed' && (
                        <span className="text-[#44e2cd] flex items-center gap-1.5 font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {t.upload?.completed || 'Abgeschlossen & Veröffentlicht'}
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

                  <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        task.status === 'completed'
                          ? 'bg-[#44e2cd]'
                          : task.status === 'error'
                          ? 'bg-red-500'
                          : task.status === 'processing'
                          ? 'bg-gradient-to-r from-[#8083ff] to-[#ffb783] animate-pulse'
                          : 'bg-[#8083ff]'
                      }`}
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
