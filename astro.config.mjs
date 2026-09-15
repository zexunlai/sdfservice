import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://zexunlai-website.pages.dev',
  output: 'server',
  session: false,
  adapter: cloudflare({ imageService: 'compile' }),
  markdown: { shikiConfig: { theme: 'github-light' } }
});
