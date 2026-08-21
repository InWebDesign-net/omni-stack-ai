'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Save, Loader2, Globe, Trash2, AlertTriangle, Archive, Trash, Check, Sparkles } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useContentEditForm, type LocaleData } from '@/lib/hooks/useContentEditForm';
import { VisibilitySelector } from '@/components/VisibilitySelector';
import { ImageUploadField } from '@/components/common/ImageUploadField';


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


export default function VideoSettingsModal({
  documentId,
  slug,
  onClose,
  onSave,
  onDelete,
}: VideoSettingsModalProps) {
  const { t } = useApp();
  const [showDiscard, setShowDiscard] = useState(false);
  const [snapshot, setSnapshot] = useState<{ form: { de: LocaleData; en: LocaleData }; visibility: string; thumbnail?: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    activeLocale, setActiveLocale, form, setForm, current, visibility, setVisibility,
    thumbnail, setThumbnail,
    loading, saving, deleting, error, setError, newTag, setNewTag,
    updateField, addTag, removeTag, buildLocaleUpdates, save, remove,
  } = useContentEditForm('video', {
    isOpen: true,
    documentId,
    fallback: { thumbnailUrl: `/media/thumbnails/${slug}-1.png` },
    onLoaded: setSnapshot,
    // Videos store the summary as Strapi blocks, same as articles.
    serializeLocale: (_locale, data) => ({
      title: data.title,
      summary: textToBlocks(data.summary),
      tags: data.tags,
    }),
  });

  const requestClose = () => {
    if (isDirty) {
      setShowDiscard(true);
    } else {
      onClose();
    }
  };

  const handleSave = async () => {
    if (await save()) {
      setSnapshot({ form, visibility });
      if (onSave) onSave();
      onClose();
    }
  };

  const handleDelete = async (hardDelete: boolean) => {
    if (await remove(hardDelete)) {
      if (onDelete) onDelete(hardDelete);
      onClose();
    }
  };

  const isDirty =
    !!snapshot &&
    (snapshot.visibility !== visibility ||
      snapshot.thumbnail !== thumbnail ||
      JSON.stringify(snapshot.form) !== JSON.stringify(form));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-surface-raised border border-subtle rounded-3xl shadow-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-subtle">
          <div>
            <h2 className="text-xl font-extrabold text-primary flex items-center gap-2">
              <span>{t?.videoSettings?.title || 'Video bearbeiten'}</span>
            </h2>
            <p className="text-xs text-muted mt-1">
              Sprachversionen (DE/EN) und Sichtbarkeit für dieses Video anpassen.
            </p>
          </div>
          <button
            onClick={requestClose}
            className="p-2 rounded-xl text-muted hover:text-primary hover:bg-surface transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
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
            {/* Language Tabs for translatable content (Full Width) */}
            <div className="flex items-center gap-2 p-1 bg-surface border border-subtle rounded-xl w-full">
              {(['de', 'en'] as const).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setActiveLocale(loc)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeLocale === loc
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-muted hover:text-primary'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  {loc === 'de' ? 'Deutsch (DE)' : 'English (EN)'}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-primary mb-1.5">
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
                  className="w-full bg-surface border border-subtle rounded-xl px-4 py-2.5 text-sm text-primary focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1.5">
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
                  className="w-full bg-surface border border-subtle rounded-xl px-4 py-2.5 text-sm text-primary focus:border-indigo-500 outline-none transition-all resize-y"
                />
              </div>

              {/* Tags: editable per locale */}
              <div>
                <label className="block text-xs font-semibold text-primary mb-1.5">
                  {t?.videoSettings?.tagsLabel || 'Tags'} ({activeLocale.toUpperCase()})
                </label>

                {current.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {current.tags.map((tag: string, i: number) => (
                      <span
                        key={`${tag}-${i}`}
                        className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-raised border border-subtle text-xs font-mono text-primary"
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
                          className="text-muted hover:text-rose-400 transition-all cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted block mb-2">{t?.videoSettings?.noTags || 'Keine Tags'}</span>
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
                    className="flex-1 px-3 py-1.5 bg-surface border border-subtle rounded-lg text-xs text-primary placeholder-faint focus:border-indigo-500 outline-none transition-all"
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
            <div className="pt-4 border-t border-subtle space-y-2">
              <VisibilitySelector value={visibility} onChange={setVisibility} t={t} />
            </div>

            {/* Thumbnail Selection & Upload */}
            <div className="pt-4 border-t border-subtle space-y-3">
              <label className="block text-xs font-semibold text-primary">
                {t?.videoSettings?.thumbnailTitle || 'Vorschaubild (Thumbnail)'}
              </label>

              {/* 6 Generated Video Frames */}
              <div>
                <p className="text-[11px] text-muted mb-2">
                  {t?.videoSettings?.pickFrame || 'Aus generierten Videobildern wählen:'}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((idx) => {
                    const frameUrl = `/media/thumbnails/${slug}-${idx}.png`;
                    const isSelected = thumbnail === frameUrl;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setThumbnail(frameUrl)}
                        className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all cursor-pointer group bg-surface ${
                          isSelected
                            ? 'border-indigo-500 ring-2 ring-indigo-500/30 scale-105'
                            : 'border-subtle hover:border-indigo-500/50'
                        }`}
                      >
                        <Image
                          src={frameUrl}
                          alt={`Frame ${idx}`}
                          fill
                          sizes="120px"
                          className="object-cover"
                          unoptimized
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                            <div className="p-1 rounded-full bg-indigo-600 text-white shadow-md">
                              <Check className="w-3 h-3" />
                            </div>
                          </div>
                        )}
                        <span className="absolute bottom-0.5 right-1 text-[9px] font-mono text-white/90 bg-black/60 px-1 rounded">
                          #{idx}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Thumbnail Upload */}
              <div className="pt-2">
                <p className="text-[11px] text-muted mb-1.5">
                  {t?.videoSettings?.customThumb || 'Oder ein eigenes Vorschaubild hochladen:'}
                </p>
                <ImageUploadField
                  value={thumbnail.startsWith('/media/thumbnails/') && !thumbnail.includes('thumbnails-') ? '' : thumbnail}
                  onChange={(url) => setThumbnail(url)}
                  aspectRatio="video"
                  folder="thumbnails"
                  description="Empfohlen: 16:9 Format (1280x720, JPG/PNG/WEBP)"
                />
              </div>
            </div>

            {/* Save & Delete Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-subtle">
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
                  className="py-2.5 px-4 bg-surface hover:bg-surface-raised text-muted hover:text-primary border border-subtle rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || (!form.de.title.trim() && !form.en.title.trim())}
                  className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-surface-raised disabled:text-faint text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
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
                <h4 className="text-sm font-bold text-primary mb-1">Video löschen oder archivieren?</h4>
                <p className="text-xs text-primary leading-relaxed">
                  Wähle zwischen dem Archivieren (Soft Delete) oder dem endgültigen Löschen aus der Datenbank.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Option 1: Soft Delete */}
              <div className="p-4 bg-surface border border-subtle rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <Archive className="w-4 h-4" />
                  <span>Soft Delete (Als privat archivieren)</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Das Video wird auf <strong className="text-primary">Privat</strong> gesetzt. Es ist für Besucher nicht mehr öffentlich zu sehen, bleibt aber in deinem Profil erhalten.
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
              <div className="p-4 bg-surface border border-rose-500/20 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                  <Trash className="w-4 h-4" />
                  <span>Endgültig löschen (Unwiderruflich)</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
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
              className="w-full py-2.5 bg-surface hover:bg-surface-raised text-muted hover:text-primary border border-subtle rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Abbrechen & Zurück
            </button>
          </div>
        )}

        {/* Discard confirmation */}
        {showDiscard && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-surface-raised border border-subtle rounded-2xl shadow-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-primary">{t?.videoSettings?.discardConfirmTitle || 'Änderungen verwerfen?'}</h3>
              <p className="text-sm text-muted">{t?.videoSettings?.discardConfirmText || 'Nicht gespeicherte Änderungen gehen verloren.'}</p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDiscard(false)}
                  className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-raised text-muted hover:text-primary border border-subtle text-sm font-semibold transition-all cursor-pointer"
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
