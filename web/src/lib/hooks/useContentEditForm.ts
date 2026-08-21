'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ContentKind } from '@omni/shared';
import { jsonAuthHeaders } from '@/lib/affinity';

/**
 * The bilingual edit form behind the article, image and video edit modals.
 *
 * The three modals looked only 30-65% alike, so they keep their own markup —
 * but their *state* was identical down to the variable names: an activeLocale,
 * a { de, en } form pair, visibility, loading / saving / deleting flags, a
 * pending tag input and an error string, plus a byte-identical LocaleData type
 * declared three times. That is what lives here.
 *
 * Everything talks to /api/content/{kind}/settings: GET to load both locales,
 * PUT to save them together, DELETE to remove.
 */

export interface LocaleData {
  title: string;
  summary: string;
  tags: string[];
  /** Article dynamic zone. Empty for kinds that have no blocks. */
  blocks?: unknown[];
}

export const EMPTY_LOCALE: LocaleData = { title: '', summary: '', tags: [] };

export type Locale = 'de' | 'en';

/** Strapi blocks come back as a node tree; the modals edit plain text. */
export function parseSummary(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) {
    return raw
      .map((b: any) => (Array.isArray(b?.children) ? b.children.map((c: any) => c?.text ?? '').join('') : ''))
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

export interface UseContentEditFormOptions {
  isOpen: boolean;
  documentId?: string;
  /** Values already known to the caller, used until the fetch resolves. */
  fallback?: Partial<{ title: string; summary: unknown; tags: string[]; visibility: string }>;
  /** Lets a kind reshape its locale payload — articles wrap summary in blocks. */
  serializeLocale?: (locale: Locale, data: LocaleData) => Record<string, unknown>;
  /** Fired once the fetch has populated the form — the video modal snapshots it
   *  here to detect unsaved changes. */
  onLoaded?: (loaded: { form: { de: LocaleData; en: LocaleData }; visibility: string }) => void;
}

/** Anything the author may have typed or placed, not just the title. */
function localeHasContent(data: LocaleData): boolean {
  return (
    data.title.trim() !== '' ||
    data.summary.trim() !== '' ||
    data.tags.length > 0 ||
    (Array.isArray(data.blocks) && data.blocks.length > 0)
  );
}

export function useContentEditForm(kind: ContentKind, options: UseContentEditFormOptions) {
  const { isOpen, documentId, fallback, serializeLocale, onLoaded } = options;

  const [activeLocale, setActiveLocale] = useState<Locale>('de');
  const [form, setForm] = useState<{ de: LocaleData; en: LocaleData }>({
    de: { ...EMPTY_LOCALE },
    en: { ...EMPTY_LOCALE },
  });
  const [visibility, setVisibility] = useState<string>(fallback?.visibility || 'public');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [error, setError] = useState<string | null>(null);
  /**
   * Which locales the document actually has.
   *
   * Sending an update for a locale that does not exist makes Strapi answer
   * "locale not found", which — since failures became visible — turns the whole
   * save into an error even though the other locale was written. Articles
   * created before the second locale was fixed have exactly one.
   */
  const [existingLocales, setExistingLocales] = useState<Locale[]>(['de', 'en']);

  const endpoint = `/api/content/${kind}/settings`;

  useEffect(() => {
    if (!isOpen || !documentId) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${endpoint}?documentId=${encodeURIComponent(documentId)}`, {
          headers: jsonAuthHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`Laden fehlgeschlagen (${res.status})`);

        const body = await res.json();
        const items: any[] = body?.data || [];
        const de = items.find((i) => i.locale === 'de');
        const en = items.find((i) => i.locale === 'en');

        if (cancelled) return;
        const loaded = {
          de: {
            title: de?.title || fallback?.title || '',
            summary: parseSummary(de?.summary ?? fallback?.summary),
            tags: Array.isArray(de?.tags) ? de.tags : Array.isArray(fallback?.tags) ? fallback!.tags! : [],
            blocks: Array.isArray(de?.blocks) ? de.blocks : [],
          },
          en: {
            title: en?.title || '',
            summary: parseSummary(en?.summary),
            tags: Array.isArray(en?.tags) ? en.tags : [],
            blocks: Array.isArray(en?.blocks) ? en.blocks : [],
          },
        };
        setExistingLocales(
          (['de', 'en'] as Locale[]).filter((l) => items.some((i) => i.locale === l))
        );
        const loadedVisibility = de?.visibility || en?.visibility || fallback?.visibility || 'public';
        setForm(loaded);
        setVisibility(loadedVisibility);
        onLoaded?.({ form: loaded, visibility: loadedVisibility });
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Ladefehler');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, documentId, endpoint]);

  const current = form[activeLocale];

  const updateField = useCallback(
    (field: keyof LocaleData, value: unknown) => {
      setForm((prev) => ({
        ...prev,
        [activeLocale]: { ...prev[activeLocale], [field]: value },
      }));
    },
    [activeLocale]
  );

  const addTag = useCallback(() => {
    const tag = newTag.trim();
    if (!tag) return;
    setForm((prev) => {
      const tags = prev[activeLocale].tags;
      // Case-insensitive, as the image modal did: "Natur" and "natur" are one tag.
      if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return prev;
      return { ...prev, [activeLocale]: { ...prev[activeLocale], tags: [...tags, tag] } };
    });
    setNewTag('');
  }, [newTag, activeLocale]);

  const removeTag = useCallback(
    (tag: string) => {
      setForm((prev) => ({
        ...prev,
        [activeLocale]: {
          ...prev[activeLocale],
          tags: prev[activeLocale].tags.filter((t) => t !== tag),
        },
      }));
    },
    [activeLocale]
  );

  const buildLocaleUpdates = useCallback(
    () =>
      (['de', 'en'] as Locale[])
        // A locale the document does not have is only sent when the author put
        // something into it — then creating it is the intent. Sending it blindly
        // fails the save for a language nobody touched; skipping it when it does
        // hold content would drop that content silently, so "content" means any
        // of the fields, not just the title.
        .filter((locale) => existingLocales.includes(locale) || localeHasContent(form[locale]))
        .map((locale) => ({
          locale,
          data: serializeLocale ? serializeLocale(locale, form[locale]) : { ...form[locale] },
        })),
    [form, serializeLocale, existingLocales]
  );

  const save = useCallback(async (): Promise<boolean> => {
    if (!documentId) return false;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({ documentId, localeUpdates: buildLocaleUpdates(), visibility }),
      });
      if (!res.ok) {
        // The route reports per-locale validation failures in `failedLocales`.
        // Surfacing only the status turned a precise message like "level must be
        // one of h2, h3, h4" into "failed (422)", which sends the author to the
        // browser console to find out what to change.
        let message = `Speichern fehlgeschlagen (${res.status})`;
        try {
          const body = await res.json();
          const detail = Array.isArray(body?.failedLocales)
            ? body.failedLocales
                .map((f: { locale: string; error: string }) => `${f.locale.toUpperCase()}: ${f.error}`)
                .join(' · ')
            : body?.error;
          if (detail) message = detail;
          if (Array.isArray(body?.savedLocales) && body.savedLocales.length > 0) {
            message += ` (gespeichert: ${body.savedLocales.map((l: string) => l.toUpperCase()).join(', ')})`;
          }
        } catch {
          // Non-JSON error body — the status message stays.
        }
        throw new Error(message);
      }
      return true;
    } catch (err: any) {
      setError(err?.message || 'Fehler beim Speichern');
      return false;
    } finally {
      setSaving(false);
    }
  }, [documentId, endpoint, buildLocaleUpdates, visibility]);

  const remove = useCallback(
    async (hard = false): Promise<boolean> => {
      if (!documentId) return false;
      setDeleting(true);
      setError(null);
      try {
        const res = await fetch(
          `${endpoint}?documentId=${encodeURIComponent(documentId)}&hard=${hard}`,
          { method: 'DELETE', headers: jsonAuthHeaders() }
        );
        if (!res.ok) throw new Error(`Löschen fehlgeschlagen (${res.status})`);
        return true;
      } catch (err: any) {
        setError(err?.message || 'Fehler beim Löschen');
        return false;
      } finally {
        setDeleting(false);
      }
    },
    [documentId, endpoint]
  );

  return {
    activeLocale,
    setActiveLocale,
    form,
    setForm,
    current,
    visibility,
    setVisibility,
    loading,
    saving,
    deleting,
    error,
    setError,
    newTag,
    setNewTag,
    updateField,
    addTag,
    removeTag,
    buildLocaleUpdates,
    save,
    remove,
  };
}
