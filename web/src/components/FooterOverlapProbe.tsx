'use client';

import { useEffect } from 'react';

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
      const overlap = Math.min(Math.max(0, viewport - top), viewport / 2);
      root.style.setProperty('--footer-overlap', `${Math.round(overlap)}px`);
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    // The footer's own height can change (wrapping links, font loading) without
    // a scroll or resize event.
    const observer = new ResizeObserver(schedule);
    if (targetRef.current) observer.observe(targetRef.current);

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      root.style.removeProperty('--footer-overlap');
    };
  }, [targetRef]);

  return null;
}
