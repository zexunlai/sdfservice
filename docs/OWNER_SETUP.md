# One-time owner setup

This document records completed owner setup and the remaining external deployment steps. No secret values belong in this file.

## Current status — 15 September 2026

- **DONE — Supabase project:** `zexunlai-environmental-intelligence`
- **DONE — Linked project ref:** `kwurwntwlluypviyjkpb`
- **DONE — Authentication:** email/password enabled; public signup and anonymous sign-in disabled
- **DONE — Owner:** `zexunlai@gmail.com` mapped as the sole active `owner`
- **DONE — Database:** nine migrations applied and 35 required tables verified
- **DONE — Seed:** five expertise areas, 47 hubs, 186 resources, 157 verified resources, 29 needs-review resources and 11 bilingual glossary concepts
- **DONE — Content migration:** 21 articles and two analyses imported and compared with their Markdown sources
- **DONE — RLS:** anonymous, owner and temporary non-admin boundaries tested against the remote project
- **DONE — Local integration:** `.env.local` is ignored, permission-limited and connected to remote Supabase
- **REMAINING — Cloudflare production Pages deployment verification**
- **REMAINING — Google Cloud Translation and glossary sync**
- **REMAINING — Production cutover and Pages CMS retirement after comparison**

## 1. Supabase connection and security — completed

The repository is linked to the project above. The checked-in migrations were applied through the official Supabase CLI:

```sh
supabase link --project-ref kwurwntwlluypviyjkpb
supabase db push --include-seed
```

Remote verification commands are available for future schema changes:

```sh
pnpm db:verify:remote
pnpm auth:verify:remote
```

These tests confirm owner CRUD, public signup disabled, anonymous sign-in disabled, non-admin denial, draft isolation, private glossary isolation, official-resource publication rules and contact INSERT-only access. They create temporary rows and remove them before finishing.

## 2. Preserved website content — completed

The production import completed without changing the source Markdown. Verification commands remain available:

```sh
pnpm content:import
pnpm content:import -- --apply
pnpm content:verify:remote
```

Remote counts are 21 articles (11 published, 10 draft) and two analyses (one published, one draft). Titles, slugs, dates, areas, bodies, source language and publication states match the source files. `.pages.yml` and Markdown remain preserved until the production cutover is approved.

## 3. Configure Cloudflare Worker

Astro's official Cloudflare adapter uses the SSR Worker `zexunlai-website` at `https://zexunlai-website.zotex0426.workers.dev`. Do not create a Worker or project named after Supabase.

1. Open Cloudflare **Workers & Pages → zexunlai-website → Settings → Variables and Secrets**.
2. Under **Settings → Variables and Secrets**, add encrypted secrets:
   - `SUPABASE_URL` — Supabase Project URL
   - `SUPABASE_PUBLISHABLE_KEY` — Supabase publishable key
   - `PUBLIC_SITE_URL` — final canonical site URL
3. Create a Cloudflare API token with **Workers Scripts: Edit** and the scope limited to your account.
4. In GitHub open **Settings → Secrets and variables → Actions → New repository secret** and add:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `PUBLIC_SITE_URL`
5. Run **Actions → Deploy Cloudflare Pages → Run workflow**. The workflow explicitly targets the existing Pages project `zexunlai-website`.
6. Keep the current Pages deployment until navigation, article slugs, legal pages, images and SEO have been compared.

## 4. Enable the weekly resource checker

GitHub already contains `check-official-resources.yml`. After the Supabase secrets above are present, open **Actions → Check official resources → Run workflow** once. Confirm that `resource_checks` receives rows and that 403 responses appear as `blocked` rather than `broken`.

## 5. Final cutover checks

Sign in at `/login` and complete these workflows: edit the homepage; create, preview and publish an article; create and verify an official resource; create a resource version; repair a test broken link; edit About. Confirm the changes appear immediately without a GitHub build. Then archive `.pages.yml` and stop using Pages CMS.

## 6. Enable bilingual machine translation and glossary sync

The site works without Google Cloud; human translations, fallback and glossary definitions remain available. Complete this section to enable **Translate with Google** and **Sync Google glossary**.

1. In Google Cloud Console, create or select a project and note its Project ID.
2. Open **APIs & Services → Library**, enable **Cloud Translation API** and **Cloud Storage API**, and attach a billing account required by Google Cloud Translation.
3. Open **Cloud Storage → Buckets → Create**. Use a region compatible with the Translation glossary location (for example `us-central1`). This bucket stores generated glossary source files only; you do not edit CSV files manually.
4. Open **IAM & Admin → Service Accounts → Create service account**. Grant the narrow roles **Cloud Translation API User** and **Storage Object Admin** for that glossary bucket. Create a JSON key and store it securely.
5. In Cloudflare Worker **Settings → Variables and Secrets**, add encrypted secrets:
   - `GOOGLE_CLOUD_PROJECT_ID` — Google project ID
   - `GOOGLE_CLOUD_LOCATION` — glossary region, for example `us-central1`
   - `GOOGLE_TRANSLATE_SERVICE_ACCOUNT_EMAIL` — `client_email` from the JSON key
   - `GOOGLE_TRANSLATE_PRIVATE_KEY` — full `private_key` from the JSON key, including BEGIN/END lines
   - `GOOGLE_TRANSLATE_GLOSSARY_ID` — `environmental-intelligence`
   - `GOOGLE_TRANSLATE_GLOSSARY_BUCKET` — bucket name only
6. Sign in to `/admin`, open **Translation → Glossary**, review the seeded terms, then open **Translations → Sync Google glossary**. The server generates and uploads the provider file, creates the Google glossary, and records the sync.
7. Test one draft article with **Translate with Google**. Review Terminology QA, preview the translation, then publish it. Raw machine output displays Google attribution; marking a translation human-reviewed changes the public credit according to the saved status.

Never put the service-account JSON file or private key in GitHub. The Google credentials have no `PUBLIC_` prefix and are used only by owner-protected server endpoints.
