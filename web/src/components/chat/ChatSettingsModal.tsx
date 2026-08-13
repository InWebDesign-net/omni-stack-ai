'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Shield } from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatSettingsModal({ isOpen, onClose }: ChatSettingsModalProps) {
  const { currentUser, setCurrentUser } = useApp();

  const [form, setForm] = useState({
    allowDirectMessages: 'everyone',
    soundNotifications: true,
    showOnlineStatus: true,
    showReadReceipts: true,
  });

  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (currentUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        allowDirectMessages: (currentUser as any).allowDirectMessages || 'everyone',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        soundNotifications: (currentUser as any).soundNotifications !== false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        showOnlineStatus: (currentUser as any).showOnlineStatus !== false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        showReadReceipts: (currentUser as any).showReadReceipts !== false,
      });
    }
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const updatedUser = {
      ...currentUser,
      allowDirectMessages: form.allowDirectMessages,
      soundNotifications: form.soundNotifications,
      showOnlineStatus: form.showOnlineStatus,
      showReadReceipts: form.showReadReceipts,
    };

    setCurrentUser(updatedUser);
    setSuccessMsg('Settings saved successfully!');
    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="bg-[#0f0f0f] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold text-lg">Chat Settings & Privacy</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-6 overflow-y-auto">
          {successMsg && (
            <div className="flex items-center gap-2 p-3 bg-green-500/20 text-green-400 rounded-lg text-sm border border-green-500/20">
              <CheckCircle2 className="w-4 h-4" />
              {successMsg}
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-sm font-medium text-white/80">Who can send me Direct Messages?</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 cursor-pointer hover:bg-white/5 transition-colors">
                <input
                  type="radio"
                  name="allowDirectMessages"
                  value="everyone"
                  checked={form.allowDirectMessages === 'everyone'}
                  onChange={(e) => setForm({ ...form, allowDirectMessages: e.target.value })}
                  className="w-4 h-4 text-blue-500 bg-white/5 border-white/20 focus:ring-blue-500 focus:ring-offset-[#0f0f0f]"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Everyone</span>
                  <span className="text-xs text-white/50">Anyone can send you a message</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 cursor-pointer hover:bg-white/5 transition-colors">
                <input
                  type="radio"
                  name="allowDirectMessages"
                  value="subscribers_only"
                  checked={form.allowDirectMessages === 'subscribers_only'}
                  onChange={(e) => setForm({ ...form, allowDirectMessages: e.target.value })}
                  className="w-4 h-4 text-blue-500 bg-white/5 border-white/20 focus:ring-blue-500 focus:ring-offset-[#0f0f0f]"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Subscribers Only</span>
                  <span className="text-xs text-white/50">Only people who subscribe to you can message you</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 cursor-pointer hover:bg-white/5 transition-colors">
                <input
                  type="radio"
                  name="allowDirectMessages"
                  value="nobody"
                  checked={form.allowDirectMessages === 'nobody'}
                  onChange={(e) => setForm({ ...form, allowDirectMessages: e.target.value })}
                  className="w-4 h-4 text-blue-500 bg-white/5 border-white/20 focus:ring-blue-500 focus:ring-offset-[#0f0f0f]"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Nobody</span>
                  <span className="text-xs text-white/50">No one can start a new direct message with you</span>
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/10">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium">Sound Notifications</span>
              <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.soundNotifications ? 'bg-blue-500' : 'bg-white/20'}`}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={form.soundNotifications}
                  onChange={(e) => setForm({ ...form, soundNotifications: e.target.checked })}
                />
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.soundNotifications ? 'translate-x-4' : 'translate-x-1'}`} />
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium">Show Online Status</span>
              <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.showOnlineStatus ? 'bg-blue-500' : 'bg-white/20'}`}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={form.showOnlineStatus}
                  onChange={(e) => setForm({ ...form, showOnlineStatus: e.target.checked })}
                />
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.showOnlineStatus ? 'translate-x-4' : 'translate-x-1'}`} />
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium">Send Read Receipts</span>
              <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.showReadReceipts ? 'bg-blue-500' : 'bg-white/20'}`}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={form.showReadReceipts}
                  onChange={(e) => setForm({ ...form, showReadReceipts: e.target.checked })}
                />
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.showReadReceipts ? 'translate-x-4' : 'translate-x-1'}`} />
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium hover:bg-white/10 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
