import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');

const retryFetch: typeof fetch = async (input, init) => {
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    try { return await fetch(input, init); }
    catch (error) {
      lastError = error;
      if (attempt < 4) await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
  throw lastError;
};
const db = createClient(url, key, { auth: { persistSession: false }, global: { fetch: retryFetch } });

async function sourceFiles(directory: string) {
  const names = (await readdir(directory)).filter(name => /\.mdx?$/.test(name));
  return Promise.all(names.map(async name => {
    const parsed = matter(await readFile(join(directory, name), 'utf8'));
    return { slug: basename(name).replace(/\.mdx?$/, ''), frontmatter: parsed.data, bodyHtml: await marked(parsed.content) };
  }));
}

function date(value: unknown) {
  return value ? new Date(String(value)).toISOString().slice(0, 10) : null;
}

const [sourceArticles, sourceAnalyses, articleResult, analysisResult] = await Promise.all([
  sourceFiles(join(process.cwd(), 'src/content/insights')),
  sourceFiles(join(process.cwd(), 'src/content/library')),
  db.from('articles').select('slug,source_language,status,publication_date,updated_date,expertise_areas(display_name),article_translations(locale,title,summary,body_html,is_published,translation_status)'),
  db.from('library_analyses').select('slug,source_language,status,publication_date,expertise_areas(display_name),analysis_translations(locale,title,summary,body_html,is_published,translation_status)'),
]);
if (articleResult.error) throw articleResult.error;
if (analysisResult.error) throw analysisResult.error;

const remoteArticles = new Map((articleResult.data ?? []).map((row: any) => [row.slug, row]));
const remoteAnalyses = new Map((analysisResult.data ?? []).map((row: any) => [row.slug, row]));
const failures: string[] = [];

for (const source of sourceArticles) {
  const remote: any = remoteArticles.get(source.slug);
  const translation = remote?.article_translations?.find((row: any) => row.locale === 'en');
  const expectedStatus = source.frontmatter.draft ? 'draft' : 'published';
  if (!remote) { failures.push(`article missing: ${source.slug}`); continue; }
  if (remote.source_language !== 'en') failures.push(`article source language: ${source.slug}`);
  if (remote.status !== expectedStatus) failures.push(`article status: ${source.slug}`);
  if (remote.publication_date !== date(source.frontmatter.publicationDate)) failures.push(`article publication date: ${source.slug}`);
  if (remote.updated_date !== date(source.frontmatter.updatedDate)) failures.push(`article updated date: ${source.slug}`);
  if (remote.expertise_areas?.display_name !== source.frontmatter.area) failures.push(`article area: ${source.slug}`);
  if (translation?.title !== source.frontmatter.title) failures.push(`article title: ${source.slug}`);
  if (translation?.summary !== source.frontmatter.description) failures.push(`article summary: ${source.slug}`);
  if (translation?.body_html !== source.bodyHtml) failures.push(`article body: ${source.slug}`);
  if (translation?.translation_status !== 'original') failures.push(`article original status: ${source.slug}`);
  if (translation?.is_published !== !source.frontmatter.draft) failures.push(`article translation publication: ${source.slug}`);
}

for (const source of sourceAnalyses) {
  const remote: any = remoteAnalyses.get(source.slug);
  const translation = remote?.analysis_translations?.find((row: any) => row.locale === 'en');
  const expectedStatus = source.frontmatter.draft ? 'draft' : 'published';
  if (!remote) { failures.push(`analysis missing: ${source.slug}`); continue; }
  if (remote.source_language !== 'en') failures.push(`analysis source language: ${source.slug}`);
  if (remote.status !== expectedStatus) failures.push(`analysis status: ${source.slug}`);
  if (remote.publication_date !== date(source.frontmatter.publicationDate)) failures.push(`analysis publication date: ${source.slug}`);
  if (remote.expertise_areas?.display_name !== source.frontmatter.area) failures.push(`analysis area: ${source.slug}`);
  if (translation?.title !== source.frontmatter.title) failures.push(`analysis title: ${source.slug}`);
  if (translation?.summary !== source.frontmatter.summary) failures.push(`analysis summary: ${source.slug}`);
  if (translation?.body_html !== source.bodyHtml) failures.push(`analysis body: ${source.slug}`);
  if (translation?.translation_status !== 'original') failures.push(`analysis original status: ${source.slug}`);
  if (translation?.is_published !== !source.frontmatter.draft) failures.push(`analysis translation publication: ${source.slug}`);
}

if (remoteArticles.size !== sourceArticles.length) failures.push(`article count ${remoteArticles.size}/${sourceArticles.length}`);
if (remoteAnalyses.size !== sourceAnalyses.length) failures.push(`analysis count ${remoteAnalyses.size}/${sourceAnalyses.length}`);
if (failures.length) throw new Error(`Import verification failed:\n${failures.join('\n')}`);

console.log(JSON.stringify({
  articles: {
    total: remoteArticles.size,
    published: [...remoteArticles.values()].filter((row: any) => row.status === 'published').length,
    drafts: [...remoteArticles.values()].filter((row: any) => row.status === 'draft').length,
    slugsUnique: remoteArticles.size === new Set(remoteArticles.keys()).size,
    titlesDatesAreasBodiesVerified: true,
  },
  analyses: {
    total: remoteAnalyses.size,
    published: [...remoteAnalyses.values()].filter((row: any) => row.status === 'published').length,
    drafts: [...remoteAnalyses.values()].filter((row: any) => row.status === 'draft').length,
    titlesDatesAreasBodiesVerified: true,
  },
  sourceLanguageFallbackReady: true,
}, null, 2));
