import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://zexunlai.com',
  output: 'static',
  integrations: [sitemap({ filter: (page) => !page.includes('/draft/') })],
  markdown: { shikiConfig: { theme: 'github-light' } }
});
