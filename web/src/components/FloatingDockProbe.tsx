'use client';

import { useEffect } from 'react';

/**
 * Publishes how much vertical room the chat currently occupies in the
 * bottom-right corner as `--chat-dock-height` on the document root.
 *
 * The chat and the upload manager are both `position: fixed` in that corner and
 * knew nothing about each other, so a minimised upload manager sat on top of
 * the chat bubble. Rather than hard-coding an offset — which breaks the moment
 * either element changes size — the chat publishes its footprint and anything
 * stacking above it reads the variable.
 *
 * The chat owns the base slot on purpose: it is the permanent element, and a
 * control that moves whenever an upload starts is harder to aim at than one
 * that stays put.
 */
export function FloatingDockProbe() {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    let observed: Element | null = null;
    const resizeObserver = new ResizeObserver(() => schedule());

    function measure() {
      frame = 0;
      const el = document.querySelector('[data-omni-dock="chat"]');

      if (el !== observed) {
        if (observed) resizeObserver.unobserve(observed);
        if (el) resizeObserver.observe(el);
        observed = el;
      }

      if (!el) {
        root.style.setProperty('--chat-dock-height', '0px');
        return;
      }

      // Height plus the gap between stacked elements. Capped: an open chat
      // panel is tall, and lifting by its full height would push whatever
      // stacks above it off the top of the screen — worse than the overlap
      // this exists to prevent.
      const height = el.getBoundingClientRect().height + 12;
      const capped = Math.min(height, window.innerHeight * 0.6);
      root.style.setProperty('--chat-dock-height', `${Math.round(capped)}px`);
    }

    function schedule() {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    }

    measure();
    window.addEventListener('resize', schedule);

    // The chat mounts, unmounts and swaps between bubble and panel, none of
    // which fires resize.
    const mutationObserver = new MutationObserver(schedule);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('resize', schedule);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      if (frame) cancelAnimationFrame(frame);
      root.style.removeProperty('--chat-dock-height');
    };
  }, []);

  return null;
}
