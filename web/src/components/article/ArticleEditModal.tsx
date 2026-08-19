'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, AlertTriangle, Globe, Loader2, Archive, Trash } from 'lucide-react';
import { jsonAuthHeaders } from '@/lib/affinity';

interface LocaleData {
  title: string;
  summary: string;
  tags: string[];
}

interface ArticleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: { localeUpdates: Array<{ locale: string; data: LocaleData }>; visibility: string }) => Promise<void>;
  onDelete?: (hardDelete: boolean) => Promise<void>;
  article: any;
  t?: any;
}

const EMPTY_LOCALE: LocaleData = { title: '', summary: '', tags: [] };

export function ArticleEditModal({ isOpen, onClose, onSave, onDelete, article, t }: ArticleEditModalProps) {
  const [activeLocale, setActiveLocale] = useState<'de' | 'en'>('de');
  const [form, setForm] = useState<{ de: LocaleData; en: LocaleData }>({
    de: EMPTY_LOCALE,
    en: EMPTY_LOCALE,
  });
  const [visibility, setVisibility] = useState<string>(article?.visibility || 'public');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !article?.documentId) return;

    let cancelled = false;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/article/settings?documentId=${encodeURIComponent(article.documentId)}`, {
          headers: jsonAuthHeaders(),
          cache: 'no-store',
        });

        if (!res.ok) throw new Error('Fehler beim Laden der Artikeldaten');
        const data = await res.json();
        const items = data.data || [];

        const deItem = items.find((i: any) => i.locale === 'de');
        const enItem = items.find((i: any) => i.locale === 'en');

        const parseSummary = (raw: any) => {
          if (typeof raw === 'string') return raw;
          if (Array.isArray(raw)) {
            return raw
              .map((b: any) => (Array.isArray(b.children) ? b.children.map((c: any) => c.text).join('') : ''))
              .filter(Boolean)
              .join('\n');
          }
          return '';
        };

        if (!cancelled) {
          setForm({
            de: {
              title: deItem?.title || article.title || '',
              summary: parseSummary(deItem?.summary || article.summary),
              tags: Array.isArray(deItem?.tags) ? deItem.tags : Array.isArray(article.tags) ? article.tags : [],
            },
            en: {
              title: enItem?.title || '',
              summary: parseSummary(enItem?.summary),
              tags: Array.isArray(enItem?.tags) ? enItem.tags : [],
            },
          });
          setVisibility(deItem?.visibility || article.visibility || 'public');
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Ladefehler');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [isOpen, article]);

  if (!isOpen) return null;

  const currentData = form[activeLocale];

  const updateCurrentLocale = (field: keyof LocaleData, value: any) => {
    setForm((prev) => ({
      ...prev,
      [activeLocale]: { ...prev[activeLocale], [field]: value },
    }));
  };

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const tag = newTag.trim();
    if (!tag) return;
    if (!currentData.tags.includes(tag)) {
      updateCurrentLocale('tags', [...currentData.tags, tag]);
    }
    setNewTag('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    updateCurrentLocale(
      'tags',
      currentData.tags.filter((t) => t !== tagToRemove)
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const articleSlug = article?.slug;
    try {
      if (onSave) {
        await onSave({
          localeUpdates: [
            {
              locale: 'de',
              data: {
                ...form.de,
                ...(articleSlug ? { slug: articleSlug } : {}),
                summary: [
                  {
                    type: 'paragraph',
                    children: [{ type: 'text', text: form.de.summary }],
                  },
                ] as any,
              },
            },
            {
              locale: 'en',
              data: {
                ...form.en,
                ...(articleSlug ? { slug: articleSlug } : {}),
                summary: [
                  {
                    type: 'paragraph',
                    children: [{ type: 'text', text: form.en.summary }],
                  },
                ] as any,
              },
            },
          ],
          visibility,
        });
      } else {
        const res = await fetch('/api/article/settings', {
          method: 'PUT',
          headers: jsonAuthHeaders(),
          body: JSON.stringify({
            documentId: article.documentId,
            localeUpdates: [
              {
                locale: 'de',
                data: {
                  ...form.de,
                  ...(articleSlug ? { slug: articleSlug } : {}),
                  summary: [
                    {
                      type: 'paragraph',
                      children: [{ type: 'text', text: form.de.summary }],
                    },
                  ],
                },
              },
              {
                locale: 'en',
                data: {
                  ...form.en,
                  ...(articleSlug ? { slug: articleSlug } : {}),
                  summary: [
                    {
                      type: 'paragraph',
                      children: [{ type: 'text', text: form.en.summary }],
                    },
                  ],
                },
              },
            ],
            visibility,
          }),
        });
        if (!res.ok) throw new Error('Speichern fehlgeschlagen');
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (hardDelete: boolean) => {
    setDeleting(true);
    setError(null);
    try {
      if (onDelete) {
        await onDelete(hardDelete);
      } else {
        const url = `/api/article/settings?documentId=${encodeURIComponent(article.documentId)}${
          hardDelete ? '&hard=true' : ''
        }`;
        const res = await fetch(url, {
          method: 'DELETE',
          headers: jsonAuthHeaders(),
        });
        if (!res.ok) throw new Error('Löschen fehlgeschlagen');
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Fehler beim Löschen');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <span>{t?.article?.editTitle || 'Artikel bearbeiten'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Sprachversionen (DE/EN) und Sichtbarkeit für diesen Artikel anpassen.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            <span className="text-sm">Lade Artikeldaten...</span>
          </div>
        ) : (
          <>
            {/* Locale Tabs DE / EN */}
            <div className="flex items-center gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveLocale('de')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeLocale === 'de'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white'
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
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                English (EN)
              </button>
            </div>

            {/* Language-Specific Form */}
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Titel ({activeLocale.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={currentData.title}
                  onChange={(e) => updateCurrentLocale('title', e.target.value)}
                  placeholder={`Artikeltitel auf ${activeLocale.toUpperCase()}...`}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Zusammenfassung / Einleitung ({activeLocale.toUpperCase()})
                </label>
                <textarea
                  rows={3}
                  value={currentData.summary}
                  onChange={(e) => updateCurrentLocale('summary', e.target.value)}
                  placeholder={`Kurze Zusammenfassung für die Vorschau auf ${activeLocale.toUpperCase()}...`}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Tags ({activeLocale.toUpperCase()})
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Tag hinzufügen + Enter"
                    className="flex-1 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
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
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Sichtbarkeit & Status
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="public">Öffentlich (Für alle im Feed und in Feeds sichtbar)</option>
                <option value="private">Privat / Nicht gelistet (Nur für mich als Ersteller sichtbar)</option>
              </select>
            </div>

            {/* Actions */}
            <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
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
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
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
                    className="p-3 bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl text-left transition-all space-y-1 group"
                  >
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                      <Archive className="w-4 h-4" />
                      <span>Soft Delete (Privat schalten)</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Der Artikel wird auf <strong>privat</strong> gesetzt. Er bleibt in deiner Datenbank und auf deinem Profil, wird aber aus allen öffentlichen Feeds entfernt.
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => handleDelete(true)}
                    className="p-3 bg-slate-900 border border-slate-800 hover:border-red-500/50 rounded-xl text-left transition-all space-y-1 group"
                  >
                    <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                      <Trash className="w-4 h-4" />
                      <span>Endgültig löschen</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
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
