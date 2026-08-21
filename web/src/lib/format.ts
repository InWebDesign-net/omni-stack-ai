/**
 * Number formatting that survives hydration.
 *
 * `n.toLocaleString()` without an argument asks the *runtime* for its locale.
 * Node here resolves to `en-US` and renders `1,234,567`; a German browser
 * renders `1.234.567`. React compares the two and throws hydration error #418
 * — "text content does not match" — for any count that reaches a thousand.
 *
 * Naming the locale makes both sides agree. `lang` defaults to `de` because
 * that is what `AppContext` holds during the first render on both server and
 * client; the stored preference is applied afterwards, as an ordinary state
 * update rather than during hydration.
 */
export function formatCount(value: number | null | undefined, lang: 'de' | 'en' = 'de'): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'de-DE').format(n);
}
