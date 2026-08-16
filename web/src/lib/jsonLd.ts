/**
 * Safely stringifies data for embedding inside an HTML <script type="application/ld+json"> tag.
 * Replaces HTML-sensitive characters (<, >, &, \u2028, \u2029) with unicode escape sequences
 * to prevent script injection (XSS) breakout attacks.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
