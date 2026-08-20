'use client';

import { useContentEditForm, type LocaleData } from '@/lib/hooks/useContentEditForm';

import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, AlertTriangle, Globe, Loader2, Archive, Trash } from 'lucide-react';
import { VisibilitySelector } from '@/components/VisibilitySelector';

interface ArticleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: { localeUpdates: Array<{ locale: string; data: LocaleData }>; visibility: string }) => Promise<void>;
  onDelete?: (hardDelete: boolean) => Promise<void>;
  article: any;
  t?: any;
}

export function ArticleEditModal({ isOpen, onClose, onSave, onDelete, article, t }: ArticleEditModalProps) {
  const {
    activeLocale, setActiveLocale, form, setForm, current: currentData, visibility, setVisibility,
    loading, saving, deleting, error, setError, newTag, setNewTag,
    updateField, addTag, removeTag, buildLocaleUpdates, save, remove,
  } = useContentEditForm('article', {
    isOpen,
    documentId: article?.documentId,
    fallback: { title: article?.title, summary: article?.summary, tags: article?.tags, visibility: article?.visibility },
    // Articles store the summary as Strapi blocks; the modal edits plain text.
    serializeLocale: (_locale, data) => ({
      ...data,
      ...(article?.slug ? { slug: article.slug } : {}),
      summary: [{ type: 'paragraph', children: [{ type: 'text', text: data.summary }] }],
    }),
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen) return null;


  const updateCurrentLocale = (field: keyof LocaleData, value: any) => updateField(field, value);

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    addTag();
  };

  const handleRemoveTag = (tag: string) => removeTag(tag);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-surface-raised border border-subtle rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto text-primary">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-subtle">
          <div>
            <h2 className="text-xl font-extrabold text-primary flex items-center gap-2">
              <span>{t?.article?.editTitle || 'Artikel bearbeiten'}</span>
            </h2>
            <p className="text-xs text-muted mt-1">
              Sprachversionen (DE/EN) und Sichtbarkeit für diesen Artikel anpassen.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted hover:text-primary hover:bg-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            <span className="text-sm">Lade Artikeldaten...</span>
          </div>
        ) : (
          <>
            {/* Locale Tabs DE / EN */}
            <div className="flex items-center gap-2 p-1 bg-surface border border-subtle rounded-xl">
              <button
                type="button"
                onClick={() => setActiveLocale('de')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeLocale === 'de'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-muted hover:text-primary'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                Deutsch (DE)
              </button>
              <button
                type="button"
                onClick={() => setActiveLocale('en')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeLocale === 'en'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-muted hover:text-primary'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                English (EN)
              </button>
            </div>

            {/* Language-Specific Form */}
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">
                  Titel ({activeLocale.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={currentData.title}
                  onChange={(e) => updateCurrentLocale('title', e.target.value)}
                  placeholder={`Artikeltitel auf ${activeLocale.toUpperCase()}...`}
                  className="w-full px-4 py-2.5 bg-surface border border-subtle rounded-xl text-sm text-primary placeholder-faint focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">
                  Zusammenfassung / Einleitung ({activeLocale.toUpperCase()})
                </label>
                <textarea
                  rows={3}
                  value={currentData.summary}
                  onChange={(e) => updateCurrentLocale('summary', e.target.value)}
                  placeholder={`Kurze Zusammenfassung für die Vorschau auf ${activeLocale.toUpperCase()}...`}
                  className="w-full px-4 py-2.5 bg-surface border border-subtle rounded-xl text-sm text-primary placeholder-faint focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">
                  Tags ({activeLocale.toUpperCase()})
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Tag hinzufügen + Enter"
                    className="flex-1 px-4 py-2 bg-surface border border-subtle rounded-xl text-xs text-primary outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-surface-raised hover:bg-surface-raised/80 text-primary border border-subtle text-xs font-bold rounded-xl transition-colors"
                  >
                    + Hinzufügen
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs rounded-lg flex items-center gap-1.5"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-red-400 transition-colors"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Global Visibility */}
            <div className="pt-4 border-t border-subtle space-y-2">
              <VisibilitySelector value={visibility} onChange={setVisibility} t={t} />
            </div>

            {/* Actions */}
            <div className="pt-6 border-t border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Artikel löschen</span>
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-surface hover:bg-surface-raised text-muted hover:text-primary border border-subtle text-xs font-bold transition-all"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold disabled:opacity-40 transition-all flex items-center gap-2 shadow-lg shadow-purple-600/30"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Änderungen speichern</span>
                </button>
              </div>
            </div>

            {/* Delete Modal Section */}
            {showDeleteConfirm && (
              <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-2xl space-y-4 animate-fadeIn">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-red-200">Artikel entfernen</h4>
                    <p className="text-xs text-red-300/80 mt-1">
                      Wähle die gewünschte Methode zum Entfernen des Artikels.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => handleDelete(false)}
                    className="p-3 bg-surface hover:bg-surface-raised border border-subtle hover:border-amber-500/50 rounded-xl text-left transition-all space-y-1 group"
                  >
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                      <Archive className="w-4 h-4" />
                      <span>Soft Delete (Privat schalten)</span>
                    </div>
                    <p className="text-[11px] text-muted">
                      Der Artikel wird auf <strong>privat</strong> gesetzt. Er bleibt in deiner Datenbank und auf deinem Profil, wird aber aus allen öffentlichen Feeds entfernt.
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => handleDelete(true)}
                    className="p-3 bg-surface hover:bg-surface-raised border border-subtle hover:border-red-500/50 rounded-xl text-left transition-all space-y-1 group"
                  >
                    <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                      <Trash className="w-4 h-4" />
                      <span>Endgültig löschen</span>
                    </div>
                    <p className="text-[11px] text-muted">
                      Der Eintrag wird <strong>unwiderruflich</strong> aus Strapi gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
                    </p>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
