'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Globe } from 'lucide-react';
import { jsonAuthHeaders } from '@/lib/affinity';
import { useApp } from '@/context/AppContext';

interface LocaleData {
  title: string;
  summary: string;
  tags: string[];
}

// Flatten a Strapi `blocks` field into plain text (mirrors VideoPageClient helper)
function flattenBlocks(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map((block: any) => {
        if (typeof block === 'string') return block;
        if (block && Array.isArray(block.children)) {
          return block.children.map((c: any) => (typeof c === 'string' ? c : c?.text || '')).join('');
        }
        return block?.text || '';
      })
      .filter(Boolean)
      .join('\n\n');
  }
  return '';
}

// Convert plain text back into a Strapi `blocks` array (single paragraph)
function textToBlocks(text: string): any[] {
  return [{ type: 'paragraph', children: [{ text: text || '', type: 'text' }] }];
}

interface VideoSettingsModalProps {
  documentId: string;
  slug: string;
  onClose: () => void;
  onSave?: () => void;
}

const EMPTY_LOCALE: LocaleData = { title: '', summary: '', tags: [] };

export default function VideoSettingsModal({
  documentId,
  slug,
  onClose,
  onSave,
}: VideoSettingsModalProps) {
  const { t } = useApp();
  const [activeLocale, setActiveLocale] = useState<'de' | 'en'>('de');
  const [form, setForm] = useState<{ de: LocaleData; en: LocaleData }>({
    de: EMPTY_LOCALE,
    en: EMPTY_LOCALE,
  });
  const [visibility, setVisibility] = useState<string>('public');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [showDiscard, setShowDiscard] = useState(false);

  // Snapshot of the loaded values, used to detect unsaved changes.
  const [snapshot, setSnapshot] = useState<{ form: { de: LocaleData; en: LocaleData }; visibility: string } | null>(null);

  const addTag = () => {
    const tag = newTag.trim();
    if (!tag) return;
    setForm((prev) => {
      const existing = prev[activeLocale].tags;
      if (existing.some((t) => t.toLowerCase() === tag.toLowerCase())) {
        return prev; // duplicate, ignore
      }
      return {
        ...prev,
        [activeLocale]: {
          ...prev[activeLocale],
          tags: [...existing, tag],
        },
      };
    });
    setNewTag('');
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const strapiUrl = '';
        const res = await fetch(
          `/api/video/settings?documentId=${encodeURIComponent(documentId)}`,
          { headers: jsonAuthHeaders(), cache: 'no-store' }
        );
        if (!res.ok) throw new Error(`Load failed (${res.status})`);
        const data = await res.json();
        const items: any[] = data?.data || [];
        const de = items.find((i) => i.locale === 'de') || items[0] || {};
        const en = items.find((i) => i.locale === 'en') || {};
        if (cancelled) return;
        const loadedDe = {
          title: de.title || '',
          summary: flattenBlocks(de.summary),
          tags: Array.isArray(de.tags) ? de.tags : [],
        };
        const loadedEn = {
          title: en.title || '',
          summary: flattenBlocks(en.summary),
          tags: Array.isArray(en.tags) ? en.tags : [],
        };
        const loadedVisibility = de.visibility || en.visibility || 'public';
        if (cancelled) return;
        setForm({ de: loadedDe, en: loadedEn });
        setVisibility(loadedVisibility);
        // Capture snapshot for dirty detection
        setSnapshot({
          form: { de: loadedDe, en: loadedEn },
          visibility: loadedVisibility,
        });
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Fehler beim Laden');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const headers = { ...jsonAuthHeaders(), 'Content-Type': 'application/json' };

      // Update localized fields per locale (title, summary, tags)
      // summary is a Strapi `blocks` field, so convert plain text back to blocks array
      const localeUpdates = [
        { locale: 'de', data: { title: form.de.title, summary: textToBlocks(form.de.summary), tags: form.de.tags } },
        { locale: 'en', data: { title: form.en.title, summary: textToBlocks(form.en.summary), tags: form.en.tags } },
      ];
      const saveRes = await fetch(`/api/video/settings`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ documentId, localeUpdates, visibility }),
      });
      if (!saveRes.ok) throw new Error(`Save failed (${saveRes.status})`);
      setSaved(true);
      // Update snapshot so the form is no longer dirty, then close the modal.
      setSnapshot({ form, visibility });
      if (onSave) onSave();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  // Close request: if there are unsaved changes, ask for confirmation first.
  const requestClose = () => {
    if (isDirty) {
      setShowDiscard(true);
    } else {
      onClose();
    }
  };

  const current = form[activeLocale];

  // Compare current form + visibility against the loaded snapshot.
  const isDirty =
    !!snapshot &&
    (snapshot.visibility !== visibility ||
      JSON.stringify(snapshot.form) !== JSON.stringify(form));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <h2 className="text-lg font-bold text-white">{t.videoSettings.title}</h2>
          <button
            onClick={requestClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" /> {t.videoSettings.loading}
            </div>
          )}

          {error && (
            <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
              {error}
            </div>
          )}

          {!loading && (
            <>
              {/* Language Tabs for translatable content */}
              <div>
                <div className="flex items-center gap-1 p-1 bg-slate-950/80 border border-slate-800 rounded-xl w-fit">
                  {(['de', 'en'] as const).map((loc) => (
                    <button
                      key={loc}
                      onClick={() => setActiveLocale(loc)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        activeLocale === loc
                          ? 'bg-indigo-500/20 text-indigo-300'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      {loc === 'de' ? t.videoSettings.languageGerman : t.videoSettings.languageEnglish}
                    </button>
                  ))}
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {t.videoSettings.titleLabel} ({activeLocale === 'de' ? 'DE' : 'EN'})
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
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {t.videoSettings.descriptionLabel} ({activeLocale === 'de' ? 'DE' : 'EN'})
                    </label>
                    <textarea
                      value={current.summary}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          [activeLocale]: { ...prev[activeLocale], summary: e.target.value },
                        }))
                      }
                      rows={4}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none transition-all resize-y"
                    />
                  </div>

                  {/* Tags: editable per locale */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {t.videoSettings.tagsLabel} ({activeLocale === 'de' ? 'DE' : 'EN'})
                    </label>

                    {current.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {current.tags.map((tag: string, i: number) => (
                          <span
                            key={`${tag}-${i}`}
                            className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-xs font-mono text-slate-300"
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
                              className="text-slate-500 hover:text-rose-400 transition-all"
                              aria-label={`${t.videoSettings.removeTag || 'Remove'} ${tag}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 block mb-2">{t.videoSettings.noTags}</span>
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
                        placeholder={t.videoSettings.addTagPlaceholder}
                        className="flex-1 px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={addTag}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all"
                      >
                        {t.videoSettings.addTag}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* General settings (non-localized) */}
              <div className="pt-2 border-t border-slate-800">
                <h3 className="text-sm font-bold text-slate-200 mb-3">{t.videoSettings.generalSettings}</h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {t.videoSettings.visibilityLabel}
                  </label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none transition-all"
                  >
                    <option value="public">{t.videoSettings.visibility.public}</option>
                    <option value="private">{t.videoSettings.visibility.private}</option>
                  </select>
                </div>
              </div>

              {/* Save */}
              <div className="flex items-center justify-end gap-3 pt-2">
                {saved && (
                  <span className="text-xs text-emerald-300 font-medium">{t.videoSettings.saved} ✓</span>
                )}
                {isDirty && (
                  <button
                    type="button"
                    onClick={() => setShowDiscard(true)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-all"
                  >
                    {t.videoSettings.cancel}
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-bold transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {t.videoSettings.save}
                </button>
              </div>
            </>
          )}

          {/* Discard confirmation */}
          {showDiscard && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-white">{t.videoSettings.discardConfirmTitle}</h3>
                <p className="text-sm text-slate-400">{t.videoSettings.discardConfirmText}</p>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDiscard(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-all"
                  >
                    {t.videoSettings.keepEditing}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDiscard(false);
                      onClose();
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-sm font-bold transition-all"
                  >
                    {t.videoSettings.discardChanges}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
