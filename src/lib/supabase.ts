import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { AstroCookies } from 'astro';
import { env as cloudflareEnv } from 'cloudflare:workers';

type RuntimeLocals = App.Locals | undefined;

export function envValue(locals: RuntimeLocals, key: keyof ImportMetaEnv) {
  void locals;
  return String((cloudflareEnv as Record<string, unknown>)[key] ?? '');
}

export function isSupabaseConfigured(locals?: RuntimeLocals) {
  return Boolean(envValue(locals, 'SUPABASE_URL') && envValue(locals, 'SUPABASE_PUBLISHABLE_KEY'));
}

export function createPublicClient(locals?: RuntimeLocals) {
  const url = envValue(locals, 'SUPABASE_URL');
  const key = envValue(locals, 'SUPABASE_PUBLISHABLE_KEY');
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function createAstroServerClient(request: Request, cookies: AstroCookies, locals?: RuntimeLocals) {
  const url = envValue(locals, 'SUPABASE_URL');
  const key = envValue(locals, 'SUPABASE_PUBLISHABLE_KEY');
  if (!url || !key) return null;
  return createServerClient(url, key, {
    cookies: {
      getAll() { return parseCookieHeader(request.headers.get('Cookie') ?? '').map(({ name, value }) => ({ name, value })); },
      setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value, options }) => cookies.set(name, value, options)); },
    },
  });
}

export function createServiceClient(locals?: RuntimeLocals) {
  const url = envValue(locals, 'SUPABASE_URL');
  const key = envValue(locals, 'SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Server-only Supabase service credentials are not configured.');
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function getAdminContext(request: Request, cookies: AstroCookies, locals?: RuntimeLocals) {
  const client = createAstroServerClient(request, cookies, locals);
  if (!client) return { client: null, user: null, admin: null };
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { client, user: null, admin: null };
  const { data: admin } = await client.from('admin_users').select('id,user_id,email,role,active').eq('user_id', user.id).eq('active', true).maybeSingle();
  return { client, user, admin };
}
