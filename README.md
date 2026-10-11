# SDFService static website

This is the only development workspace for the SDFService public website. The GitHub Pages repository is a deployment destination, not a place to develop.

The published site is fully static. It does not require Cloudflare, Supabase, a login, or a database.

## Publish a PDF insight

Put a PDF in exactly one of these folders:

```text
insights/
  sustainability-climate-change/
  geospatial-intelligence/
  biodiversity-nature/
  circular-economy/
  carbon-markets-methodologies/
```

Use a filename such as `2026-10-11-urban-heat-risk.pdf`. The date and title are read from the filename; the parent folder supplies one of the five insight tags. The Insights page provides keyword search and filtering by those five tags automatically.

## Library

The Library deliberately contains two separate layers:

- `src/content/library/`: your original methodology analyses, written in Markdown.
- `src/data/external-resources.json`: verified links to external official resources.

Visitors can search the Library, select either layer, and narrow external sources by format and access.

## Check a release locally

```bash
pnpm install
pnpm run build
```

The build first copies `insights/` into the generated public site and constructs its PDF index. Generated files in `public/insights/` and `src/data/pdf-insights.json` are intentionally not versioned.

## Deploy to GitHub Pages

When a release is ready, copy only the current site source from this workspace into `/Users/zotexlai/Documents/GitHub/zexunlai-website`, excluding `歷史資料/`, `node_modules/`, `dist/`, `.env*`, and generated files. Then commit and push from GitHub Desktop. GitHub Pages serves the `dist/` build through its existing workflow.

Historical backend material is retained under `歷史資料/` and must never be deployed.
