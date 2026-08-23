'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';

/** How long a message stays before it fades out. */
const TOAST_MS = 3000;

/**
 * The brief confirmation the app uses after an action.
 *
 * Three files kept their own copy of this — the same piece of state, the same
 * timeout, the same fixed div — and they had already drifted: two placements,
 * two colour schemes, and one surface that used `alert()` instead. Keeping the
 * state and the markup together means the next surface gets it right by using
 * it rather than by remembering to copy it.
 */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(text);
    // Cleared through the ref so a second message restarts the clock rather
    // than being cut short by the first one's timeout.
    timer.current = setTimeout(() => setMessage(null), TOAST_MS);
  }, []);

  return { message, showToast };
}

interface ToastProps {
  message: string | null;
  /**
   * `panel` sits above the page background, `overlay` above dark full-bleed
   * media. Same component, because the difference is contrast, not behaviour.
   */
  variant?: 'panel' | 'overlay';
}

export function Toast({ message, variant = 'panel' }: ToastProps) {
  if (!message) return null;

  const isOverlay = variant === 'overlay';

  return (
    <div
      role="status"
      aria-live="polite"
      style={isOverlay ? undefined : { bottom: `calc(6rem + var(--footer-overlap, 0px))` }}
      className={
        isOverlay
          ? 'fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] bg-black/85 border border-white/15 text-white px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl animate-fadeIn flex items-center gap-2'
          : 'fixed right-6 z-50 bg-surface-raised border border-indigo-500/40 text-primary px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl animate-fadeIn flex items-center gap-2'
      }
    >
      <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}
