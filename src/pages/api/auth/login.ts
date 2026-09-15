import type { APIRoute } from 'astro';
import { createAstroServerClient } from '../../../lib/supabase';
export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, locals, redirect }) => {
  const form = await request.formData();
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const next = String(form.get('next') ?? '/admin/');
  const safeNext = next.startsWith('/admin') ? next : '/admin/';
  const client = createAstroServerClient(request, cookies, locals);
  if (!client || !email || !password) return redirect('/login/?error=configuration', 303);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) return redirect(`/login/?error=credentials&next=${encodeURIComponent(safeNext)}`, 303);
  const { data: admin } = await client.from('admin_users').select('id').eq('user_id', data.user.id).eq('active', true).maybeSingle();
  if (!admin) { await client.auth.signOut(); return new Response('Forbidden', { status: 403 }); }
  await client.from('audit_log').insert({ admin_user_id: admin.id, action: 'login', entity_type: 'auth' });
  return redirect(safeNext, 303);
};
