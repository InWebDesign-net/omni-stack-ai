'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { FileText, Plus, X, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { jsonAuthHeaders } from '@/lib/affinity';
import { useApp } from '@/context/AppContext';

interface ArticleCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ArticleCreateModal({ isOpen, onClose }: ArticleCreateModalProps) {
  const router = useRouter();
  const { lang, openAuthModal, currentUser } = useApp();

  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || typeof window === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(lang === 'de' ? 'Bitte gib einen Titel für den Artikel ein.' : 'Please enter a title for the article.');
      return;
    }

    if (!currentUser) {
      openAuthModal();
      return;
    }

    setIsSubmitting(true);

    try {
      // Clean slug generation
      const cleanSlug = trimmedTitle
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9äöüß]+/g, '-')
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/^-+|-+$/g, '') || `artikel-${Date.now()}`;

      const res = await fetch('/api/content/article/settings', {
        method: 'POST',
        headers: {
          ...jsonAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: trimmedTitle,
          slug: cleanSlug,
          visibility: 'private',
          lang: lang || 'de',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Fehler beim Erstellen des Artikels');
      }

      const createdArticle = data.article;
      const targetSlug = createdArticle?.slug || cleanSlug;

      onClose();
      setTitle('');
      router.push(`/article/${targetSlug}?edit=true`);
    } catch (err: any) {
      console.error('Error creating article:', err);
      setError(err.message || 'Fehler beim Erstellen des Artikels');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-raised border border-subtle rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-primary">
                {lang === 'de' ? 'Neuen Artikel erstellen' : 'Create New Article'}
              </h3>
              <p className="text-xs text-muted">
                {lang === 'de' ? 'Gib einen Titel ein, um zu beginnen' : 'Enter a title to get started'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface rounded-xl text-muted hover:text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-primary mb-1.5 block">
              {lang === 'de' ? 'Titel des Beitrags' : 'Article Title'} <span className="text-purple-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              placeholder={
                lang === 'de'
                  ? 'z.B. Wie KI die Zukunft der Softwareentwicklung verändert...'
                  : 'e.g. How AI is transforming software engineering...'
              }
              className="w-full bg-surface border border-subtle rounded-xl px-4 py-2.5 text-sm text-primary placeholder-faint focus:outline-none focus:border-purple-500 transition-all"
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          <div className="p-3 bg-surface border border-subtle rounded-xl text-[11px] text-muted flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <span>
              {lang === 'de'
                ? 'Der Beitrag wird zunächst als "Privat" angelegt. Anschließend öffnet sich direkt der Editor zum Ausgestalten.'
                : 'The post will initially be set to "Private". The editor will open immediately for further customization.'}
            </span>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-surface hover:bg-surface-raised text-muted hover:text-primary border border-subtle rounded-xl text-sm font-medium transition-colors"
              disabled={isSubmitting}
            >
              {lang === 'de' ? 'Abbrechen' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>{lang === 'de' ? 'Artikel erstellen' : 'Create Article'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
