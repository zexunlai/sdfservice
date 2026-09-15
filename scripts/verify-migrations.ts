import { readdir,readFile } from 'node:fs/promises';
const dir='supabase/migrations';
const files=(await readdir(dir)).filter(x=>x.endsWith('.sql')).sort();
const sql=(await Promise.all(files.map(x=>readFile(`${dir}/${x}`,'utf8')))).join('\n');
const required=['admin_users','site_settings','site_content','expertise_areas','expertise_translations','articles','article_translations','article_tags','organisations','organisation_domains','resource_hubs','resource_hub_areas','resource_hub_translations','official_resources','official_resource_translations','resource_areas','resource_tags','library_analyses','analysis_translations','analysis_resource_links','article_resource_links','glossary_sources','glossary_terms','glossary_term_translations','glossary_variants','content_glossary_references','translation_jobs','translation_glossary_syncs','media_assets','admin_favorites','resource_checks','audit_log','content_revisions','contact_messages','profile_items'];
const missing=required.filter(t=>!new RegExp(`create table public\\.${t}\\b`,'i').test(sql));
if(missing.length)throw new Error(`Missing tables: ${missing.join(', ')}`);
const dynamicRls=/execute format\('alter table public\.%I enable row level security'/i.test(sql);
for(const table of required){if(!dynamicRls&&!new RegExp(`alter table public\\.${table} enable row level security`,'i').test(sql))throw new Error(`RLS not enabled: ${table}`)}
if(/PUBLIC_SUPABASE_SERVICE_ROLE/i.test(sql))throw new Error('Service role must never use PUBLIC_ prefix');
if(!/check \(not published or \(title_verified and official_domain_verified and status = 'current'\)\)/i.test(sql))throw new Error('Resource publication invariant missing');
if(/pwc|pricewaterhouse/i.test(sql))throw new Error('Confidential employer references must not be seeded publicly');
if(!/create view public\.public_glossary_definitions/i.test(sql))throw new Error('Public-safe glossary view missing');
if(/grant select on public\.glossary_terms[^\n]*to anon/i.test(sql))throw new Error('Private glossary master must not be readable by anon');
if(!/public_article_i18n[^\n]*is_published/i.test(sql)||!/public_analysis_i18n[^\n]*is_published/i.test(sql))throw new Error('Published translation boundary missing');
console.log(`Verified ${files.length} migrations, ${required.length} required tables, RLS declarations and publication invariants.`);
