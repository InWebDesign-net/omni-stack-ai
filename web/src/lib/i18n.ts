import de from '@/dictionaries/de.json';
import en from '@/dictionaries/en.json';

export type Locale = 'de' | 'en';

export type Dictionary = {
  [key: string]: any;
};

const dictionaries: Record<Locale, Dictionary> = {
  de,
  en,
};

export function getDictionary(lang: string = 'de'): Dictionary {
  const normalizedLang = (lang || 'de').toLowerCase() as Locale;
  return dictionaries[normalizedLang] || dictionaries.de;
}
