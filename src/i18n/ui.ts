export const defaultLocale = 'en' as const;
export const locales = ['en', 'zh-TW'] as const;
export type Locale = typeof locales[number];

export const ui = {
  en: { expertise: 'Expertise', insights: 'Insights', methodologies: 'Methodologies', research: 'Research', projects: 'Projects', about: 'About', contact: 'Contact' },
  'zh-TW': { expertise: '專業領域', insights: '觀點文章', methodologies: '碳方法學', research: '研究與學習', projects: '專案', about: '關於', contact: '聯絡' }
} satisfies Record<Locale, Record<string, string>>;

export function useTranslations(locale: Locale = defaultLocale) {
  return (key: keyof typeof ui.en) => ui[locale][key] ?? ui[defaultLocale][key];
}
