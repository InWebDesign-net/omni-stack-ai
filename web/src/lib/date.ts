import { format, formatDistanceToNow } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

const LOCALES = {
  de,
  en: enUS,
} as const;

function resolveLocale(lang: 'de' | 'en' = 'de') {
  return LOCALES[lang] ?? de;
}

function toDate(dateInput: string | Date | undefined | null): Date | null {
  if (!dateInput) return null;
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Human-readable relative date, e.g. "vor 2 Tagen" (de) / "2 days ago" (en).
 * Returns '' when the input is missing or invalid (caller can render fallbacks).
 */
export function formatRelativeDate(
  dateInput: string | Date | undefined | null,
  lang: 'de' | 'en' = 'de'
): string {
  const date = toDate(dateInput);
  if (!date) return '';
  return formatDistanceToNow(date, { addSuffix: true, locale: resolveLocale(lang) });
}

/**
 * Human-readable absolute date, e.g. "11. August 2026" (de) / "August 11, 2026" (en).
 * Returns '' when the input is missing or invalid.
 */
export function formatAbsoluteDate(
  dateInput: string | Date | undefined | null,
  lang: 'de' | 'en' = 'de'
): string {
  const date = toDate(dateInput);
  if (!date) return '';
  const pattern = lang === 'en' ? 'MMMM d, yyyy' : 'd. MMMM yyyy';
  return format(date, pattern, { locale: resolveLocale(lang) });
}
