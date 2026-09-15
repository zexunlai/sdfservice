import type { APIRoute } from 'astro';
import { createPublicClient } from '../lib/supabase';
export const prerender = false;

const staticPaths = ['/', '/expertise/', '/insights/', '/library/', '/about/', '/contact/', '/privacy/', '/disclaimer/', '/zh-TW/', '/zh-TW/expertise/', '/zh-TW/insights/', '/zh-TW/library/', '/zh-TW/about/', '/zh-TW/contact/'];
const escapeXml = (value:string) => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
export const GET: APIRoute = async ({ locals, site }) => {
  const db = createPublicClient(locals);
  const paths = [...staticPaths];
  if (db) {
    const [articles, analyses, hubs, resources] = await Promise.all([
      db.from('articles').select('slug').eq('status','published'),
      db.from('library_analyses').select('slug').eq('status','published'),
      db.from('resource_hubs').select('slug').eq('status','published'),
      db.from('official_resources').select('slug').eq('published',true).eq('status','current').eq('title_verified',true).eq('official_domain_verified',true),
    ]);
    for (const row of articles.data ?? []) paths.push(`/insights/${row.slug}/`, `/zh-TW/insights/${row.slug}/`);
    for (const row of analyses.data ?? []) paths.push(`/library/${row.slug}/`, `/zh-TW/library/${row.slug}/`);
    for (const row of hubs.data ?? []) paths.push(`/library/${row.slug}/`);
    for (const row of resources.data ?? []) paths.push(`/library/${row.slug}/`);
  }
  for (const area of ['sustainability-climate-change','geospatial-intelligence','biodiversity-nature','circular-economy','carbon-markets-methodologies']) paths.push(`/expertise/${area}/`, `/zh-TW/expertise/${area}/`);
  const origin = site ?? new URL('https://zexunlai-website.pages.dev');
  const urls = [...new Set(paths)].map((path) => `<url><loc>${escapeXml(new URL(path, origin).toString())}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { 'content-type':'application/xml; charset=utf-8', 'cache-control':'public, max-age=300' } });
};
