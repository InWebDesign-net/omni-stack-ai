'use client';

import React, { useState } from 'react';
import { X, Save, Trash2, AlertTriangle } from 'lucide-react';

interface ImageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; summary: string; tags: string[]; visibility: string }) => Promise<void>;
  onDelete: (hardDelete: boolean) => Promise<void>;
  image: any;
  t?: any;
}

export function ImageEditModal({ isOpen, onClose, onSave, onDelete, image, t }: ImageEditModalProps) {
  const [title, setTitle] = useState(image?.title || '');
  const [summary, setSummary] = useState(image?.summary || '');
  const [tags, setTags] = useState(Array.isArray(image?.tags) ? image.tags.join(', ') : '');
  const [visibility, setVisibility] = useState(image?.visibility || 'public');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        summary,
        tags: tags.split(',').map((tag: string) => tag.trim()).filter(Boolean),
        visibility,
      });
      onClose();
    } catch (e) {
      console.error('Failed to save image:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (hardDelete: boolean) => {
    setDeleting(true);
    try {
      await onDelete(hardDelete);
      onClose();
    } catch (e) {
      console.error('Failed to delete image:', e);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-white">{t?.images?.editImage || 'Bild bearbeiten'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {!showDeleteConfirm ? (
          <>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t?.common?.title || 'Titel'}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t?.common?.summary || 'Zusammenfassung'}</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t?.common?.tags || 'Tags (kommagetrennt)'}</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t?.common?.visibility || 'Sichtbarkeit'}</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
              >
                <option value="public">{t?.common?.public || 'Öffentlich'}</option>
                <option value="private">{t?.common?.private || 'Privat'}</option>
              </select>
            </div>

            <div className="flex gap-2 pt-4 border-t border-slate-800">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
              >
                {t?.common?.cancel || 'Abbrechen'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !title.trim()}
                className="flex-1 py-2.5 px-4 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {t?.common?.save || 'Speichern'}
                  </>
                )}
              </button>
            </div>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-2 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {t?.images?.deleteImage || 'Bild löschen'}
            </button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-rose-300">{t?.images?.deleteConfirm || 'Wirklich löschen?'}</p>
                <p className="text-xs text-slate-400">{t?.images?.deleteWarning || 'Diese Aktion kann nicht rückgängig gemacht werden.'}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
              >
                {t?.common?.cancel || 'Abbrechen'}
              </button>
              <button
                onClick={() => handleDelete(false)}
                disabled={deleting}
                className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {t?.images?.softDelete || 'Soft Delete'}
              </button>
              <button
                onClick={() => handleDelete(true)}
                disabled={deleting}
                className="flex-1 py-2.5 px-4 bg-rose-500 hover:bg-rose-400 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {deleting ? '...' : t?.images?.hardDelete || 'Endgültig löschen'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
