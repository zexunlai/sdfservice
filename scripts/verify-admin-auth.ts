import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !publishableKey || !serviceKey) throw new Error('Supabase environment is required');

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
const options = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: retryFetch } };
const service = createClient(url, serviceKey, options);
const anon = createClient(url, publishableKey, options);
const owner = createClient(url, publishableKey, options);
const marker = `codex-verification-${Date.now()}`;
const cleanup: { article?: string; glossary?: string; resource?: string; nonAdmin?: string } = {};

async function requireSuccess<T extends { error: { message: string } | null }>(label: string, result: T) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result;
}

try {
  const link = await service.auth.admin.generateLink({ type: 'magiclink', email: 'zexunlai@gmail.com' });
  if (link.error || !link.data.properties?.hashed_token) throw new Error(`Owner verification link: ${link.error?.message ?? 'missing token'}`);
  const ownerSession = await owner.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: 'magiclink' });
  if (ownerSession.error || ownerSession.data.user?.email !== 'zexunlai@gmail.com') throw new Error(`Owner session: ${ownerSession.error?.message ?? 'wrong user'}`);

  const ownerMapping = await owner.from('admin_users').select('id,email,role,active').eq('email', 'zexunlai@gmail.com').single();
  await requireSuccess('Owner RLS mapping', ownerMapping);
  if (!ownerMapping.data) throw new Error('Owner mapping is missing');
  if (ownerMapping.data.role !== 'owner' || !ownerMapping.data.active) throw new Error('Owner mapping is not active owner');

  const area = await owner.from('expertise_areas').select('id').eq('key', 'geospatial-intelligence').single();
  await requireSuccess('Owner area read', area);
  if (!area.data) throw new Error('Expertise area is missing');
  const article = await owner.from('articles').insert({
    slug: `${marker}-article`, primary_area_id: area.data.id, source_language: 'en',
    author: 'Temporary verification', status: 'draft', tags: ['verification'],
  }).select('id').single();
  await requireSuccess('Owner article create', article);
  if (!article.data) throw new Error('Temporary article was not returned');
  cleanup.article = article.data.id;
  await requireSuccess('Owner article translation create', await owner.from('article_translations').insert({
    article_id: article.data.id, locale: 'en', title: 'Temporary draft', summary: 'Temporary draft for RLS verification.',
    body: { type: 'doc', content: [] }, body_html: '<p>Temporary draft.</p>', translation_status: 'original', is_published: false,
  }));
  await requireSuccess('Owner article update', await owner.from('articles').update({ author: 'Temporary verification updated' }).eq('id', article.data.id));
  await requireSuccess('Owner article read', await owner.from('articles').select('id').eq('id', article.data.id).single());
  const publicDraft = await anon.from('articles').select('id').eq('id', article.data.id);
  if (publicDraft.error || publicDraft.data.length) throw new Error('Temporary draft article became publicly readable');

  const glossary = await owner.from('glossary_terms').insert({
    canonical_english_term: `${marker} term`, preferred_english_term: `${marker} term`,
    status: 'review', public_definition_enabled: false, auto_reference_enabled: false,
  }).select('id').single();
  await requireSuccess('Owner glossary create', glossary);
  if (!glossary.data) throw new Error('Temporary glossary term was not returned');
  cleanup.glossary = glossary.data.id;
  await requireSuccess('Owner glossary update', await owner.from('glossary_terms').update({ internal_notes: 'Temporary verification only' }).eq('id', glossary.data.id));
  const publicGlossary = await anon.from('public_glossary_definitions').select('id').eq('id', glossary.data.id);
  if (publicGlossary.error || publicGlossary.data.length) throw new Error('Review glossary term became publicly readable');

  const referenceRows = await Promise.all([
    owner.from('resource_hubs').select('id,organisation_id').limit(1).single(),
    owner.from('resource_types').select('id').eq('slug', 'official-overview').single(),
  ]);
  await requireSuccess('Owner resource hub read', referenceRows[0]);
  await requireSuccess('Owner resource type read', referenceRows[1]);
  if (!referenceRows[0].data || !referenceRows[1].data) throw new Error('Resource reference rows are missing');
  const resource = await owner.from('official_resources').insert({
    hub_id: referenceRows[0].data.id, organisation_id: referenceRows[0].data.organisation_id,
    resource_type_id: referenceRows[1].data.id, slug: `${marker}-resource`,
    official_title: 'Temporary needs-review resource', description: 'Temporary resource used only for RLS verification.',
    official_url: 'https://example.invalid/verification', format: 'Web', status: 'needs_review',
    title_verified: false, official_domain_verified: false, published: false,
  }).select('id').single();
  await requireSuccess('Owner resource create', resource);
  if (!resource.data) throw new Error('Temporary resource was not returned');
  cleanup.resource = resource.data.id;
  await requireSuccess('Owner resource update', await owner.from('official_resources').update({ short_title: 'Temporary verification' }).eq('id', resource.data.id));
  const publicResource = await anon.from('official_resources').select('id').eq('id', resource.data.id);
  if (publicResource.error || publicResource.data.length) throw new Error('Needs-review resource became publicly readable');

  await requireSuccess('Owner setting create', await owner.from('site_settings').upsert({ key: marker, value: { verification: 'created' }, is_public: false }));
  await requireSuccess('Owner setting update', await owner.from('site_settings').update({ value: { verification: 'updated' } }).eq('key', marker));
  await requireSuccess('Owner setting read', await owner.from('site_settings').select('key').eq('key', marker).single());
  await requireSuccess('Owner setting delete', await owner.from('site_settings').delete().eq('key', marker));

  const signupEmail = `${marker}-signup@example.invalid`;
  const signup = await anon.auth.signUp({ email: signupEmail, password: `${crypto.randomUUID()}Aa1!` });
  if (!signup.error) {
    if (signup.data.user?.id) await service.auth.admin.deleteUser(signup.data.user.id);
    throw new Error('Public signup unexpectedly succeeded');
  }
  const anonymousSignIn = await anon.auth.signInAnonymously();
  if (!anonymousSignIn.error) {
    if (anonymousSignIn.data.user?.id) await service.auth.admin.deleteUser(anonymousSignIn.data.user.id);
    throw new Error('Anonymous sign-in unexpectedly succeeded');
  }

  const nonAdminEmail = `${marker}-nonadmin@example.invalid`;
  const nonAdminPassword = `${crypto.randomUUID()}Aa1!`;
  const nonAdminCreate = await service.auth.admin.createUser({ email: nonAdminEmail, password: nonAdminPassword, email_confirm: true });
  if (nonAdminCreate.error || !nonAdminCreate.data.user) throw new Error(`Temporary non-admin create: ${nonAdminCreate.error?.message}`);
  cleanup.nonAdmin = nonAdminCreate.data.user.id;
  const nonAdmin = createClient(url, publishableKey, options);
  const nonAdminSignIn = await nonAdmin.auth.signInWithPassword({ email: nonAdminEmail, password: nonAdminPassword });
  if (nonAdminSignIn.error) throw new Error(`Temporary non-admin sign-in: ${nonAdminSignIn.error.message}`);
  const nonAdminMapping = await nonAdmin.from('admin_users').select('id');
  if (nonAdminMapping.error || nonAdminMapping.data.length) throw new Error('Non-admin could read admin user rows');
  const nonAdminWrite = await nonAdmin.from('articles').insert({ slug: `${marker}-denied`, primary_area_id: area.data.id, status: 'draft' });
  if (!nonAdminWrite.error) throw new Error('Non-admin article insert unexpectedly succeeded');

  console.log(JSON.stringify({
    owner: { email: 'zexunlai@gmail.com', authenticated: true, isAdmin: true },
    ownerCrud: { siteSetting: 'create/read/update/delete passed', articleDraft: 'create/read/update/delete passed', glossaryReview: 'create/read/update/delete passed', resourceNeedsReview: 'create/read/update/delete passed' },
    publicBoundaries: { draftArticleHidden: true, reviewGlossaryHidden: true, needsReviewResourceHidden: true },
    authBoundaries: { publicSignupDisabled: true, anonymousSignInDisabled: true, authenticatedNonAdminDenied: true },
  }, null, 2));
} finally {
  if (cleanup.article) {
    await service.from('content_revisions').delete().eq('entity_id', cleanup.article);
    await service.from('articles').delete().eq('id', cleanup.article);
  }
  if (cleanup.glossary) {
    await service.from('content_revisions').delete().eq('entity_id', cleanup.glossary);
    await service.from('glossary_terms').delete().eq('id', cleanup.glossary);
  }
  if (cleanup.resource) {
    await service.from('content_revisions').delete().eq('entity_id', cleanup.resource);
    await service.from('official_resources').delete().eq('id', cleanup.resource);
  }
  if (cleanup.nonAdmin) await service.auth.admin.deleteUser(cleanup.nonAdmin);
}
