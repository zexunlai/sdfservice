import { defineMiddleware } from 'astro:middleware';
import { getAdminContext } from './lib/supabase';

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
  const protectedRoute = path === '/admin' || path.startsWith('/admin/') || path.startsWith('/api/admin/');
  if (!protectedRoute) return next();

  const { user, admin } = await getAdminContext(context.request, context.cookies, context.locals);
  context.locals.user = user ? { id: user.id, email: user.email } : null;
  context.locals.isAdmin = Boolean(admin);

  if (!user) {
    if (path.startsWith('/api/')) return new Response(JSON.stringify({ error: 'Unauthenticated' }), { status: 401, headers: { 'content-type': 'application/json' } });
    return context.redirect(`/login/?next=${encodeURIComponent(path)}`, 303);
  }
  if (!admin) {
    if (path.startsWith('/api/')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'content-type': 'application/json' } });
    return new Response('Forbidden', { status: 403, headers: { 'content-type': 'text/plain' } });
  }

  const response = await next();
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
});
