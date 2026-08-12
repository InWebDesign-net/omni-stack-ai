'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Globe } from 'lucide-react';
import { jsonAuthHeaders } from '@/lib/affinity';

interface LocaleData {
  title: string;
  summary: string;
  tags: string[];
}

interface VideoSettingsModalProps {
  documentId: string;
  slug: string;
  onClose: () => void;
}

const EMPTY_LOCALE: LocaleData = { title: '', summary: '', tags: [] };

export default function VideoSettingsModal({
  documentId,
  slug,
  onClose,
}: VideoSettingsModalProps) {
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
        setForm({
          de: {
            title: de.title || '',
            summary: typeof de.summary === 'string' ? de.summary : (de.summary?.toString?.() || ''),
            tags: Array.isArray(de.tags) ? de.tags : [],
          },
          en: {
            title: en.title || '',
            summary: typeof en.summary === 'string' ? en.summary : (en.summary?.toString?.() || ''),
            tags: Array.isArray(en.tags) ? en.tags : [],
          },
        });
        setVisibility(de.visibility || en.visibility || 'public');
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

      // Update localized fields per locale (only title + summary; tags read-only for now)
      const localeUpdates = [
        { locale: 'de', data: { title: form.de.title, summary: form.de.summary } },
        { locale: 'en', data: { title: form.en.title, summary: form.en.summary } },
      ];
      const saveRes = await fetch(`/api/video/settings`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ documentId, localeUpdates, visibility }),
      });
      if (!saveRes.ok) throw new Error(`Save failed (${saveRes.status})`);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e?.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const current = form[activeLocale];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <h2 className="text-lg font-bold text-white">Video-Einstellungen</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Wird geladen…
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
                      {loc === 'de' ? 'Deutsch' : 'English'}
                    </button>
                  ))}
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Titel ({activeLocale === 'de' ? 'DE' : 'EN'})
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
                      Beschreibung ({activeLocale === 'de' ? 'DE' : 'EN'})
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

                  {/* Tags: display only (read-only for now) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Tags ({activeLocale === 'de' ? 'DE' : 'EN'}) — nur Anzeige
                    </label>
                    {current.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {current.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-xs font-mono text-slate-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">Keine Tags</span>
                    )}
                  </div>
                </div>
              </div>

              {/* General settings (non-localized) */}
              <div className="pt-2 border-t border-slate-800">
                <h3 className="text-sm font-bold text-slate-200 mb-3">Allgemeine Einstellungen</h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Sichtbarkeit
                  </label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none transition-all"
                  >
                    <option value="public">Öffentlich</option>
                    <option value="unlisted">Nicht gelistet</option>
                    <option value="private">Privat</option>
                  </select>
                </div>
              </div>

              {/* Save */}
              <div className="flex items-center justify-end gap-3 pt-2">
                {saved && (
                  <span className="text-xs text-emerald-300 font-medium">Gespeichert ✓</span>
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
                  Speichern
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
