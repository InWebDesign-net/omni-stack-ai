'use client';

import React, { useState } from 'react';
import { Plus, X, Save, Eye } from 'lucide-react';
import { BlockEditor } from './BlockEditor';

interface ArticleCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: any) => Promise<void>;
  t?: any;
}

export function ArticleCreateModal({ isOpen, onClose, onCreate, t }: ArticleCreateModalProps) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [blocks, setBlocks] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onCreate({
        title: title.trim(),
        summary,
        thumbnail,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        visibility,
        blocks,
      });
      onClose();
      // Reset form
      setTitle('');
      setSummary('');
      setThumbnail('');
      setTags('');
      setBlocks([]);
    } catch (e) {
      console.error('Failed to create article:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-400" />
            {t?.articles?.createArticle || 'Artikel erstellen'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Title */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">{t?.common?.title || 'Titel'}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t?.articles?.titlePlaceholder || 'Artikel-Titel...'}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Summary */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">{t?.common?.summary || 'Zusammenfassung'}</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={t?.articles?.summaryPlaceholder || 'Kurze Beschreibung...'}
            rows={2}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Thumbnail */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">{t?.common?.thumbnail || 'Thumbnail URL'}</label>
          <input
            type="text"
            value={thumbnail}
            onChange={(e) => setThumbnail(e.target.value)}
            placeholder="https://..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">{t?.common?.tags || 'Tags (kommagetrennt)'}</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="tech, news, tutorial"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Visibility */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">{t?.common?.visibility || 'Sichtbarkeit'}</label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="public">{t?.common?.public || 'Öffentlich'}</option>
            <option value="private">{t?.common?.private || 'Privat'}</option>
          </select>
        </div>

        {/* Block Editor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-slate-400">{t?.articles?.content || 'Inhalt'}</label>
            <button
              type="button"
              onClick={() => setPreview(!preview)}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
            >
              <Eye className="w-3 h-3" />
              {preview ? t?.common?.edit || 'Bearbeiten' : t?.common?.preview || 'Vorschau'}
            </button>
          </div>
          <BlockEditor blocks={blocks} onChange={setBlocks} t={t} />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
          >
            {t?.common?.cancel || 'Abbrechen'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim()}
            className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                {t?.common?.create || 'Erstellen'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
