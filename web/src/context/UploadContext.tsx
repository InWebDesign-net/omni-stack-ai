'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useApp } from '@/context/AppContext';

export interface UploadTask {
  id: string;
  file: File;
  title: string;
  tags: string[];
  mediaType: 'video' | 'short' | 'image';
  progress: number;
  status: 'queued' | 'uploading' | 'processing' | 'completed' | 'error';
  errorMsg?: string;
  slug?: string;
  documentId?: string;
  onComplete?: (task: UploadTask) => void;
  onError?: (task: UploadTask) => void;
}

export interface AddFilesOptions {
  title?: string;
  tags?: string[];
  onComplete?: (task: UploadTask) => void;
  onError?: (task: UploadTask) => void;
}

interface UploadContextType {
  tasks: UploadTask[];
  isManagerOpen: boolean;
  isMinimized: boolean;
  openManager: () => void;
  closeManager: () => void;
  setIsMinimized: (val: boolean) => void;
  addFiles: (
    files: FileList | File[],
    forceMediaType?: 'video' | 'short' | 'image',
    options?: AddFilesOptions
  ) => string[];
  retryTask: (id: string) => void;
  removeTask: (id: string) => void;
  updateTaskMediaType: (id: string, mediaType: 'video' | 'short' | 'image') => void;
  clearCompleted: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_CHUNK_RETRIES = 3;
const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB

export function UploadProvider({ children }: { children: ReactNode }) {
  const { currentUser, t } = useApp();
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Warn beforeunload when uploads or transcode processing are in flight
  useEffect(() => {
    const hasInFlight = tasks.some(
      (t) => t.status === 'uploading' || t.status === 'processing' || t.status === 'queued'
    );
    if (!hasInFlight) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const msg = t?.upload?.leaveWarning || 'Uploads laufen noch. Möchtest du die Seite wirklich verlassen?';
      e.preventDefault();
      e.returnValue = msg;
      return msg;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [tasks, t?.upload?.leaveWarning]);

  const openManager = useCallback(() => {
    setIsManagerOpen(true);
    setIsMinimized(false);
  }, []);

  const closeManager = useCallback(() => {
    setIsManagerOpen(false);
  }, []);

  const pollProcessingStatus = useCallback((taskId: string, slug: string, mediaType: string) => {
    let attempts = 0;
    const isImage = mediaType === 'image';
    // Both kinds are looked up through `mine`, which takes the creator from the
    // session and passes the user id on to Strapi. The public list and the feed
    // cannot be used here: uploads start private, and neither carries a user
    // identity, so the author's own fresh upload is invisible to both.
    const kind = isImage ? 'image' : 'video';
    const pollUrl = `/api/content/${kind}/mine?slug=${encodeURIComponent(slug)}&pageSize=1`;

    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(pollUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (res.ok) {
          const json = await res.json();
          const list = json?.data || json?.feed || [];
          const item = list.find((i: any) => i.slug === slug || i.documentId === slug) || list[0];
          if (item && item.isProcessing === false) {
            setTasks((prev) =>
              prev.map((t) => {
                if (t.id === taskId) {
                  const completedTask: UploadTask = { ...t, status: 'completed' };
                  t.onComplete?.(completedTask);
                  return completedTask;
                }
                return t;
              })
            );
            clearInterval(interval);
            return;
          }
        }
      } catch (e) {
        console.error('[UploadContext] upload status poll failed:', e);
      }

      if (attempts > 60) {
        setTasks((prev) =>
          prev.map((t) => {
            if (t.id === taskId) {
              const completedTask: UploadTask = { ...t, status: 'completed' };
              t.onComplete?.(completedTask);
              return completedTask;
            }
            return t;
          })
        );
        clearInterval(interval);
      }
    }, 3000);
  }, []);

  const startChunkedUpload = useCallback(async (task: UploadTask) => {
    const { id, file, title, tags, mediaType } = task;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'uploading', progress: 0, errorMsg: undefined } : t))
    );

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append('uploadId', id);
      formData.append('chunkIndex', chunkIndex.toString());
      formData.append('totalChunks', totalChunks.toString());
      formData.append('title', title);
      formData.append('mediaType', mediaType);
      formData.append('tags', JSON.stringify(tags));
      if (currentUser?.id) {
        formData.append('userId', currentUser.id.toString());
      }
      formData.append('file', chunk, file.name);

      let chunkUploaded = false;
      let lastErr: any = null;

      // Transient chunk retry loop
      for (let attempt = 1; attempt <= MAX_CHUNK_RETRIES; attempt++) {
        try {
          // The chunk route identifies the uploader from the session cookie.
          const res = await fetch('/api/upload/chunk', {
            method: 'POST',
            credentials: 'same-origin',
            body: formData,
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Chunk ${chunkIndex + 1} failed (HTTP ${res.status})`);
          }

          const data = await res.json();
          chunkUploaded = true;
          const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);

          setTasks((prev) =>
            prev.map((t) => (t.id === id ? { ...t, progress } : t))
          );

          if (data.isComplete) {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === id
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

            pollProcessingStatus(id, data.slug, mediaType);
          }
          break;
        } catch (err: any) {
          lastErr = err;
          if (attempt < MAX_CHUNK_RETRIES) {
            // Wait with backoff before retrying chunk
            await new Promise((r) => setTimeout(r, attempt * 1000));
          }
        }
      }

      if (!chunkUploaded) {
        console.error(`Error uploading task ${id} at chunk ${chunkIndex + 1}:`, lastErr);
        const errMsg = lastErr?.message || 'Upload failed';
        setTasks((prev) =>
          prev.map((t) => {
            if (t.id === id) {
              const errTask: UploadTask = { ...t, status: 'error', errorMsg: errMsg };
              t.onError?.(errTask);
              return errTask;
            }
            return t;
          })
        );
        return;
      }
    }
  }, [currentUser?.id, pollProcessingStatus]);

  const processQueue = useCallback((newTasks: UploadTask[]) => {
    newTasks.forEach((task) => {
      if (task.status === 'queued') {
        startChunkedUpload(task);
      }
    });
  }, [startChunkedUpload]);

  const addFiles = useCallback((
    files: FileList | File[],
    forceMediaType?: 'video' | 'short' | 'image',
    options?: AddFilesOptions
  ): string[] => {
    const newTasks: UploadTask[] = [];
    const createdIds: string[] = [];

    Array.from(files).forEach((file) => {
      const taskId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      createdIds.push(taskId);

      const isVideoExt = /\.(mp4|mov|avi|mkv|webm|ts|m4v|flv|wmv|mpg|mpeg|3gp|m2ts|mts)$/i.test(file.name);
      const isImageExt = /\.(jpg|jpeg|png|webp|gif|tiff|bmp|svg|heic|avif)$/i.test(file.name);
      const isVideoMime = file.type.startsWith('video/');
      const isImageMime = file.type.startsWith('image/');

      const isVideo = forceMediaType === 'video' || forceMediaType === 'short' || isVideoMime || isVideoExt;
      const isImage = forceMediaType === 'image' || isImageMime || isImageExt;

      let validationError: string | undefined = undefined;

      if (file.size === 0) {
        validationError = t?.upload?.emptyFile || 'Datei ist leer';
      } else if (!isVideo && !isImage && !forceMediaType) {
        validationError = t?.upload?.unsupportedFormat || 'Dateiformat wird nicht unterstützt';
      } else if (isVideo && file.size > MAX_VIDEO_SIZE) {
        validationError = t?.upload?.fileTooLargeVideo || 'Video zu groß (max. 2GB)';
      } else if (isImage && file.size > MAX_IMAGE_SIZE) {
        validationError = t?.upload?.fileTooLargeImage || 'Bild zu groß (max. 50MB)';
      }

      const detectedType: 'video' | 'image' = isImage && forceMediaType !== 'video' && forceMediaType !== 'short' ? 'image' : 'video';
      const finalType = forceMediaType || detectedType;

      const rawName = file.name.replace(/\.[^/.]+$/, '');
      const cleanTitle = options?.title || rawName
        .replace(/[-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

      const defaultTags = options?.tags || (finalType === 'image'
        ? ['Architektur', 'Fotografie', 'Bild']
        : ['Wissenschaft', 'Technologie', 'Video']);

      const task: UploadTask = {
        id: taskId,
        file,
        title: cleanTitle,
        tags: defaultTags,
        mediaType: finalType,
        progress: 0,
        status: validationError ? 'error' : 'queued',
        errorMsg: validationError,
        onComplete: options?.onComplete,
        onError: options?.onError,
      };

      if (validationError) {
        options?.onError?.(task);
      }

      newTasks.push(task);
    });

    if (newTasks.length > 0) {
      setTasks((prev) => [...prev, ...newTasks]);
      setIsManagerOpen(true);
      setIsMinimized(false);

      const validTasks = newTasks.filter((t) => t.status === 'queued');
      if (validTasks.length > 0) {
        setTimeout(() => processQueue(validTasks), 100);
      }
    }

    return createdIds;
  }, [processQueue, t?.upload?.emptyFile, t?.upload?.fileTooLargeImage, t?.upload?.fileTooLargeVideo, t?.upload?.unsupportedFormat]);

  const retryTask = useCallback((id: string) => {
    setTasks((prev) => {
      const target = prev.find((t) => t.id === id);
      if (!target) return prev;

      // Re-validate in case error was validation
      const isVideoExt = /\.(mp4|mov|avi|mkv|webm|ts|m4v|flv|wmv|mpg|mpeg|3gp|m2ts|mts)$/i.test(target.file.name);
      const isImageExt = /\.(jpg|jpeg|png|webp|gif|tiff|bmp|svg|heic|avif)$/i.test(target.file.name);
      const isVideoMime = target.file.type.startsWith('video/');
      const isImageMime = target.file.type.startsWith('image/');
      const isVideo = target.mediaType === 'video' || target.mediaType === 'short' || isVideoMime || isVideoExt;
      const isImage = target.mediaType === 'image' || isImageMime || isImageExt;

      let validationError: string | undefined = undefined;
      if (target.file.size === 0) {
        validationError = t?.upload?.emptyFile || 'Datei ist leer';
      } else if (!isVideo && !isImage) {
        validationError = t?.upload?.unsupportedFormat || 'Dateiformat wird nicht unterstützt';
      } else if (isVideo && target.file.size > MAX_VIDEO_SIZE) {
        validationError = t?.upload?.fileTooLargeVideo || 'Video zu groß (max. 2GB)';
      } else if (isImage && target.file.size > MAX_IMAGE_SIZE) {
        validationError = t?.upload?.fileTooLargeImage || 'Bild zu groß (max. 50MB)';
      }

      const resetTask: UploadTask = {
        ...target,
        status: validationError ? 'error' : 'queued',
        progress: 0,
        errorMsg: validationError,
      };

      if (!validationError) {
        setTimeout(() => startChunkedUpload(resetTask), 50);
      }

      return prev.map((t) => (t.id === id ? resetTask : t));
    });
  }, [startChunkedUpload, t?.upload?.emptyFile, t?.upload?.fileTooLargeImage, t?.upload?.fileTooLargeVideo, t?.upload?.unsupportedFormat]);

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateTaskMediaType = useCallback((id: string, mediaType: 'video' | 'short' | 'image') => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, mediaType } : t)));
  }, []);

  const clearCompleted = useCallback(() => {
    setTasks((prev) => prev.filter((t) => t.status !== 'completed'));
  }, []);

  return (
    <UploadContext.Provider
      value={{
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
      }}
    >
      {children}
    </UploadContext.Provider>
  );
}

const fallbackUploadManager: UploadContextType = {
  tasks: [],
  isManagerOpen: false,
  isMinimized: false,
  openManager: () => {},
  closeManager: () => {},
  setIsMinimized: () => {},
  addFiles: () => [],
  retryTask: () => {},
  removeTask: () => {},
  updateTaskMediaType: () => {},
  clearCompleted: () => {},
};

export function useUploadManager() {
  const context = useContext(UploadContext);
  return context || fallbackUploadManager;
}

