create type public.translation_status as enum ('original','missing','machine_translated','machine_translated_human_reviewed','human_translated','outdated','draft','published');
create type public.glossary_status as enum ('approved','review','deprecated','archived');
create type public.translation_rule as enum ('preferred','must_use','keep_original','keep_acronym','do_not_translate','context_dependent');
create type public.glossary_display_rule as enum ('first_occurrence_only','every_occurrence','manual_only');

alter table public.articles add column source_language text not null default 'en' check(source_language in ('en','zh-TW'));
alter table public.library_analyses add column source_language text not null default 'en' check(source_language in ('en','zh-TW'));

alter table public.article_translations
  add column translation_status public.translation_status not null default 'draft',
  add column translation_provider text,
  add column provider_model text,
  add column translator_name text,
  add column translator_id uuid references auth.users(id),
  add column translation_credit_public boolean not null default true,
  add column translated_at timestamptz,
  add column reviewed_at timestamptz,
  add column source_revision_id bigint references public.content_revisions(id),
  add column source_updated_at_at_translation timestamptz,
  add column provider_job_id text,
  add column machine_translation_raw jsonb,
  add column published_content jsonb,
  add column is_published boolean not null default false,
  add column translation_published_at timestamptz,
  add column attribution_required boolean not null default false,
  add column glossary_sync_id uuid,
  add column created_at timestamptz not null default now(),
  add column updated_at timestamptz not null default now();

alter table public.analysis_translations
  add column translation_status public.translation_status not null default 'draft',
  add column translation_provider text,
  add column provider_model text,
  add column translator_name text,
  add column translator_id uuid references auth.users(id),
  add column translation_credit_public boolean not null default true,
  add column translated_at timestamptz,
  add column reviewed_at timestamptz,
  add column source_revision_id bigint references public.content_revisions(id),
  add column source_updated_at_at_translation timestamptz,
  add column provider_job_id text,
  add column machine_translation_raw jsonb,
  add column published_content jsonb,
  add column is_published boolean not null default false,
  add column translation_published_at timestamptz,
  add column attribution_required boolean not null default false,
  add column glossary_sync_id uuid,
  add column created_at timestamptz not null default now(),
  add column updated_at timestamptz not null default now();

update public.article_translations tr set translation_status=case when tr.locale=a.source_language then 'original'::public.translation_status else 'draft'::public.translation_status end from public.articles a where a.id=tr.article_id;
update public.analysis_translations tr set translation_status=case when tr.locale=a.source_language then 'original'::public.translation_status else 'draft'::public.translation_status end from public.library_analyses a where a.id=tr.analysis_id;
update public.article_translations tr set is_published=(a.status='published'),translation_published_at=case when a.status='published' then coalesce(a.published_at,a.updated_at) end from public.articles a where a.id=tr.article_id and tr.locale=a.source_language;
update public.analysis_translations tr set is_published=(a.status='published'),translation_published_at=case when a.status='published' then coalesce(a.published_at,a.updated_at) end from public.library_analyses a where a.id=tr.analysis_id and tr.locale=a.source_language;

create table public.article_tags (
  article_id uuid not null references public.articles(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key(article_id,tag_id)
);

create table public.resource_hub_translations (
  id uuid primary key default gen_random_uuid(), hub_id uuid not null references public.resource_hubs(id) on delete cascade,
  locale text not null check(locale in ('en','zh-TW')), localized_title text, description text not null,
  translation_status public.translation_status not null default 'draft', translator_name text, translation_credit_public boolean not null default true,
  translation_provider text, translated_at timestamptz, reviewed_at timestamptz,
  is_published boolean not null default false, translation_published_at timestamptz,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(), unique(hub_id,locale)
);

create table public.official_resource_translations (
  id uuid primary key default gen_random_uuid(), resource_id uuid not null references public.official_resources(id) on delete cascade,
  locale text not null check(locale in ('en','zh-TW')), official_localized_title text, description text not null,
  translation_status public.translation_status not null default 'draft', translator_name text, translation_credit_public boolean not null default true,
  translation_provider text, translated_at timestamptz, reviewed_at timestamptz,
  is_published boolean not null default false, translation_published_at timestamptz,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(), unique(resource_id,locale)
);

create table public.glossary_sources (
  id uuid primary key default gen_random_uuid(), organisation text, official_title text, official_url text check(official_url is null or official_url ~ '^https://'),
  year_or_version text, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.glossary_terms (
  id uuid primary key default gen_random_uuid(), canonical_english_term text not null unique, acronym text,
  preferred_english_term text not null, preferred_chinese_term text, english_variants text[] not null default '{}', chinese_variants text[] not null default '{}',
  avoid_english text[] not null default '{}', avoid_chinese text[] not null default '{}', translation_rule public.translation_rule not null default 'preferred',
  case_sensitive boolean not null default false, status public.glossary_status not null default 'review',
  public_definition_enabled boolean not null default false, auto_reference_enabled boolean not null default false,
  public_display_rule public.glossary_display_rule not null default 'first_occurrence_only', definition_source_id uuid references public.glossary_sources(id),
  definition_type text not null default 'original' check(definition_type in ('official','adapted_official','ze_xun_lai','other_original')),
  source_notes text, internal_notes text, last_reviewed_at timestamptz, created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.glossary_term_translations (
  id uuid primary key default gen_random_uuid(), glossary_term_id uuid not null references public.glossary_terms(id) on delete cascade,
  locale text not null check(locale in ('en','zh-TW')), display_term text not null, definition text,
  translation_status public.translation_status not null default 'draft', translator_name text, translation_provider text,
  translated_at timestamptz, reviewed_at timestamptz, unique(glossary_term_id,locale)
);

create table public.glossary_variants (
  id uuid primary key default gen_random_uuid(), glossary_term_id uuid not null references public.glossary_terms(id) on delete cascade,
  locale text not null check(locale in ('en','zh-TW')), variant text not null, variant_kind text not null check(variant_kind in ('alias','avoid','acronym','accepted')),
  case_sensitive boolean not null default false, unique(glossary_term_id,locale,variant)
);

create table public.content_glossary_references (
  id uuid primary key default gen_random_uuid(), content_type text not null check(content_type in ('article','analysis','site_content')),
  content_id uuid not null, glossary_term_id uuid not null references public.glossary_terms(id) on delete cascade,
  locale text not null check(locale in ('en','zh-TW')), occurrence_strategy public.glossary_display_rule not null default 'first_occurrence_only',
  manual_anchor_override text, enabled boolean not null default true, created_by uuid references auth.users(id), created_at timestamptz not null default now(),
  unique(content_type,content_id,glossary_term_id,locale)
);

create table public.translation_jobs (
  id uuid primary key default gen_random_uuid(), entity_type text not null, entity_id uuid not null, source_locale text not null, target_locale text not null,
  provider text not null, provider_model text, provider_job_id text, job_status text not null default 'queued' check(job_status in ('queued','running','succeeded','failed')),
  glossary_sync_id uuid, requested_by uuid references auth.users(id), error_detail text, started_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now()
);

create table public.translation_glossary_syncs (
  id uuid primary key default gen_random_uuid(), provider text not null, provider_glossary_id text, source_locale text not null, target_locale text not null,
  approved_term_count integer not null default 0, content_hash text, sync_status text not null default 'pending' check(sync_status in ('pending','syncing','synced','failed')),
  provider_operation_id text, error_detail text, synced_by uuid references auth.users(id), created_at timestamptz not null default now(), synced_at timestamptz
);
alter table public.article_translations add constraint article_translation_glossary_sync_fk foreign key(glossary_sync_id) references public.translation_glossary_syncs(id);
alter table public.analysis_translations add constraint analysis_translation_glossary_sync_fk foreign key(glossary_sync_id) references public.translation_glossary_syncs(id);

create index article_translation_status_idx on public.article_translations(locale,translation_status);
create index analysis_translation_status_idx on public.analysis_translations(locale,translation_status);
create index glossary_terms_status_idx on public.glossary_terms(status,public_definition_enabled,auto_reference_enabled);
create index glossary_terms_term_trgm_idx on public.glossary_terms using gin(canonical_english_term extensions.gin_trgm_ops);
create index glossary_term_translations_locale_idx on public.glossary_term_translations(locale,display_term);
create index glossary_variants_lookup_idx on public.glossary_variants(locale,lower(variant));
create index content_glossary_reference_idx on public.content_glossary_references(content_type,content_id,locale,enabled);
create index translation_jobs_status_idx on public.translation_jobs(job_status,created_at desc);

create function private.mark_article_translations_outdated() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.updated_at is distinct from new.updated_at then
    update public.article_translations set translation_status='outdated'
      where article_id=new.id and locale<>new.source_language and translation_status in ('machine_translated','machine_translated_human_reviewed','human_translated','published');
  end if; return new;
end $$;
create function private.mark_analysis_translations_outdated() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.updated_at is distinct from new.updated_at then
    update public.analysis_translations set translation_status='outdated'
      where analysis_id=new.id and locale<>new.source_language and translation_status in ('machine_translated','machine_translated_human_reviewed','human_translated','published');
  end if; return new;
end $$;
create trigger article_translation_staleness after update on public.articles for each row execute function private.mark_article_translations_outdated();
create trigger analysis_translation_staleness after update on public.library_analyses for each row execute function private.mark_analysis_translations_outdated();

do $$ declare t text; begin
  foreach t in array array['article_tags','resource_hub_translations','official_resource_translations','glossary_sources','glossary_terms','glossary_term_translations','glossary_variants','content_glossary_references','translation_jobs','translation_glossary_syncs'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant all on public.%I to authenticated',t);
    execute format('create policy owner_all on public.%I for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))',t);
  end loop;
end $$;

grant select on public.resource_hub_translations,public.official_resource_translations,public.article_tags to anon;
drop policy if exists public_article_i18n on public.article_translations;
drop policy if exists public_analysis_i18n on public.analysis_translations;
create policy public_article_i18n on public.article_translations for select to anon using(is_published and exists(select 1 from public.articles a where a.id=article_id and a.status='published'));
create policy public_analysis_i18n on public.analysis_translations for select to anon using(is_published and exists(select 1 from public.library_analyses a where a.id=analysis_id and a.status='published'));
create policy public_hub_translations on public.resource_hub_translations for select to anon using(is_published and exists(select 1 from public.resource_hubs h where h.id=hub_id and h.status='published'));
create policy public_resource_translations on public.official_resource_translations for select to anon using(is_published and exists(select 1 from public.official_resources r where r.id=resource_id and r.published and r.status='current'));
create policy public_article_tags on public.article_tags for select to anon using(exists(select 1 from public.articles a where a.id=article_id and a.status='published'));

create view public.public_glossary_definitions with (security_barrier=true) as
select gt.id,gt.canonical_english_term,gt.acronym,gt.public_display_rule,
  tr.locale,tr.display_term,tr.definition,gs.organisation as source_organisation,gs.official_title as source_title,gs.official_url as source_url
from public.glossary_terms gt join public.glossary_term_translations tr on tr.glossary_term_id=gt.id
left join public.glossary_sources gs on gs.id=gt.definition_source_id
where gt.status='approved' and gt.public_definition_enabled and tr.definition is not null;
revoke all on public.public_glossary_definitions from public,authenticated;
grant select on public.public_glossary_definitions to anon,authenticated;

create trigger glossary_sources_updated before update on public.glossary_sources for each row execute function private.set_updated_at();
create trigger glossary_terms_updated before update on public.glossary_terms for each row execute function private.set_updated_at();
create trigger article_translations_updated before update on public.article_translations for each row execute function private.set_updated_at();
create trigger analysis_translations_updated before update on public.analysis_translations for each row execute function private.set_updated_at();
create trigger resource_hub_translations_updated before update on public.resource_hub_translations for each row execute function private.set_updated_at();
create trigger official_resource_translations_updated before update on public.official_resource_translations for each row execute function private.set_updated_at();
create trigger glossary_terms_revision before update on public.glossary_terms for each row execute function private.capture_revision();
create trigger glossary_translations_revision before update on public.glossary_term_translations for each row execute function private.capture_revision();

insert into public.site_settings(key,value,is_public) values
('translation_provider','{"provider":"google_cloud_translation","location":"global","model":"general/nmt","machineAttributionRequired":true,"humanReviewedAttributionRequired":false}',false)
on conflict(key) do update set value=excluded.value,is_public=false;
