# One-time owner setup

These steps are required because account creation and secret entry must be completed by the account owner. They do not require hand-creating tables or editing website code.

## 1. Create and secure Supabase

1. Sign in to Supabase and select **New project**.
2. Choose an organisation, set the project name to `zexunlai-environmental-intelligence`, generate a strong database password and store it in a password manager.
3. Open **Authentication → Providers → Email**. Turn off **Allow new users to sign up**. Keep email/password sign-in enabled.
4. Open **Authentication → URL Configuration**. Set the Site URL to the final public website URL and add `http://127.0.0.1:4321` as a redirect URL for local testing.
5. From this repository, sign in to the Supabase CLI, link the new project, then apply the checked-in migrations and seed:

   ```sh
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push --include-seed
   ```

6. Open **Authentication → Users → Add user → Create new user**. Enter `zexunlai@gmail.com`, a strong password, and mark the email confirmed.
7. Run `npx supabase db push` once more. The owner bootstrap migration matches that email and creates the sole active `owner` row. If the migration was already marked applied before the user existed, open the Supabase SQL Editor and run only this idempotent statement:

   ```sql
   insert into public.admin_users(user_id,email,role,active)
   select id,email,'owner',true from auth.users where lower(email)='zexunlai@gmail.com'
   on conflict(user_id) do update set role='owner',active=true;
   ```

8. In **Project Settings → API**, copy the Project URL and publishable key. Keep the service-role key private.

## 2. Import the preserved website content

Create a local `.env` file from `.env.example` and fill in `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. Never commit this file. Run:

```sh
pnpm content:import
pnpm content:import -- --apply
```

The first command previews counts. The second imports and verifies the 21 existing article files and preserved library analyses. Compare existing slugs and drafts in `/admin/articles` before retiring Pages CMS.

## 3. Configure Cloudflare Workers

Astro 7's official Cloudflare adapter deploys SSR to **Cloudflare Workers**. The existing Cloudflare Pages site should remain live until this Worker is checked.

1. Open Cloudflare **Workers & Pages → Create → Worker** and name it `zexunlai-environmental-intelligence`.
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
5. Run **Actions → Deploy Cloudflare Worker → Run workflow**. Open the assigned `workers.dev` preview and test the public site and `/login`.
6. In Cloudflare add the final custom domain to the Worker, then update `PUBLIC_SITE_URL` and Supabase's Site URL. Keep the old Pages deployment until navigation, article slugs, legal pages, images and SEO have been compared.

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
