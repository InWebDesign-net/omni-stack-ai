'use client';

import { useEffect } from 'react';

/**
 * Fired by anything that starts or stops occupying the bottom edge of the
 * viewport, so this probe can fold it into `--footer-overlap`.
 */
export const BOTTOM_OBSTRUCTION_EVENT = 'omni:bottom-obstruction-changed';

/**
 * Publishes how far the footer currently intrudes into the viewport as
 * `--footer-overlap` on the document root.
 *
 * Floating elements are `position: fixed`, so they know nothing about page flow
 * and will happily sit on top of the footer once it scrolls into view — which is
 * how the chat bubble ended up covering the "Entwickelt von InWebDesign" link.
 *
 * Publishing one variable instead of giving each floating element its own
 * observer means the chat widget, the upload manager and the toasts all lift
 * together, and anything added later gets the behaviour by using the variable.
 */
export function FooterOverlapProbe({ targetRef }: { targetRef: React.RefObject<HTMLElement | null> }) {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const el = targetRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const viewport = window.innerHeight;
      // How many pixels of the viewport the footer currently occupies. Capped at
      // half the viewport: a footer taller than the screen would otherwise push
      // the floating elements off the top edge, which is worse than the overlap
      // this exists to prevent.
      const footerOverlap = Math.max(0, viewport - top);

      // The consent banner sits at the bottom edge too, and the floating
      // elements have to clear whichever of the two is taller. It publishes its
      // own height and this stays the single owner of `--footer-overlap`, so
      // nothing downstream needs a second offset to reason about.
      const bannerHeight =
        parseFloat(getComputedStyle(root).getPropertyValue('--consent-banner-height')) || 0;

      const overlap = Math.min(Math.max(footerOverlap, bannerHeight), viewport / 2);
      root.style.setProperty('--footer-overlap', `${Math.round(overlap)}px`);
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    // The consent banner appears and disappears without either, and it changes
    // how much of the bottom edge is occupied — so it says so, and this
    // re-measures. Without it the variable keeps a value from before the banner
    // existed and the floating elements sit on top of it.
    window.addEventListener(BOTTOM_OBSTRUCTION_EVENT, schedule);

    // The footer's own height can change (wrapping links, font loading) without
    // a scroll or resize event.
    const observer = new ResizeObserver(schedule);
    if (targetRef.current) observer.observe(targetRef.current);

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener(BOTTOM_OBSTRUCTION_EVENT, schedule);
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      root.style.removeProperty('--footer-overlap');
    };
  }, [targetRef]);

  return null;
}
