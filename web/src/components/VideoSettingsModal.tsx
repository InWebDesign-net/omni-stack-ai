'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Globe, Trash2, AlertTriangle, Archive, Trash } from 'lucide-react';
import { jsonAuthHeaders } from '@/lib/affinity';
import { useApp } from '@/context/AppContext';

interface LocaleData {
  title: string;
  summary: string;
  tags: string[];
}

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

function textToBlocks(text: string): any[] {
  return [{ type: 'paragraph', children: [{ text: text || '', type: 'text' }] }];
}

interface VideoSettingsModalProps {
  documentId: string;
  slug: string;
  onClose: () => void;
  onSave?: () => void;
  onDelete?: (hardDelete: boolean) => Promise<void>;
}

const EMPTY_LOCALE: LocaleData = { title: '', summary: '', tags: [] };

export default function VideoSettingsModal({
  documentId,
  slug,
  onClose,
  onSave,
  onDelete,
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
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [showDiscard, setShowDiscard] = useState(false);

  const [snapshot, setSnapshot] = useState<{ form: { de: LocaleData; en: LocaleData }; visibility: string } | null>(null);

  const addTag = () => {
    const tag = newTag.trim();
    if (!tag) return;
    setForm((prev) => {
      const existing = prev[activeLocale].tags;
      if (existing.some((t) => t.toLowerCase() === tag.toLowerCase())) {
        return prev;
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
    try {
      const headers = { ...jsonAuthHeaders(), 'Content-Type': 'application/json' };
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
      setSnapshot({ form, visibility });
      if (onSave) onSave();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Fehler beim Speichern');
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
        const res = await fetch(`/api/video/settings?documentId=${encodeURIComponent(documentId)}&hard=${hardDelete}`, {
          method: 'DELETE',
          headers: jsonAuthHeaders(),
        });
        if (!res.ok) throw new Error('Video-Löschung fehlgeschlagen');
      }
      if (onSave) onSave();
      onClose();
    } catch (e: any) {
      console.error('Failed to delete video:', e);
      setError(e.message || 'Fehler beim Löschen des Videos');
    } finally {
      setDeleting(false);
    }
  };

  const requestClose = () => {
    if (isDirty) {
      setShowDiscard(true);
    } else {
      onClose();
    }
  };

  const current = form[activeLocale];
  const isDirty =
    !!snapshot &&
    (snapshot.visibility !== visibility ||
      JSON.stringify(snapshot.form) !== JSON.stringify(form));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-lg font-bold text-white">{t?.videoSettings?.title || 'Video bearbeiten'}</h2>
          <button
            onClick={requestClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            <span>Lade Video-Einstellungen...</span>
          </div>
        )}

        {error && (
          <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
            {error}
          </div>
        )}

        {!loading && !showDeleteConfirm && (
          <>
            {/* Language Tabs for translatable content */}
            <div className="flex items-center gap-1 p-1 bg-slate-950/80 border border-slate-800 rounded-xl w-fit">
              {(['de', 'en'] as const).map((loc) => (
                <button
                  key={loc}
                  onClick={() => setActiveLocale(loc)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeLocale === loc
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  {loc === 'de' ? 'Deutsch (DE)' : 'English (EN)'}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t?.videoSettings?.titleLabel || 'Titel'} ({activeLocale.toUpperCase()})
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t?.videoSettings?.descriptionLabel || 'Beschreibung'} ({activeLocale.toUpperCase()})
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none transition-all resize-y"
                />
              </div>

              {/* Tags: editable per locale */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t?.videoSettings?.tagsLabel || 'Tags'} ({activeLocale.toUpperCase()})
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
                          className="text-slate-500 hover:text-rose-400 transition-all cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 block mb-2">{t?.videoSettings?.noTags || 'Keine Tags'}</span>
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
                    placeholder={t?.videoSettings?.addTagPlaceholder || 'Tag hinzufügen...'}
                    className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    + Hinzufügen
                  </button>
                </div>
              </div>
            </div>

            {/* General settings (non-localized) */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t?.videoSettings?.visibilityLabel || 'Sichtbarkeit'}
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none transition-all cursor-pointer"
              >
                <option value="public">{t?.videoSettings?.visibility?.public || 'Öffentlich (Für jeden sichtbar)'}</option>
                <option value="private">{t?.videoSettings?.visibility?.private || 'Privat (Nur für mich sichtbar)'}</option>
              </select>
            </div>

            {/* Save & Delete Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Video löschen</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={requestClose}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || (!form.de.title.trim() && !form.en.title.trim())}
                  className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
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
                <h4 className="text-sm font-bold text-white mb-1">Video löschen oder archivieren?</h4>
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
                  Das Video wird auf <strong className="text-slate-200">Privat</strong> gesetzt. Es ist für Besucher nicht mehr öffentlich zu sehen, bleibt aber in deinem Profil erhalten.
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
                  Das Video wird <strong className="text-rose-300">unwiderruflich</strong> aus der Datenbank gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
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

        {/* Discard confirmation */}
        {showDiscard && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white">{t?.videoSettings?.discardConfirmTitle || 'Änderungen verwerfen?'}</h3>
              <p className="text-sm text-slate-400">{t?.videoSettings?.discardConfirmText || 'Nicht gespeicherte Änderungen gehen verloren.'}</p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDiscard(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-all cursor-pointer"
                >
                  Weiter bearbeiten
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscard(false);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-sm font-bold transition-all cursor-pointer"
                >
                  Verwerfen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
