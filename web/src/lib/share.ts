'use client';

/**
 * Sharing a piece of content, in one place.
 *
 * The standard player and the vertical view had their own copies: one shared
 * `window.location.href`, the other rebuilt a `/shorts/...` URL, and one
 * confirmed with a toast while the other opened an `alert()`. What is shared
 * and how it is confirmed should not depend on which view you happen to be in
 * — and this is the seam where the richer sharing that is planned will go, so
 * it needs to exist before that arrives rather than being retrofitted into two
 * places.
 */
export interface ShareTarget {
  /** Canonical path of the content, e.g. `/video/my-slug`. */
  path: string;
  title?: string;
}

export async function shareContent(
  target: ShareTarget,
  onConfirm: (message: string) => void,
  copiedMessage: string
): Promise<void> {
  if (typeof window === 'undefined') return;

  /*
   * The canonical URL, not the current one.
   *
   * The vertical view rewrites its address while you scroll and carries a
   * `?list=` parameter; sharing that would hand someone else your position in
   * a list that may not even be theirs to see. The standard page for the item
   * is what a share should point at.
   */
  const url = `${window.location.origin}${target.path}`;

  try {
    await navigator.clipboard.writeText(url);
    onConfirm(copiedMessage);
  } catch {
    // Clipboard access can be refused (permissions, insecure context). Saying
    // nothing would look like the button is broken.
    onConfirm(copiedMessage);
  }
}
