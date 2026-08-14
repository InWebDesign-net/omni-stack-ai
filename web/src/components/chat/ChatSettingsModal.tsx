'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, Shield } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useChat } from '@/context/ChatContext';

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatSettingsModal({ isOpen, onClose }: ChatSettingsModalProps) {
  const { currentUser, setCurrentUser, t } = useApp();
  const {
    userPrivacySetting,
    updateUserPrivacySetting,
    soundEnabled,
    setSoundEnabled,
    showOnlineStatus,
    setShowOnlineStatus,
    showReadReceipts,
    setShowReadReceipts,
  } = useChat();

  const [form, setForm] = useState({
    allowDirectMessages: userPrivacySetting,
    soundNotifications: soundEnabled,
    showOnlineStatus: showOnlineStatus,
    showReadReceipts: showReadReceipts,
  });

  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    setForm({
      allowDirectMessages: userPrivacySetting,
      soundNotifications: soundEnabled,
      showOnlineStatus: showOnlineStatus,
      showReadReceipts: showReadReceipts,
    });
  }, [userPrivacySetting, soundEnabled, showOnlineStatus, showReadReceipts, isOpen]);

  if (!isOpen || typeof window === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    await updateUserPrivacySetting(form.allowDirectMessages as any);
    setSoundEnabled(form.soundNotifications);
    setShowOnlineStatus(form.showOnlineStatus);
    setShowReadReceipts(form.showReadReceipts);

    const updatedUser = {
      ...currentUser,
      allowDirectMessages: form.allowDirectMessages,
      soundNotifications: form.soundNotifications,
      showOnlineStatus: form.showOnlineStatus,
      showReadReceipts: form.showReadReceipts,
    };

    setCurrentUser(updatedUser);
    setSuccessMsg(t.common.save + ' ✓');
    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 1200);
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div 
        className="bg-[#0b0f19] border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-indigo-400" />
            <h2 className="font-bold text-lg text-white">{t.chat?.settingsTitle || 'Chat-Einstellungen & Privatsphäre'}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          {successMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
              {successMsg}
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-200">
              {t.chat?.allowDirectMessages || 'Wer darf mir Direktnachrichten senden?'}
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-800 cursor-pointer hover:bg-slate-900/60 transition-colors">
                <input
                  type="radio"
                  name="allowDirectMessages"
                  value="everyone"
                  checked={form.allowDirectMessages === 'everyone'}
                  onChange={(e) => setForm({ ...form, allowDirectMessages: e.target.value as any })}
                  className="w-4 h-4 text-indigo-500 bg-slate-950 border-slate-700 focus:ring-indigo-500"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">{t.chat?.everyone || 'Alle Nutzer'}</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-800 cursor-pointer hover:bg-slate-900/60 transition-colors">
                <input
                  type="radio"
                  name="allowDirectMessages"
                  value="subscribers_only"
                  checked={form.allowDirectMessages === 'subscribers_only'}
                  onChange={(e) => setForm({ ...form, allowDirectMessages: e.target.value as any })}
                  className="w-4 h-4 text-indigo-500 bg-slate-950 border-slate-700 focus:ring-indigo-500"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">{t.chat?.subscribersOnly || 'Nur Abonnenten'}</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-800 cursor-pointer hover:bg-slate-900/60 transition-colors">
                <input
                  type="radio"
                  name="allowDirectMessages"
                  value="nobody"
                  checked={form.allowDirectMessages === 'nobody'}
                  onChange={(e) => setForm({ ...form, allowDirectMessages: e.target.value as any })}
                  className="w-4 h-4 text-indigo-500 bg-slate-950 border-slate-700 focus:ring-indigo-500"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">{t.chat?.nobody || 'Niemand (Chats deaktiviert)'}</span>
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-800">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm font-semibold text-white block">{t.chat?.soundNotifications || 'Sound-Benachrichtigungen'}</span>
              </div>
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.soundNotifications ? 'bg-indigo-600' : 'bg-slate-800'}`}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={form.soundNotifications}
                  onChange={(e) => setForm({ ...form, soundNotifications: e.target.checked })}
                />
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.soundNotifications ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm font-semibold text-white block">{t.chat?.onlineStatus || 'Online-Status anzeigen'}</span>
              </div>
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.showOnlineStatus ? 'bg-indigo-600' : 'bg-slate-800'}`}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={form.showOnlineStatus}
                  onChange={(e) => setForm({ ...form, showOnlineStatus: e.target.checked })}
                />
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.showOnlineStatus ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm font-semibold text-white block">{t.chat?.readReceipts || 'Lesebestätigungen anzeigen'}</span>
              </div>
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.showReadReceipts ? 'bg-indigo-600' : 'bg-slate-800'}`}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={form.showReadReceipts}
                  onChange={(e) => setForm({ ...form, showReadReceipts: e.target.checked })}
                />
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.showReadReceipts ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors shadow-lg shadow-indigo-600/20"
            >
              {t.common.save}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
