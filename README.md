# Ze-Xun Lai — Environmental Intelligence

This public website is published with GitHub Pages at `https://zexunlai.github.io/sdfservice/`.

It is a static site: it has no Cloudflare Worker, Supabase database, login, contact-form endpoint, or server-side API. Public pages, insights and library entries are built from the files in this repository.

## Publish an HTML article or PDF

Put your files in `articles/`, then commit and push with GitHub Desktop. The deployment workflow creates the Publications index automatically.

Use the same filename for an online article and its PDF. Starting filenames with a publication date keeps the newest work first.

```text
articles/2026-10-11-nature-risk.html
articles/2026-10-11-nature-risk.pdf
```

- HTML only: readers see **Read HTML**.
- PDF only: readers see **Open PDF** in the browser.
- Both: readers can choose either format.

## Existing editorial content

- `src/content/insights/`: public insight articles.
- `src/content/library/`: methods and resource-library entries.
- `src/content/research/` and `src/content/projects/`: retained source collections for future expansion.

## Local build

With pnpm installed, run `pnpm run build`. The finished static site is written to `dist/`.
