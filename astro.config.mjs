import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://zexunlai.github.io',
  base: '/sdfservice',
  output: 'static',
  markdown: { shikiConfig: { theme: 'github-light' } }
});
