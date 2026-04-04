import { en } from './locales/en';
import { fr } from './locales/fr';
import { es } from './locales/es';
import { de } from './locales/de';

export type SupportedLang = 'en' | 'fr' | 'es' | 'de';

const locales: Record<SupportedLang, typeof en> = { en, fr, es, de };

function getNestedValue(obj: any, path: string): string | undefined {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

export function t(
  key: string,
  lang: string = 'en',
  params?: Record<string, string | number>
): string {
  const safeLang = (lang in locales ? lang : 'en') as SupportedLang;
  const locale = locales[safeLang];

  let value: string =
    getNestedValue(locale, key) ??
    getNestedValue(locales.en, key) ??
    key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    }
  }

  return value;
}
