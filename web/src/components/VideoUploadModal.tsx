'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  X,
  FileVideo,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Film,
  Play,
  Trash2,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export interface VideoUploadTask {
  id: string;
  file: File;
  title: string;
  mediaType: 'video' | 'short';
  progress: number;
  status: 'queued' | 'uploading' | 'processing' | 'completed' | 'error';
  errorMsg?: string;
  slug?: string;
  documentId?: string;
}

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen?: () => void;
  lang?: 'de' | 'en';
  onUploadSuccess?: () => void;
}

const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks

export default function VideoUploadModal({
  isOpen,
  onClose,
  onOpen,
  lang = 'de',
  onUploadSuccess,
}: VideoUploadModalProps) {
  const [tasks, setTasks] = useState<VideoUploadTask[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add files to queue
  const handleFilesAdded = (files: FileList | File[]) => {
    const newTasks: VideoUploadTask[] = [];
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('video/') && !/\.(mp4|mov|avi|mkv|webm|ts|m4v)$/i.test(file.name)) {
        return;
      }
      const rawName = file.name.replace(/\.[^/.]+$/, '');
      const cleanTitle = rawName
        .replace(/[-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

      newTasks.push({
        id: `upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        title: cleanTitle,
        mediaType: 'video',
        progress: 0,
        status: 'queued',
      });
    });

    if (newTasks.length > 0) {
      setTasks((prev) => [...prev, ...newTasks]);
      setIsMinimized(false);
    }
  };

  // Drag and Drop handlers
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
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  // Process next queued task
  useEffect(() => {
    const queuedTask = tasks.find((t) => t.status === 'queued');
    if (queuedTask) {
      uploadFileInChunks(queuedTask);
    }
  }, [tasks]);

  // Upload single file in chunks to /api/upload/chunk
  const uploadFileInChunks = async (task: VideoUploadTask) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: 'uploading', progress: 0 } : t))
    );

    const file = task.file;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadId = task.id;

    try {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('uploadId', uploadId);
        formData.append('chunkIndex', i.toString());
        formData.append('totalChunks', totalChunks.toString());
        formData.append('title', task.title);
        formData.append('mediaType', task.mediaType);
        formData.append('file', chunk, file.name);

        try {
          const storedUserStr = typeof window !== 'undefined' ? localStorage.getItem('omni_user') : null;
          const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
          if (storedUser?.id) {
            formData.append('userId', storedUser.id.toString());
          }
        } catch (e) {}

        const res = await fetch('/api/upload/chunk', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Upload Server Error ${res.status}`);
        }

        const data = await res.json();

        const currentProgress = Math.round(((i + 1) / totalChunks) * 100);

        if (data.isComplete) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === task.id
                ? {
                    ...t,
                    status: 'processing',
                    progress: 100,
                    slug: data.slug,
                    documentId: data.documentId,
                  }
                : t
            )
          );
          if (onUploadSuccess) onUploadSuccess();

          // Poll Strapi status briefly
          pollProcessingStatus(task.id, data.slug);
        } else {
          setTasks((prev) =>
            prev.map((t) => (t.id === task.id ? { ...t, progress: currentProgress } : t))
          );
        }
      }
    } catch (err: any) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, status: 'error', errorMsg: err.message || 'Upload fehlgeschlagen' }
            : t
        )
      );
    }
  };

  // Poll video processing status via internal /api/strapi-feed
  const pollProcessingStatus = (taskId: string, slug: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch('/api/strapi-feed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetSlug: slug }),
        });
        if (res.ok) {
          const json = await res.json();
          const item = json?.feed?.find((i: any) => i.slug === slug || i.documentId === slug) || json?.feed?.[0];
          if (item && item.isProcessing === false) {
            setTasks((prev) =>
              prev.map((t) => (t.id === taskId ? { ...t, status: 'completed' } : t))
            );
            clearInterval(interval);
            if (onUploadSuccess) onUploadSuccess();
          }
        }
      } catch (e) {}

      if (attempts > 60) {
        // Stop polling after 3 minutes, assume background conversion continues
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: 'completed' } : t))
        );
        clearInterval(interval);
      }
    }, 3000);
  };

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const updateTaskTitle = (id: string, newTitle: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, title: newTitle } : t)));
  };

  const updateTaskMediaType = (id: string, mediaType: 'video' | 'short') => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, mediaType } : t)));
  };

  if (!isOpen && tasks.length === 0) return null;

  // Render Minimized Manager Bar if user closed modal during active uploads
  if (!isOpen && tasks.length > 0) {
    const activeTasks = tasks.filter((t) => t.status === 'uploading' || t.status === 'processing');
    const completedTasks = tasks.filter((t) => t.status === 'completed');

    return (
      <div
        onClick={() => {
          if (onOpen) onOpen();
        }}
        className="fixed bottom-5 right-5 z-50 bg-[#0d1528] border border-[#8083ff]/40 rounded-2xl p-4 shadow-2xl flex items-center gap-3 cursor-pointer hover:border-[#8083ff] transition-all animate-bounceIn"
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
              ? `${activeTasks.length} ${lang === 'de' ? 'Video(s) werden verarbeitet...' : 'Video(s) processing...'}`
              : `${completedTasks.length} ${lang === 'de' ? 'Upload(s) fertiggestellt' : 'Upload(s) completed'}`}
          </span>
          <span className="text-[10px] text-[#9ba4bf]">
            {lang === 'de' ? 'Klicken um Manager zu öffnen' : 'Click to open manager'}
          </span>
        </div>
        <Maximize2 className="h-4 w-4 text-[#8083ff] ml-2" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-fadeIn" onClick={onClose} />

      {/* Modal Canvas */}
      <div
        className="relative w-full max-w-2xl bg-[#080e1e] border border-white/10 rounded-3xl p-6 shadow-2xl z-50 flex flex-col gap-5 max-h-[90vh] overflow-hidden animate-scaleIn"
        style={{ boxShadow: '0 20px 50px -10px rgba(8,14,30,0.95), 0 1px 0 rgba(128,131,255,0.2)' }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#8083ff] to-[#44e2cd] p-0.5 flex items-center justify-center shadow-lg shadow-[#8083ff]/20">
              <div className="w-full h-full bg-[#0d1528] rounded-[14px] flex items-center justify-center">
                <Upload className="h-5 w-5 text-[#44e2cd]" />
              </div>
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-extrabold text-white leading-tight">
                {lang === 'de' ? 'Multi-Video Upload Manager' : 'Multi-Video Upload Manager'}
              </h3>
              <p className="text-xs text-[#9ba4bf]">
                {lang === 'de'
                  ? 'Drag & Drop mehrere Videos für automatische Transkodierung'
                  : 'Drag & drop videos for automated transcoding'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#9ba4bf] hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-[#8083ff] bg-[#8083ff]/10 scale-[1.01]'
              : 'border-white/15 bg-[#0d1528]/60 hover:border-[#8083ff]/50 hover:bg-[#0d1528]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,.mp4,.mov,.avi,.mkv,.webm,.ts"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
          />

          <div className="w-14 h-14 rounded-2xl bg-[#162038] border border-white/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <FileVideo className="h-7 w-7 text-[#8083ff]" />
          </div>

          <h4 className="text-sm font-bold text-white mb-1">
            {lang === 'de' ? 'Videos hierher ziehen' : 'Drop video files here'}
          </h4>
          <p className="text-xs text-[#9ba4bf] max-w-sm">
            {lang === 'de'
              ? 'Oder klicken, um Dateien auszuwählen. Unterstüzt MP4, MOV, MKV, WebM (Mehrfachauswahl möglich).'
              : 'Or click to browse files. Supports MP4, MOV, MKV, WebM (Multiple files supported).'}
          </p>
        </div>

        {/* Active Upload Tasks List */}
        {tasks.length > 0 && (
          <div className="flex flex-col gap-3 overflow-y-auto pr-1 max-h-64 custom-scrollbar">
            <span className="text-xs font-bold text-[#9ba4bf] uppercase tracking-wider">
              {lang === 'de' ? 'Upload-Warteschlange & Status' : 'Upload Queue & Status'} ({tasks.length})
            </span>

            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-[#0d1528] border border-white/8 rounded-2xl p-4 flex flex-col gap-3 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  {/* File Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-[#162038] flex items-center justify-center shrink-0">
                      {task.mediaType === 'short' ? (
                        <Film className="h-4.5 w-4.5 text-[#ff6b81]" />
                      ) : (
                        <Play className="h-4.5 w-4.5 text-[#44e2cd]" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <input
                        type="text"
                        value={task.title}
                        onChange={(e) => updateTaskTitle(task.id, e.target.value)}
                        className="bg-transparent text-sm font-bold text-white focus:outline-none border-b border-transparent focus:border-[#8083ff] truncate"
                        placeholder="Titel eingeben..."
                      />
                      <span className="text-[10px] font-mono text-[#5c657d] truncate">
                        {(task.file.size / (1024 * 1024)).toFixed(1)} MB • {task.file.name}
                      </span>
                    </div>
                  </div>

                  {/* Delete Task */}
                  <button
                    type="button"
                    onClick={() => removeTask(task.id)}
                    className="p-1.5 rounded-lg text-[#5c657d] hover:text-red-400 hover:bg-white/5 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Progress Bar & Status Text */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-medium">
                      {task.status === 'queued' && (
                        <span className="text-[#9ba4bf]">{lang === 'de' ? 'In Warteschlange...' : 'Queued...'}</span>
                      )}
                      {task.status === 'uploading' && (
                        <span className="text-[#8083ff] flex items-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {lang === 'de' ? 'Wird hochgeladen...' : 'Uploading...'} {task.progress}%
                        </span>
                      )}
                      {task.status === 'processing' && (
                        <span className="text-[#ffb783] flex items-center gap-1.5 font-semibold">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {lang === 'de' ? '⚙️ LXC Transcoding (HLS/OG/Thumbnails)...' : '⚙️ LXC Transcoding...'}
                        </span>
                      )}
                      {task.status === 'completed' && (
                        <span className="text-[#44e2cd] flex items-center gap-1.5 font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {lang === 'de' ? 'Fertiggestellt & im Feed live!' : 'Completed & live in feed!'}
                        </span>
                      )}
                      {task.status === 'error' && (
                        <span className="text-red-400 flex items-center gap-1.5 font-semibold">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {task.errorMsg || 'Fehler'}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[11px] text-[#9ba4bf] font-bold">{task.progress}%</span>
                  </div>

                  <div className="w-full h-2 bg-[#162038] rounded-full overflow-hidden">
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
