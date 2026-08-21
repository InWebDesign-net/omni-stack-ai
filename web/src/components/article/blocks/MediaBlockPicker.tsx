'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Search, X, Loader2, ImageIcon, Video as VideoIcon, Upload, AlertTriangle } from 'lucide-react';
import { useUploadManager } from '@/context/UploadContext';

/**
 * Picks an existing image or video for a media block.
 *
 * `shared.image` and `shared.video` hold a relation, not a file, so the block's
 * job is to choose something that already exists. Only the author's own items are
 * offered — the endpoint derives the creator from the session, so this cannot be
 * pointed at anyone else's library.
 *
 * Private items are included on purpose: they are the author's own, and the ones
 * they most likely want to place before publishing.
 *
 * A file can also be dropped straight in. It goes through the same upload
 * pipeline as everywhere else — appearing in the global manager, retryable there
 * — and the block adopts the resulting entry as its relation when it finishes.
 */

export interface MediaRelation {
  id?: number;
  documentId?: string;
  title?: string;
  slug?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  visibility?: string;
}

interface MediaBlockPickerProps {
  kind: 'image' | 'video';
  value: MediaRelation | string | null | undefined;
  onChange: (relation: MediaRelation | null) => void;
  t?: any;
}

const thumbOf = (item: MediaRelation): string | null =>
  item.thumbnailUrl || item.imageUrl || null;

export function MediaBlockPicker({ kind, value, onChange, t }: MediaBlockPickerProps) {
  const b = t?.blocks || {};
  const { addFiles, tasks, removeTask, setIsMinimized } = useUploadManager();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MediaRelation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Tracked by id from the shared task list rather than through a callback: a
   * closure captured at drop time goes stale across re-renders, and reading the
   * task gives live progress as well as the finish.
   */
  const pendingTask = useMemo(
    () => (pendingTaskId ? tasks.find((task) => task.id === pendingTaskId) : undefined),
    [pendingTaskId, tasks]
  );

  useEffect(() => {
    if (!pendingTask) return;

    if (pendingTask.status === 'completed' && pendingTask.documentId) {
      onChange({
        documentId: pendingTask.documentId,
        slug: pendingTask.slug,
        title: pendingTask.title,
      });
      setPendingTaskId(null);
      return;
    }

    if (pendingTask.status === 'error') {
      setUploadError(pendingTask.errorMsg || b.uploadFailed || 'Upload fehlgeschlagen.');
      setPendingTaskId(null);
      removeTask(pendingTask.id);
    }
    // `onChange` is recreated on every parent render; depending on it here would
    // re-run this effect constantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTask?.status, pendingTask?.documentId]);

  const handleFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    setUploadError(null);

    // One relation per block, so a multi-file drop takes the first and says so
    // rather than starting uploads nothing will ever reference.
    const file = list[0];
    const skipped = list.length - 1;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const wanted = kind === 'image' ? isImage : isVideo;

    // Forcing the media type on a mismatched file would create a broken entry
    // that the block then could not use.
    if (!wanted) {
      setUploadError(
        kind === 'image'
          ? b.uploadNotAnImage || 'Das ist keine Bilddatei.'
          : b.uploadNotAVideo || 'Das ist keine Videodatei.'
      );
      return;
    }

    const ids = addFiles([file], kind === 'image' ? 'image' : 'video');
    if (ids.length === 0) {
      setUploadError(b.uploadRejected || 'Datei wurde abgelehnt.');
      return;
    }
    setPendingTaskId(ids[0]);
    setIsMinimized(true);
    if (skipped > 0) {
      setUploadError((b.uploadOnlyFirst || 'Nur die erste Datei wird verwendet ({n} übersprungen).').replace('{n}', String(skipped)));
    }
  };

  // A relation that came back from Strapi is a populated object; one that was
  // only ever a documentId string carries no title to show.
  const selected: MediaRelation | null = useMemo(() => {
    if (!value) return null;
    if (typeof value === 'string') return { documentId: value };
    return value;
  }, [value]);

  const hasSelection = Boolean(selected);

  useEffect(() => {
    if (hasSelection || pendingTaskId) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ pageSize: '12' });
        if (query.trim()) params.set('q', query.trim());
        const res = await fetch(`/api/content/${kind}/mine?${params.toString()}`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(String(res.status));
        const body = await res.json();
        if (!cancelled) setResults(Array.isArray(body?.data) ? body.data : []);
      } catch {
        if (!cancelled) setError(b.mediaLoadFailed || 'Inhalte konnten nicht geladen werden.');
      } finally {
        if (!cancelled) setLoading(false);
      }
      // Debounced: the author types into this, and one request per keystroke
      // would both hammer Strapi and race its own results back out of order.
    }, query ? 300 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [kind, query, hasSelection, pendingTaskId, b.mediaLoadFailed]);

  const [localeWarning, setLocaleWarning] = useState<string | null>(null);
  const [isFixingLocale, setIsFixingLocale] = useState(false);

  useEffect(() => {
    if (!selected?.documentId) {
      setLocaleWarning(null);
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/content/${kind}/settings?documentId=${encodeURIComponent(selected.documentId!)}`);
        if (!res.ok) return;
        const json = await res.json();
        const items = json.data || [];
        const locales = items.map((i: any) => i.locale);
        const missing = (['de', 'en'] as const).filter((l) => !locales.includes(l));
        if (isMounted) {
          if (missing.length > 0) {
            setLocaleWarning(missing.join(', ').toUpperCase());
          } else {
            setLocaleWarning(null);
          }
        }
      } catch (err) {
        // Silently ignore check errors
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [selected?.documentId, kind]);

  const handleFixLocale = async () => {
    if (!selected?.documentId) return;
    setIsFixingLocale(true);
    try {
      const res = await fetch(`/api/content/${kind}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: selected.documentId,
          localeUpdates: [
            { locale: 'de', data: { title: selected.title || selected.slug } },
            { locale: 'en', data: { title: selected.title || selected.slug } },
          ],
        }),
      });
      if (res.ok) {
        setLocaleWarning(null);
      }
    } catch (e) {
      console.error('Failed to auto-create missing locale:', e);
    } finally {
      setIsFixingLocale(false);
    }
  };

  const Icon = kind === 'image' ? ImageIcon : VideoIcon;

  if (selected) {
    const thumb = thumbOf(selected);
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-base border border-subtle">
          <div className="relative w-20 h-12 shrink-0 rounded-lg overflow-hidden bg-surface">
            {thumb ? (
              <Image src={thumb} alt="" fill sizes="80px" className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Icon className="w-4 h-4 text-faint" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary truncate">
              {selected.title || selected.slug || selected.documentId}
            </p>
            {selected.visibility && selected.visibility !== 'public' && (
              <p className="text-[10px] font-mono text-faint uppercase">{selected.visibility}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={b.mediaClear || 'Verknüpfung entfernen'}
            title={b.mediaClear || 'Verknüpfung entfernen'}
            className="p-1.5 rounded-lg text-faint hover:text-rose-400 hover:bg-surface-raised transition-colors cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {localeWarning && (
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200">
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">
                Fehlende Sprache ({localeWarning}) — Block kann sonst nicht gespeichert werden.
              </span>
            </div>
            <button
              type="button"
              onClick={handleFixLocale}
              disabled={isFixingLocale}
              className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 font-semibold text-[10px] shrink-0 transition-colors cursor-pointer"
            >
              {isFixingLocale ? 'Erstelle…' : 'Sprache anlegen'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // While this block's own upload is in flight the search is deliberately gone,
  // not merely disabled: there is a file on its way to this slot, and picking
  // something else would race it.
  if (pendingTask) {
    const pct = Math.round(pendingTask.progress || 0);
    return (
      <div className="space-y-2 p-3 rounded-xl bg-base border border-purple-500/40">
        <div className="flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400 shrink-0" />
          <span className="text-xs text-primary truncate flex-1 min-w-0">{pendingTask.file.name}</span>
          <span className="text-[10px] font-mono text-muted shrink-0">{pct}%</span>
        </div>
        <div className="h-1 rounded-full bg-surface overflow-hidden">
          <div
            className="h-full bg-purple-500 transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-faint leading-relaxed">
          {b.uploadInProgress ||
            'Der Upload läuft im Hintergrund weiter. Schließt du den Editor jetzt, landet die Datei trotzdem in deiner Mediathek und lässt sich hier nachträglich auswählen.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {uploadError && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-200 leading-relaxed flex-1">{uploadError}</p>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            aria-label={b.cancel || 'Schließen'}
            className="p-0.5 text-amber-300 hover:text-amber-100 shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-faint" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            kind === 'image'
              ? b.mediaSearchImages || 'Eigene Bilder durchsuchen…'
              : b.mediaSearchVideos || 'Eigene Videos durchsuchen…'
          }
          aria-label={
            kind === 'image'
              ? b.mediaSearchImages || 'Eigene Bilder durchsuchen'
              : b.mediaSearchVideos || 'Eigene Videos durchsuchen'
          }
          className="w-full pl-9 pr-3 py-2 bg-base border border-subtle rounded-xl text-sm text-primary placeholder-faint outline-none focus:outline-none focus:border-purple-500 transition-colors"
        />
      </div>

      {error && <p className="text-[11px] text-rose-400">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 py-3 text-xs text-muted">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>{b.mediaLoading || 'Lade…'}</span>
        </div>
      ) : results.length === 0 ? (
        <p className="text-[11px] text-faint italic py-2">
          {query.trim()
            ? (b.mediaNoMatch || 'Nichts gefunden für „{query}".').replace('{query}', query.trim())
            : b.mediaNoneYet || 'Du hast noch keine Inhalte dieser Art.'}
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1">
          {results.map((item) => {
            const thumb = thumbOf(item);
            return (
              <button
                key={item.documentId || item.id}
                type="button"
                onClick={() => onChange(item)}
                title={item.title}
                className="group text-left rounded-lg overflow-hidden border border-subtle hover:border-purple-500/60 bg-base transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              >
                <div className="relative aspect-video bg-surface">
                  {thumb ? (
                    <Image src={thumb} alt="" fill sizes="120px" className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon className="w-4 h-4 text-faint" />
                    </div>
                  )}
                </div>
                <p className="px-1.5 py-1 text-[10px] text-muted group-hover:text-primary truncate transition-colors">
                  {item.title || item.slug}
                </p>
              </button>
            );
          })}
        </div>
      )}

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
        }}
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-subtle hover:border-purple-500/50 transition-colors"
      >
        <Upload className="w-3.5 h-3.5 text-faint shrink-0" />
        <span className="text-[11px] text-faint flex-1 min-w-0">
          {kind === 'image'
            ? b.uploadDropImage || 'Oder Bild hierher ziehen'
            : b.uploadDropVideo || 'Oder Video hierher ziehen'}
        </span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-surface hover:bg-surface-raised text-muted hover:text-primary border border-subtle transition-colors cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          {b.uploadChoose || 'Datei wählen'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={kind === 'image' ? 'image/*' : 'video/*'}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
