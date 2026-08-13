import { formatDistanceToNow } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

const LOCALES = {
  de,
  en: enUS,
} as const;

/**
 * Human-readable relative date, e.g. "vor 2 Tagen" (de) / "2 days ago" (en).
 * Falls das Datum in der Zukunft liegt oder ungültig ist, wird ein leerer
 * String zurückgegeben (Aufrufer kann dann das rohe Datum rendern).
 */
export function formatRelativeDate(
  dateInput: string | Date | undefined | null,
  lang: 'de' | 'en' = 'de'
): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';
  const locale = LOCALES[lang] ?? de;
  return formatDistanceToNow(date, { addSuffix: true, locale });
}
