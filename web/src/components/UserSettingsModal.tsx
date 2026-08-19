'use client';

import React, { useState, useEffect } from 'react';
import { X, Sliders, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { jsonAuthHeaders } from '@/lib/affinity';
import { ImageUploadField } from '@/components/common/ImageUploadField';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserSettingsModal({ isOpen, onClose }: UserSettingsModalProps) {
  const { currentUser, setCurrentUser, lang, t } = useApp();

  const [form, setForm] = useState({
    username: '',
    handle: '',
    avatarUrl: '',
    bio: '',
  });

  useEffect(() => {
    if (currentUser) {
      setForm({
        username: currentUser.username || '',
        handle: currentUser.handle ? currentUser.handle.replace(/^@/, '') : '',
        avatarUrl: currentUser.avatarUrl || '',
        bio: currentUser.bio || '',
      });
    }
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const normHandle = form.handle.trim().replace(/^@/, '');
    const updatedUser = {
      ...currentUser,
      username: form.username.trim() || currentUser.username,
      handle: `@${normHandle || 'user'}`,
      avatarUrl: form.avatarUrl.trim(),
      bio: form.bio.trim(),
    };

    setCurrentUser(updatedUser);
    try {
      localStorage.setItem('omni_user', JSON.stringify(updatedUser));
      await fetch('/api/profile', {
        method: 'POST',
        headers: {
          ...jsonAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedUser),
      });
    } catch (e) {}

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#0d1528] border border-white/10 max-w-lg w-full rounded-3xl p-7 relative flex flex-col gap-5 shadow-2xl animate-fadeInUp">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 text-[#5c657d] hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[#44e2cd]/10 border border-[#44e2cd]/20 flex items-center justify-center">
            <Sliders className="h-5 w-5 text-[#44e2cd]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">
              {t.settings.title}
            </h2>
            <p className="text-xs text-[#5c657d]">
              {t.settings.subtitle}
            </p>
          </div>
        </div>

        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-[11px] font-semibold text-[#9ba4bf] uppercase tracking-wider">
              {t.settings.usernameLabel}
            </label>
            <input
              id="username"
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="z.B. Max Mustermann"
              className="bg-[#080e1e] border border-white/8 focus:border-[#8083ff]/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="handle" className="text-[11px] font-semibold text-[#9ba4bf] uppercase tracking-wider">
              {t.settings.handleLabel}
            </label>
            <div className="flex items-center bg-[#080e1e] border border-white/8 focus-within:border-[#8083ff]/50 rounded-xl px-4 py-3 text-sm text-white">
              <span className="text-[#8083ff] font-mono font-bold mr-1">@</span>
              <input
                id="handle"
                type="text"
                value={form.handle}
                onChange={(e) => setForm({ ...form, handle: e.target.value })}
                placeholder="maxtech"
                className="bg-transparent w-full focus:outline-none text-white font-mono"
              />
            </div>
          </div>

          <ImageUploadField
            label={t.settings.avatarLabel}
            value={form.avatarUrl}
            onChange={(newUrl) => setForm((prev) => ({ ...prev, avatarUrl: newUrl }))}
            rounded
            folder="avatars"
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="bio" className="text-[11px] font-semibold text-[#9ba4bf] uppercase tracking-wider">
              {t.settings.bioLabel}
            </label>
            <textarea
              id="bio"
              rows={3}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder={t.settings.bioPlaceholder}
              className="bg-[#080e1e] border border-white/8 focus:border-[#8083ff]/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            className="mt-2 bg-[#44e2cd] hover:bg-[#34c4b2] text-[#080e1e] font-extrabold py-3.5 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-[#44e2cd]/20 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{t.settings.save}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
