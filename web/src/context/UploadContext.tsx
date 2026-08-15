'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
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
}

interface UploadContextType {
  tasks: UploadTask[];
  isManagerOpen: boolean;
  isMinimized: boolean;
  openManager: () => void;
  closeManager: () => void;
  setIsMinimized: (val: boolean) => void;
  addFiles: (files: FileList | File[], forceMediaType?: 'video' | 'short' | 'image') => void;
  removeTask: (id: string) => void;
  updateTaskTitle: (id: string, newTitle: string) => void;
  updateTaskMediaType: (id: string, mediaType: 'video' | 'short' | 'image') => void;
  clearCompleted: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB

export function UploadProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useApp();
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const openManager = () => {
    setIsManagerOpen(true);
    setIsMinimized(false);
  };

  const closeManager = () => {
    setIsManagerOpen(false);
  };

  const addFiles = (files: FileList | File[], forceMediaType?: 'video' | 'short' | 'image') => {
    const newTasks: UploadTask[] = [];

    Array.from(files).forEach((file) => {
      const isVideo = forceMediaType === 'video' || forceMediaType === 'short' || file.type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|ts|m4v|flv|wmv|mpg|mpeg|3gp|m2ts|mts)$/i.test(file.name);
      const isImage = forceMediaType === 'image' || file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|tiff|bmp|svg|heic|avif)$/i.test(file.name);

      if (!isVideo && !isImage && !forceMediaType) return;

      const detectedType: 'video' | 'image' = isImage && forceMediaType !== 'video' ? 'image' : 'video';
      const finalType = forceMediaType || detectedType;

      const rawName = file.name.replace(/\.[^/.]+$/, '');
      const cleanTitle = rawName
        .replace(/[-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

      const defaultTags = finalType === 'image'
        ? ['Architektur', 'Fotografie', 'Bild']
        : ['Wissenschaft', 'Technologie', 'Video'];

      const task: UploadTask = {
        id: `upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        title: cleanTitle,
        tags: defaultTags,
        mediaType: finalType,
        progress: 0,
        status: 'queued',
      };

      newTasks.push(task);
    });

    if (newTasks.length > 0) {
      setTasks((prev) => [...prev, ...newTasks]);
      setIsManagerOpen(true);
      setIsMinimized(false);
      // Start processing queued tasks
      setTimeout(() => processQueue(newTasks), 100);
    }
  };

  const processQueue = (newTasks: UploadTask[]) => {
    newTasks.forEach((task) => {
      startChunkedUpload(task);
    });
  };

  const startChunkedUpload = async (task: UploadTask) => {
    const { id, file, title, tags, mediaType } = task;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const jwt = typeof window !== 'undefined' ? localStorage.getItem('omni_jwt') : null;

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'uploading', progress: 0 } : t))
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

      try {
        const headers: Record<string, string> = {};
        if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

        const res = await fetch('/api/upload/chunk', {
          method: 'POST',
          headers,
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Chunk ${chunkIndex + 1} upload failed`);
        }

        const data = await res.json();
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
      } catch (err: any) {
        console.error(`Error uploading task ${id}:`, err);
        setTasks((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, status: 'error', errorMsg: err.message || 'Upload failed' } : t
          )
        );
        break;
      }
    }
  };

  const pollProcessingStatus = (taskId: string, slug: string, mediaType: string) => {
    let attempts = 0;
    const isImage = mediaType === 'image';
    const pollEndpoint = isImage ? '/api/image/list' : '/api/strapi-feed';

    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(isImage ? `${pollEndpoint}?includeProcessing=true&locale=*&q=${slug}` : pollEndpoint, {
          method: isImage ? 'GET' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          ...(isImage ? {} : { body: JSON.stringify({ targetSlug: slug }) }),
        });

        if (res.ok) {
          const json = await res.json();
          const list = json?.data || json?.feed || [];
          const item = list.find((i: any) => i.slug === slug || i.documentId === slug) || list[0];
          if (item && item.isProcessing === false) {
            setTasks((prev) =>
              prev.map((t) => (t.id === taskId ? { ...t, status: 'completed' } : t))
            );
            clearInterval(interval);
          }
        }
      } catch (e) {}

      if (attempts > 60) {
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

  const updateTaskMediaType = (id: string, mediaType: 'video' | 'short' | 'image') => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, mediaType } : t)));
  };

  const clearCompleted = () => {
    setTasks((prev) => prev.filter((t) => t.status !== 'completed'));
  };

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
        removeTask,
        updateTaskTitle,
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
  addFiles: () => {},
  removeTask: () => {},
  updateTaskTitle: () => {},
  updateTaskMediaType: () => {},
  clearCompleted: () => {},
};

export function useUploadManager() {
  const context = useContext(UploadContext);
  return context || fallbackUploadManager;
}
