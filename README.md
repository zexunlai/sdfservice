# Ze-Xun Lai — static website

This website is published with GitHub Pages. It has no Cloudflare Worker, Supabase database, login, or server-side API.

## Publish an article or PDF

Put your files in the `articles/` folder, then commit and push with GitHub Desktop.

Use the same filename for an online article and its PDF. Start filenames with the publication date so the newest work appears first.

```text
articles/2026-10-11-nature-risk.html
articles/2026-10-11-nature-risk.pdf
```

- Add only the HTML file: readers see **Read article**.
- Add only the PDF: readers see **Open PDF** in their browser.
- Add both: readers can choose either format.

GitHub Actions rebuilds the homepage and archive automatically after every push to `main`.

The `content/legacy-articles/` folder contains the published Markdown articles migrated from the previous site. It is rebuilt into ordinary HTML pages automatically; you do not need to edit it for new work.

## Local preview

Run `node scripts/build-static.mjs`. The finished website is written to `dist/`.
