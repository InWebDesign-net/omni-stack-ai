'use client';

import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface CreateFeedItemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateFeedItemModal({ isOpen, onClose }: CreateFeedItemModalProps) {
  const { currentUser, openVideoUploadModal, t } = useApp();
  const [form, setForm] = useState({
    title: '',
    summary: '',
    content: '',
    mediaType: 'article' as 'video' | 'pdf' | 'article' | 'short',
    tags: 'Community, Tech',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.mediaType === 'video') {
      onClose();
      openVideoUploadModal();
      return;
    }

    setIsSubmitting(true);
    try {
      const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || '';
      const cleanSlug = form.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `post-${Date.now()}`;
      
      const payload: any = {
        title: form.title,
        slug: cleanSlug,
        summary: form.summary || form.title,
        content: form.content || form.summary || form.title,
        mediaType: form.mediaType,
        thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80',
        mediaUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80',
        tags: form.tags.split(',').map((t) => t.trim()),
      };

      if (currentUser?.id) {
        payload.author = currentUser.id;
      }

      await fetch(`${strapiUrl}/api/feed-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload }),
      });
    } catch (e) {}

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#0d1528] border border-white/10 max-w-xl w-full rounded-3xl p-7 relative flex flex-col gap-5 shadow-2xl animate-fadeInUp">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#5c657d] hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[#ffb783]/10 border border-[#ffb783]/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-[#ffb783]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">{t.create.postTitle}</h2>
            <p className="text-xs text-[#5c657d]">{t.create.subtitle.replace('{handle}', currentUser?.handle || '@community')}</p>
          </div>
        </div>

        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-[#9ba4bf] uppercase tracking-wider">{t.create.titleLabel}</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={t.create.titlePlaceholder}
              className="bg-[#080e1e] border border-white/8 focus:border-[#8083ff]/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-[#9ba4bf] uppercase tracking-wider">{t.create.mediaTypeLabel}</label>
              <select
                value={form.mediaType}
                onChange={(e) => setForm({ ...form, mediaType: e.target.value as any })}
                className="bg-[#080e1e] border border-white/8 focus:border-[#8083ff]/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none cursor-pointer"
              >
                <option value="article">{t.create.mediaArticle}</option>
                <option value="video">{t.create.mediaVideo}</option>
                <option value="pdf">{t.create.mediaPdf}</option>
                <option value="short">{t.create.mediaShort}</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-[#9ba4bf] uppercase tracking-wider">{t.create.tagsLabel}</label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder={t.create.tagsPlaceholder}
                className="bg-[#080e1e] border border-white/8 focus:border-[#8083ff]/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-[#9ba4bf] uppercase tracking-wider">{t.create.summaryLabel}</label>
            <textarea
              rows={2}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder={t.create.summaryPlaceholder}
              className="bg-[#080e1e] border border-white/8 focus:border-[#8083ff]/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-[#9ba4bf] uppercase tracking-wider">{t.create.contentLabel}</label>
            <textarea
              rows={4}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder={t.create.contentPlaceholder}
              className="bg-[#080e1e] border border-white/8 focus:border-[#8083ff]/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 bg-[#8083ff] hover:bg-[#6b6eff] active:scale-[0.98] disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-[#8083ff]/30 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{t.create.submit}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
