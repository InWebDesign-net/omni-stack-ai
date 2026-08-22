'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { BOTTOM_OBSTRUCTION_EVENT } from '@/components/FooterOverlapProbe';
import {
  OPTIONAL_CATEGORIES,
  type OptionalCategory,
  getDecision,
  setDecision,
} from '@/lib/consent';

interface BannerCategory {
  key: string;
  label: string;
  description?: string;
  onByDefault?: boolean;
}

interface BannerCookie {
  name: string;
  category: string;
  storage?: string;
  provider?: string;
  purpose?: string;
  retention?: string;
}

interface BannerContent {
  enabled?: boolean;
  heading?: string;
  body?: string;
  notice?: string;
  acceptAllLabel?: string;
  rejectAllLabel?: string;
  customiseLabel?: string;
  saveSelectionLabel?: string;
  privacyUrl?: string;
  privacyLabel?: string;
  categories?: BannerCategory[];
  cookies?: BannerCookie[];
}

/** Reopens the banner from anywhere — the footer link dispatches this. */
export const OPEN_CONSENT_EVENT = 'omni:open-consent';

export function ConsentBanner() {
  const { lang } = useApp();
  const [content, setContent] = useState<BannerContent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selection, setSelection] = useState<Record<OptionalCategory, boolean>>({
    preferences: false,
    statistics: false,
    marketing: false,
  });
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/cookie-banner?locale=${lang}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        setContent(data);
        // Only ask when there is no decision that still applies. A decision made
        // against an older category list reads as none, so the visitor is asked
        // again rather than being assumed to have answered a question that did
        // not exist yet.
        if (data?.enabled && !getDecision()) setIsVisible(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [lang]);

  // Reopening from the footer, so a decision is never final.
  useEffect(() => {
    const onOpen = () => {
      const current = getDecision();
      if (current) setSelection(current.categories);
      setShowDetails(true);
      setIsVisible(true);
    };
    window.addEventListener(OPEN_CONSENT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, onOpen);
  }, []);

  /**
   * Publishes how tall the banner is, so the floating chat and upload manager
   * lift above it instead of being covered. `FooterOverlapProbe` folds this
   * into `--footer-overlap`, which those elements already read — one owner for
   * "how much of the bottom edge is occupied", rather than a second offset.
   */
  useEffect(() => {
    const root = document.documentElement;

    const publish = (height: number) => {
      root.style.setProperty('--consent-banner-height', `${Math.round(height)}px`);
      // Setting a custom property does not notify anyone, so say so explicitly.
      window.dispatchEvent(new Event(BOTTOM_OBSTRUCTION_EVENT));
    };

    if (!isVisible || !containerRef.current) {
      publish(0);
      return;
    }

    const el = containerRef.current;
    const observer = new ResizeObserver(() => publish(el.getBoundingClientRect().height));
    observer.observe(el);
    publish(el.getBoundingClientRect().height);

    return () => {
      observer.disconnect();
      publish(0);
    };
  }, [isVisible, showDetails]);

  if (!isVisible || !content?.enabled) return null;

  const decide = (categories: Partial<Record<OptionalCategory, boolean>>) => {
    setDecision(categories);
    setIsVisible(false);
    setShowDetails(false);
  };

  const acceptAll = () => decide({ preferences: true, statistics: true, marketing: true });
  const rejectAll = () => decide({ preferences: false, statistics: false, marketing: false });
  const saveSelection = () => decide(selection);

  const categories = content.categories || [];
  const cookies = content.cookies || [];

  // Same weight for all three: a decline that looks less inviting than the
  // accept, or that hides behind "customise", is the pattern this exists to
  // avoid.
  const buttonBase =
    'flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 border';

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={content.heading || 'Cookie-Einstellungen'}
      /*
       * Deliberately not a dialog and deliberately not focus-trapping: someone
       * who wants to read the page before deciding must be able to. It spans
       * the full width so it does not compete for the bottom-right corner.
       */
      className="fixed inset-x-0 bottom-0 z-[60] bg-surface-raised/98 border-t border-subtle backdrop-blur-xl shadow-2xl animate-fadeIn"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        <h2 className="text-base sm:text-lg font-bold text-primary">{content.heading}</h2>
        {content.body && <p className="mt-1.5 text-sm text-muted leading-relaxed">{content.body}</p>}

        {content.notice && (
          <p className="mt-2.5 text-xs text-muted/90 bg-surface border border-subtle rounded-xl px-3 py-2 leading-relaxed">
            {content.notice}
          </p>
        )}

        {showDetails && (
          <div className="mt-4 space-y-2.5 max-h-[38vh] overflow-y-auto pr-1">
            {categories.map((category) => {
              const isNecessary = category.key === 'necessary';
              const isOptional = (OPTIONAL_CATEGORIES as string[]).includes(category.key);
              const entries = cookies.filter((c) => c.category === category.key);
              const checked = isNecessary || (isOptional && selection[category.key as OptionalCategory]);

              return (
                <div key={category.key} className="bg-surface border border-subtle rounded-xl p-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(checked)}
                      disabled={!isOptional}
                      onChange={(e) =>
                        isOptional &&
                        setSelection((prev) => ({
                          ...prev,
                          [category.key as OptionalCategory]: e.target.checked,
                        }))
                      }
                      className="mt-1 w-4 h-4 accent-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-primary">{category.label}</span>
                      {category.description && (
                        <span className="block text-xs text-muted mt-0.5 leading-relaxed">
                          {category.description}
                        </span>
                      )}
                    </span>
                  </label>

                  {entries.length > 0 && (
                    <ul className="mt-2 ml-7 space-y-1">
                      {entries.map((entry) => (
                        <li key={entry.name} className="text-[11px] text-muted font-mono">
                          {entry.name}
                          {entry.retention ? ` · ${entry.retention}` : ''}
                          {entry.purpose ? <span className="font-sans"> — {entry.purpose}</span> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <button type="button" onClick={rejectAll} className={`${buttonBase} bg-surface border-subtle text-primary hover:bg-surface-raised`}>
            {content.rejectAllLabel || 'Ablehnen'}
          </button>

          {showDetails ? (
            <button type="button" onClick={saveSelection} className={`${buttonBase} bg-surface border-subtle text-primary hover:bg-surface-raised`}>
              {content.saveSelectionLabel || 'Auswahl speichern'}
            </button>
          ) : (
            <button type="button" onClick={() => setShowDetails(true)} className={`${buttonBase} bg-surface border-subtle text-primary hover:bg-surface-raised`}>
              {content.customiseLabel || 'Anpassen'}
            </button>
          )}

          <button type="button" onClick={acceptAll} className={`${buttonBase} bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500`}>
            {content.acceptAllLabel || 'Alle zulassen'}
          </button>
        </div>

        {content.privacyUrl && (
          <a href={content.privacyUrl} className="inline-block mt-3 text-xs text-muted hover:text-primary underline underline-offset-2">
            {content.privacyLabel || 'Datenschutz'}
          </a>
        )}
      </div>
    </div>
  );
}
