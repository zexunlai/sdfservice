import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !publishableKey || !serviceKey) {
  throw new Error('SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and SUPABASE_SERVICE_ROLE_KEY are required');
}

const service = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = createClient(url, publishableKey, { auth: { persistSession: false } });

async function count(table: string, configure?: (query: any) => any) {
  let query: any = service.from(table).select('*', { count: 'exact', head: true });
  if (configure) query = configure(query);
  const { count: value, error } = await query;
  if (error) throw new Error(`${table}: ${error.message}`);
  return value ?? 0;
}

async function expectDenied(label: string, promise: PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const { data, error } = await promise;
  const rows = Array.isArray(data) ? data.length : data ? 1 : 0;
  if (!error && rows > 0) throw new Error(`${label}: anonymous access unexpectedly returned data`);
  return 'denied';
}

const requiredTables = [
  'admin_users', 'site_settings', 'site_content', 'expertise_areas', 'expertise_translations',
  'articles', 'article_translations', 'article_tags', 'organisations', 'organisation_domains',
  'resource_hubs', 'resource_hub_areas', 'resource_hub_translations', 'official_resources',
  'official_resource_translations', 'resource_areas', 'resource_tags', 'library_analyses',
  'analysis_translations', 'analysis_resource_links', 'article_resource_links', 'glossary_sources',
  'glossary_terms', 'glossary_term_translations', 'glossary_variants', 'content_glossary_references',
  'translation_jobs', 'translation_glossary_syncs', 'media_assets', 'admin_favorites',
  'resource_checks', 'audit_log', 'content_revisions', 'contact_messages', 'profile_items',
];

for (let index = 0; index < requiredTables.length; index += 5) {
  await Promise.all(requiredTables.slice(index, index + 5).map(table => count(table)));
}

const { data: owner, error: ownerError } = await service
  .from('admin_users')
  .select('email,role,active')
  .eq('email', 'zexunlai@gmail.com')
  .maybeSingle();
if (ownerError || !owner || owner.role !== 'owner' || !owner.active) {
  throw new Error(`Owner mapping invalid: ${ownerError?.message ?? 'missing or inactive owner'}`);
}

const safeGlossary = await anon.from('public_glossary_definitions').select('*');
if (safeGlossary.error) throw new Error(`Public glossary view: ${safeGlossary.error.message}`);
const allowedGlossaryFields = new Set([
  'id', 'canonical_english_term', 'acronym', 'public_display_rule', 'locale', 'display_term',
  'definition', 'source_organisation', 'source_title', 'source_url',
]);
for (const row of safeGlossary.data ?? []) {
  for (const field of Object.keys(row)) {
    if (!allowedGlossaryFields.has(field)) throw new Error(`Public glossary exposes private field: ${field}`);
  }
}

const anonDraftArticles = await anon.from('articles').select('id').eq('status', 'draft');
if (anonDraftArticles.error || (anonDraftArticles.data?.length ?? 0) !== 0) {
  throw new Error(`Anonymous draft article boundary failed: ${anonDraftArticles.error?.message ?? 'draft rows visible'}`);
}
const anonDraftAnalyses = await anon.from('library_analyses').select('id').eq('status', 'draft');
if (anonDraftAnalyses.error || (anonDraftAnalyses.data?.length ?? 0) !== 0) {
  throw new Error(`Anonymous draft analysis boundary failed: ${anonDraftAnalyses.error?.message ?? 'draft rows visible'}`);
}

const [{ data: area }, { data: resource }, { data: siteContent }] = await Promise.all([
  service.from('expertise_areas').select('id').limit(1).single(),
  service.from('official_resources').select('id').eq('published', true).limit(1).single(),
  service.from('site_content').select('id').limit(1).single(),
]);
if (!area || !resource || !siteContent) throw new Error('Seed rows required for RLS mutation tests are missing');

const denied = {
  adminUsers: await expectDenied('admin_users', anon.from('admin_users').select('id')),
  glossaryMaster: await expectDenied('glossary_terms', anon.from('glossary_terms').select('id')),
  contactInbox: await expectDenied('contact_messages', anon.from('contact_messages').select('id')),
  articleInsert: await expectDenied('article insert', anon.from('articles').insert({ slug: '__anon_denied__', primary_area_id: area.id }).select('id')),
  resourceUpdate: await expectDenied('resource update', anon.from('official_resources').update({ description: 'denied' }).eq('id', resource.id).select('id')),
  siteContentUpdate: await expectDenied('site content update', anon.from('site_content').update({ sort_order: 999 }).eq('id', siteContent.id).select('id')),
};

const contactMarker = `Temporary RLS verification ${crypto.randomUUID()}`;
const temporaryContact = {
  name: 'Remote security verification',
  email: 'zexunlai@gmail.com',
  message: `${contactMarker}. This row will be removed immediately after the test.`,
  status: 'new',
};
const contactInsert = await anon.from('contact_messages').insert(temporaryContact);
if (contactInsert.error) throw new Error(`Anonymous contact insert failed: ${contactInsert.error.message}`);
const contactRead = await service.from('contact_messages').select('id').eq('message', temporaryContact.message).single();
if (contactRead.error) throw new Error(`Admin-side contact read failed: ${contactRead.error.message}`);
const contactDelete = await service.from('contact_messages').delete().eq('id', contactRead.data.id);
if (contactDelete.error) throw new Error(`Temporary contact cleanup failed: ${contactDelete.error.message}`);

const result = {
  schema: { requiredTables: requiredTables.length, verified: true },
  owner: { email: owner.email, role: owner.role, active: owner.active },
  seed: {
    expertiseAreas: await count('expertise_areas'),
    hubs: await count('resource_hubs'),
    resources: await count('official_resources'),
    verifiedResources: await count('official_resources', q => q.eq('published', true).eq('title_verified', true).eq('official_domain_verified', true)),
    needsReview: await count('official_resources', q => q.eq('published', false)),
    resourceAreaLinks: await count('resource_areas'),
    glossaryTerms: await count('glossary_terms'),
    glossaryTranslations: await count('glossary_term_translations'),
    publicGlossaryDefinitions: safeGlossary.data?.length ?? 0,
  },
  rls: {
    anonymousDraftArticles: 'hidden',
    anonymousDraftAnalyses: 'hidden',
    ...denied,
    anonymousContactInsert: 'allowed',
    anonymousContactSelect: 'denied',
    temporaryRowsCleaned: true,
  },
};

console.log(JSON.stringify(result, null, 2));
