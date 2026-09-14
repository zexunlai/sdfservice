export const defaultLocale = 'en' as const;
export const locales = ['en', 'zh-TW'] as const;
export type Locale = typeof locales[number];

export const ui = {
  en: { home: 'Home', expertise: 'Expertise', insights: 'Insights', library: 'Library', about: 'About', contact: 'Contact' },
  'zh-TW': { home: '首頁', expertise: '專業領域', insights: '觀點文章', library: '方法學資料庫', about: '關於', contact: '聯絡' }
} satisfies Record<Locale, Record<string, string>>;

export function useTranslations(locale: Locale = defaultLocale) {
  return (key: keyof typeof ui.en) => ui[locale][key] ?? ui[defaultLocale][key];
}
