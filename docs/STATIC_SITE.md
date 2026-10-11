# Static site architecture

SDFService is built as a static Astro site for GitHub Pages at `https://zexunlai.github.io/sdfservice/`.

- `/insights/` shows uploaded PDF work. It supports keyword search and filtering across the five expertise tags.
- `/library/` separates original methodology analyses from external official resources, with independent library filters.
- No public route reads from Supabase, Cloudflare, or any other backend service.

The old hosted application is preserved only in `歷史資料/` for reference. It is not part of the deployable website.
