/// <reference types="astro/client" />

declare module 'cloudflare:workers' {
  export const env: Record<string, string | undefined>;
}

declare namespace App {
  interface Locals {
    runtime?: { env?: Record<string, string> };
    user?: { id: string; email?: string } | null;
    isAdmin?: boolean;
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL?: string;
  readonly SUPABASE_PUBLISHABLE_KEY?: string;
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;
  readonly PUBLIC_SITE_URL?: string;
  readonly GOOGLE_CLOUD_PROJECT_ID?: string;
  readonly GOOGLE_CLOUD_LOCATION?: string;
  readonly GOOGLE_TRANSLATE_SERVICE_ACCOUNT_EMAIL?: string;
  readonly GOOGLE_TRANSLATE_PRIVATE_KEY?: string;
  readonly GOOGLE_TRANSLATE_GLOSSARY_ID?: string;
  readonly GOOGLE_TRANSLATE_GLOSSARY_BUCKET?: string;
}
