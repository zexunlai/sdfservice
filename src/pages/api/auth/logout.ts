import type { APIRoute } from 'astro';
import { createAstroServerClient } from '../../../lib/supabase';
export const prerender = false;
export const POST: APIRoute = async ({ request, cookies, locals, redirect }) => { const client=createAstroServerClient(request,cookies,locals);if(client)await client.auth.signOut();return redirect('/login/',303); };
