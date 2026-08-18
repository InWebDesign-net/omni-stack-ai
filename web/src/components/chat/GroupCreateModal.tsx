'use client';

import React, { useState } from 'react';
import { Users, Plus, X } from 'lucide-react';

interface GroupCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  onNavigateToGroup: (groupId: string) => void;
  t?: any;
}

export function GroupCreateModal({ isOpen, onClose, onCreate, onNavigateToGroup, t }: GroupCreateModalProps) {
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    setCreating(true);
    try {
      await onCreate(groupName.trim());
      setGroupName('');
      onClose();
    } catch (e) {
      console.error('Failed to create group:', e);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            {t?.chat?.createGroup || 'Gruppe erstellen'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1 block">{t?.chat?.groupName || 'Gruppenname'}</label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder={t?.chat?.groupNamePlaceholder || 'z.B. Projekt Alpha...'}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            maxLength={50}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
          >
            {t?.common?.cancel || 'Abbrechen'}
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !groupName.trim()}
            className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {creating ? (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                {t?.chat?.createGroup || 'Erstellen'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
