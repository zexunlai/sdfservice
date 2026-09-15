# Environmental Intelligence platform architecture

The public website and owner CMS share one Astro application. Astro renders public content on the server at request time, with the official Cloudflare adapter targeting Cloudflare Workers. Published pages remain indexable HTML and do not depend on client-side rendering.

Supabase owns content, authentication, PostgreSQL search and relationships, revisions, audit records and first-party website media. GitHub owns application code, migrations, the preserved Markdown source and repeatable import/export scripts. Official documents remain on their publishers' websites.

## Content migration and cutover

The Markdown collections and `.pages.yml` remain in the repository until the owner completes the first remote migration and compares the public pages. `pnpm content:import` is dry-run by default; `pnpm content:import -- --apply` imports articles and existing library analyses, then verifies counts. It preserves slugs, dates and draft/published state. No source Markdown file is deleted.

After a verified production cutover, `.pages.yml` can be archived. It must not be removed before that point.

## Security boundary

Supabase RLS is the primary database boundary. Anonymous visitors can read only published records and can insert a contact message without reading it back. An authenticated user receives no authoring rights unless an active `admin_users` row matches `auth.uid()`. Every admin route and endpoint repeats that check on the server.

The publish invariant prevents an official resource from being public unless its formal title and approved organisation domain are both confirmed and its status is `current`. A filename is stored only as internal metadata. The service-role key is never referenced by a `PUBLIC_` variable or browser code.

## Resource provenance

The initial catalog is generated from `scripts/official-resource-catalog.ts`. `supabase/seed.sql` contains 47 hubs and 186 records; network verification excluded unavailable or uncertain links from publication. The remaining 157 published records use official organisation domains. The excluded records remain `needs_review` so the owner can repair them without losing research context.

Health checks never replace URLs or delete resources. HTTP 403 is recorded as `blocked`, redirects remain distinct, and new versions preserve earlier versions. The weekly GitHub Action updates checks and statuses with the server-only service role.

## Translation and terminology

Logical articles and analyses retain one parent row with `source_language`; localized versions are linked translation rows. Status, provider, translator credit, source revision and publication are tracked per locale. Updating source content marks translated variants outdated without automatically removing the last published version. Public queries fall back to the source language when a requested translation is unavailable.

The private glossary tables are the editorial source of truth. RLS denies anonymous access to variants, avoid lists, QA rules and internal notes. `public_glossary_definitions` is the only reader-facing projection and contains approved display terms, definitions and provenance. Public article markup adds accessible definitions at render time; definitions are not permanently injected into editor content.
