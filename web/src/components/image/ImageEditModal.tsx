'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, AlertTriangle, Globe, Loader2, Archive, Trash } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useContentEditForm, type LocaleData } from '@/lib/hooks/useContentEditForm';
import { VisibilitySelector } from '@/components/VisibilitySelector';

interface ImageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: { localeUpdates: Array<{ locale: string; data: LocaleData }>; visibility: string }) => Promise<void>;
  onDelete?: (hardDelete: boolean) => Promise<void>;
  image: any;
  t?: any;
}

export function ImageEditModal({ isOpen, onClose, onSave, onDelete, image, t }: ImageEditModalProps) {
  const {
    activeLocale, setActiveLocale, form, setForm, current, visibility, setVisibility,
    loading, saving, deleting, error, setError, newTag, setNewTag,
    updateField, addTag, removeTag, buildLocaleUpdates, save, remove,
  } = useContentEditForm('image', {
    isOpen,
    documentId: image?.documentId,
    fallback: { title: image?.title, summary: image?.summary, tags: image?.tags, visibility: image?.visibility },
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (onSave) {
      setError(null);
      try {
        await onSave({ localeUpdates: buildLocaleUpdates() as any, visibility });
        onClose();
      } catch (e: any) {
        setError(e?.message || 'Fehler beim Speichern');
      }
      return;
    }
    if (await save()) onClose();
  };

  const handleDelete = async (hardDelete: boolean) => {
    if (onDelete) {
      setError(null);
      try {
        await onDelete(hardDelete);
        onClose();
      } catch (e: any) {
        setError(e?.message || 'Fehler beim Löschen');
      }
      return;
    }
    if (await remove(hardDelete)) onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="font-bold text-lg text-white">{t?.images?.editImage || 'Bild bearbeiten'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-teal-400" />
            <span>Lade Einstellungen...</span>
          </div>
        )}

        {error && (
          <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
            {error}
          </div>
        )}

        {!loading && !showDeleteConfirm && (
          <>
            {/* Language Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-950/80 border border-slate-800 rounded-xl w-fit">
              {(['de', 'en'] as const).map((loc) => (
                <button
                  key={loc}
                  onClick={() => setActiveLocale(loc)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeLocale === loc
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  {loc === 'de' ? 'Deutsch (DE)' : 'English (EN)'}
                </button>
              ))}
            </div>

            {/* Localized Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                  {t?.common?.title || 'Titel'} ({activeLocale.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={current.title}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      [activeLocale]: { ...prev[activeLocale], title: e.target.value },
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                  {t?.common?.summary || 'Zusammenfassung'} ({activeLocale.toUpperCase()})
                </label>
                <textarea
                  value={current.summary}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      [activeLocale]: { ...prev[activeLocale], summary: e.target.value },
                    }))
                  }
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 resize-y focus:outline-none focus:border-teal-500 transition-all"
                />
              </div>

              {/* Tags per locale */}
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                  Tags ({activeLocale.toUpperCase()})
                </label>
                {current.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {current.tags.map((tag: string, i: number) => (
                      <span
                        key={`${tag}-${i}`}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-xs font-mono text-slate-300"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              [activeLocale]: {
                                ...prev[activeLocale],
                                tags: prev[activeLocale].tags.filter((_, idx) => idx !== i),
                              },
                            }))
                          }
                          className="text-slate-500 hover:text-rose-400 transition-all cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 block mb-2">Keine Tags in dieser Sprache</span>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Tag hinzufügen..."
                    className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:border-teal-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    + Hinzufügen
                  </button>
                </div>
              </div>
            </div>

            {/* Global Settings */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <VisibilitySelector value={visibility} onChange={setVisibility} t={t} />
            </div>

            {/* Save & Delete Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Bild löschen</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || (!form.de.title.trim() && !form.en.title.trim())}
                  className="py-2.5 px-5 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-teal-500/20"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Speichern</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Delete Confirmation View with clear explanations */}
        {!loading && showDeleteConfirm && (
          <div className="space-y-6">
            <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl">
              <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Bild löschen oder archivieren?</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Wähle zwischen dem Archivieren (Soft Delete) oder dem endgültigen Löschen aus der Datenbank.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Option 1: Soft Delete */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <Archive className="w-4 h-4" />
                  <span>Soft Delete (Als privat archivieren)</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Das Bild wird auf <strong className="text-slate-200">Privat</strong> gesetzt. Es ist für Besucher nicht mehr öffentlich zu sehen, bleibt aber in deinem Profil erhalten und kann jederzeit wieder veröffentlicht werden.
                </p>
                <button
                  type="button"
                  onClick={() => handleDelete(false)}
                  disabled={deleting}
                  className="w-full mt-2 py-2 px-4 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                  <span>Als privat archivieren (Soft Delete)</span>
                </button>
              </div>

              {/* Option 2: Permanent Hard Delete */}
              <div className="p-4 bg-slate-950/80 border border-rose-500/20 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                  <Trash className="w-4 h-4" />
                  <span>Endgültig löschen (Unwiderruflich)</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Das Bild wird <strong className="text-rose-300">unwiderruflich</strong> aus der Datenbank gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
                <button
                  type="button"
                  onClick={() => handleDelete(true)}
                  disabled={deleting}
                  className="w-full mt-2 py-2 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-600/20"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span>Endgültig löschen</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Abbrechen & Zurück
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
