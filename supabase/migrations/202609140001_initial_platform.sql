-- Environmental Intelligence Platform — initial production schema
create extension if not exists pgcrypto;
create extension if not exists pg_trgm with schema extensions;
create schema if not exists private;

create type public.content_status as enum ('draft','published','archived');
create type public.resource_status as enum ('draft','needs_title_review','needs_review','current','archived');
create type public.health_status as enum ('healthy','redirected','blocked','broken','timeout','review_due','unknown');
create type public.access_level as enum ('public','free_registration','subscription','paid','reference_only');
create type public.update_frequency as enum ('weekly','monthly','quarterly','semiannual','annual','event_driven','manual');

create table public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'owner' check (role = 'owner'),
  active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create function private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.admin_users where user_id = (select auth.uid()) and role = 'owner' and active);
$$;
revoke all on function private.is_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

create table public.site_settings (
  key text primary key, value jsonb not null default '{}'::jsonb, is_public boolean not null default false,
  updated_by uuid references auth.users(id), updated_at timestamptz not null default now()
);
create table public.site_content (
  id uuid primary key default gen_random_uuid(), page_key text not null, section_key text not null,
  locale text not null check (locale in ('en','zh-TW')), content jsonb not null default '{}'::jsonb,
  status public.content_status not null default 'draft', sort_order integer not null default 0,
  created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(page_key,section_key,locale)
);
create table public.expertise_areas (
  id uuid primary key default gen_random_uuid(), key text not null unique, slug text not null unique,
  display_name text not null, sort_order smallint not null unique check (sort_order between 1 and 5),
  description text, summary text, content jsonb not null default '{}'::jsonb, keywords text[] not null default '{}',
  active boolean not null default true, updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (key = slug),
  check (key in ('sustainability-climate-change','geospatial-intelligence','biodiversity-nature','circular-economy','carbon-markets-methodologies'))
);
create table public.expertise_translations (
  id uuid primary key default gen_random_uuid(), expertise_id uuid not null references public.expertise_areas(id) on delete cascade,
  locale text not null check (locale = 'zh-TW'), display_name text not null, description text, summary text,
  content jsonb not null default '{}'::jsonb, keywords text[] not null default '{}', unique(expertise_id,locale)
);

create table public.articles (
  id uuid primary key default gen_random_uuid(), slug text not null unique, primary_area_id uuid not null references public.expertise_areas(id),
  subtopic text, author text not null default 'Ze-Xun Lai', publication_date date, updated_date date,
  tags text[] not null default '{}', hero_image_id uuid, featured boolean not null default false,
  status public.content_status not null default 'draft', published_at timestamptz,
  created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.article_translations (
  id uuid primary key default gen_random_uuid(), article_id uuid not null references public.articles(id) on delete cascade,
  locale text not null check (locale in ('en','zh-TW')), title text not null, subtitle text, summary text not null,
  body jsonb not null default '{"type":"doc","content":[]}'::jsonb, body_html text not null default '',
  seo_title text, seo_description text, og_image_id uuid, unique(article_id,locale)
);

create table public.organisations (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, description text,
  official_website text not null, aliases text[] not null default '{}', logo_media_id uuid,
  active boolean not null default true, created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.organisation_domains (
  id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id) on delete cascade,
  domain text not null, allow_subdomains boolean not null default true, verified boolean not null default true,
  created_at timestamptz not null default now(), unique(organisation_id,domain)
);
create table public.resource_hubs (
  id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id), slug text not null unique,
  title text not null, description text not null, official_website text, status public.content_status not null default 'draft',
  last_verified_at timestamptz, created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.resource_hub_areas (
  hub_id uuid references public.resource_hubs(id) on delete cascade, area_id uuid references public.expertise_areas(id) on delete cascade,
  primary key(hub_id,area_id)
);
create table public.resource_types (
  id uuid primary key default gen_random_uuid(), name text not null unique, slug text not null unique, active boolean not null default true,
  sort_order integer not null default 0
);
create table public.tags (
  id uuid primary key default gen_random_uuid(), name text not null unique, slug text not null unique, aliases text[] not null default '{}'
);
create table public.official_resources (
  id uuid primary key default gen_random_uuid(), hub_id uuid not null references public.resource_hubs(id), organisation_id uuid not null references public.organisations(id),
  resource_type_id uuid not null references public.resource_types(id), slug text not null unique,
  official_title text not null, short_title text, document_code text, original_filename text, description text not null,
  official_url text not null, source_page_url text, final_url text, format text not null,
  year smallint, version_label text, language text not null default 'en', access public.access_level not null default 'public',
  status public.resource_status not null default 'draft', publication_date date, effective_date date, archive_date date,
  update_frequency public.update_frequency not null default 'manual', last_verified_at timestamptz, next_review_at timestamptz,
  title_source text, title_verified boolean not null default false, official_domain_verified boolean not null default false,
  domain_override_note text, http_status integer, health public.health_status not null default 'unknown',
  last_http_check_at timestamptz, supersedes_resource_id uuid references public.official_resources(id),
  is_featured boolean not null default false, published boolean not null default false,
  data_theme text, data_type text, platform_or_sensor text, spatial_resolution text, temporal_resolution text,
  temporal_coverage text, geographic_coverage text, processing_level text, coordinate_reference_info text,
  data_format text, api_available boolean, license text, access_requirements text, download_method text, documentation_url text,
  search_document tsvector generated always as (
    setweight(to_tsvector('english',coalesce(official_title,'')),'A') ||
    setweight(to_tsvector('english',coalesce(short_title,'')),'A') ||
    setweight(to_tsvector('english',coalesce(document_code,'')),'B') ||
    setweight(to_tsvector('english',coalesce(description,'')),'D') ||
    setweight(to_tsvector('english',
      coalesce(data_theme,'') || ' ' ||
      coalesce(data_type,'') || ' ' ||
      coalesce(platform_or_sensor,'') || ' ' ||
      coalesce(geographic_coverage,'')
    ),'C')
  ) stored,
  created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (not published or (title_verified and official_domain_verified and status = 'current')),
  check (official_url ~ '^https://'),
  check (domain_override_note is null or length(trim(domain_override_note)) >= 10)
);
create table public.resource_areas (
  resource_id uuid references public.official_resources(id) on delete cascade, area_id uuid references public.expertise_areas(id) on delete cascade,
  primary key(resource_id,area_id)
);
create table public.resource_tags (
  resource_id uuid references public.official_resources(id) on delete cascade, tag_id uuid references public.tags(id) on delete cascade,
  primary key(resource_id,tag_id)
);

create table public.library_analyses (
  id uuid primary key default gen_random_uuid(), slug text not null unique, primary_area_id uuid not null references public.expertise_areas(id),
  analysis_type text not null default 'technical_review', subtopic text, tags text[] not null default '{}',
  publication_date date, updated_date date, featured boolean not null default false, status public.content_status not null default 'draft',
  published_at timestamptz, created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.analysis_translations (
  id uuid primary key default gen_random_uuid(), analysis_id uuid not null references public.library_analyses(id) on delete cascade,
  locale text not null check(locale in ('en','zh-TW')), title text not null, summary text not null,
  body jsonb not null default '{"type":"doc","content":[]}'::jsonb, body_html text not null default '', seo_title text, seo_description text,
  unique(analysis_id,locale)
);
create table public.analysis_resource_links (
  analysis_id uuid references public.library_analyses(id) on delete cascade,
  resource_id uuid references public.official_resources(id) on delete cascade, sort_order integer not null default 0,
  primary key(analysis_id,resource_id)
);
create table public.article_resource_links (
  article_id uuid references public.articles(id) on delete cascade,
  resource_id uuid references public.official_resources(id) on delete cascade, sort_order integer not null default 0,
  primary key(article_id,resource_id)
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(), storage_path text not null unique, filename text not null, mime_type text not null,
  size_bytes bigint not null check(size_bytes >= 0), alt_text text not null, caption text, description text, locale text,
  published boolean not null default false, created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.articles add constraint articles_hero_image_fk foreign key(hero_image_id) references public.media_assets(id) on delete set null;
alter table public.article_translations add constraint article_translations_og_image_fk foreign key(og_image_id) references public.media_assets(id) on delete set null;
alter table public.organisations add constraint organisations_logo_fk foreign key(logo_media_id) references public.media_assets(id) on delete set null;

create table public.admin_favorites (
  id uuid primary key default gen_random_uuid(), admin_user_id uuid not null references public.admin_users(id) on delete cascade,
  entity_type text not null, entity_id uuid not null, label text, sort_order integer not null default 0, created_at timestamptz not null default now(),
  unique(admin_user_id,entity_type,entity_id)
);
create table public.resource_checks (
  id bigint generated always as identity primary key, resource_id uuid not null references public.official_resources(id) on delete cascade,
  checked_at timestamptz not null default now(), method text not null, http_status integer, final_url text, redirect_count smallint not null default 0,
  content_type text, duration_ms integer, result public.health_status not null, error_code text, error_detail text
);
create table public.audit_log (
  id bigint generated always as identity primary key, admin_user_id uuid references public.admin_users(id), action text not null,
  entity_type text, entity_id uuid, metadata jsonb not null default '{}'::jsonb, ip_hash text, created_at timestamptz not null default now()
);
create table public.content_revisions (
  id bigint generated always as identity primary key, entity_type text not null, entity_id uuid not null, previous_data jsonb not null,
  changed_by uuid references public.admin_users(id), action text not null, changed_at timestamptz not null default now()
);
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(), name text not null, email text not null, subject text, message text not null,
  locale text not null default 'en', status text not null default 'new' check(status in ('new','read','archived')),
  received_at timestamptz not null default now(), ip_hash text, user_agent text
);

create index articles_status_publication_idx on public.articles(status,publication_date desc);
create index articles_area_idx on public.articles(primary_area_id);
create index site_content_lookup_idx on public.site_content(page_key,locale,status);
create index hubs_org_status_idx on public.resource_hubs(organisation_id,status);
create index resources_hub_idx on public.official_resources(hub_id);
create index resources_org_idx on public.official_resources(organisation_id);
create index resources_status_idx on public.official_resources(published,status,year desc);
create index resources_type_idx on public.official_resources(resource_type_id);
create index resources_health_review_idx on public.official_resources(health,next_review_at);
create index resources_search_idx on public.official_resources using gin(search_document);
create index resources_title_trgm_idx on public.official_resources using gin(official_title extensions.gin_trgm_ops);
create index resource_areas_area_idx on public.resource_areas(area_id,resource_id);
create index analyses_status_date_idx on public.library_analyses(status,publication_date desc);
create index checks_resource_date_idx on public.resource_checks(resource_id,checked_at desc);
create index revisions_entity_idx on public.content_revisions(entity_type,entity_id,changed_at desc);
create index audit_date_idx on public.audit_log(created_at desc);

create function private.set_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at=now(); return new; end $$;
create function private.capture_revision() returns trigger language plpgsql security definer set search_path = '' as $$
declare aid uuid;
begin
  select id into aid from public.admin_users where user_id=(select auth.uid()) and active limit 1;
  if tg_op='UPDATE' then insert into public.content_revisions(entity_type,entity_id,previous_data,changed_by,action) values(tg_table_name,old.id,to_jsonb(old),aid,'update'); end if;
  return new;
end $$;
revoke all on function private.set_updated_at() from public;
revoke all on function private.capture_revision() from public;

do $$ declare t text; begin
  foreach t in array array['admin_users','site_content','expertise_areas','articles','organisations','resource_hubs','official_resources','library_analyses','media_assets'] loop
    execute format('create trigger %I_updated before update on public.%I for each row execute function private.set_updated_at()',t,t);
  end loop;
  foreach t in array array['site_content','expertise_areas','articles','article_translations','resource_hubs','official_resources','library_analyses','analysis_translations'] loop
    execute format('create trigger %I_revision before update on public.%I for each row execute function private.capture_revision()',t,t);
  end loop;
end $$;

create function private.next_review(last_verified timestamptz, frequency public.update_frequency) returns timestamptz language sql immutable set search_path='' as $$
  select case frequency when 'weekly' then last_verified+interval '7 days' when 'monthly' then last_verified+interval '1 month'
    when 'quarterly' then last_verified+interval '3 months' when 'semiannual' then last_verified+interval '6 months'
    when 'annual' then last_verified+interval '1 year' else null end;
$$;
create function public.mark_resource_verified(resource_uuid uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  update public.official_resources set last_verified_at=now(),next_review_at=private.next_review(now(),update_frequency),updated_by=(select auth.uid()) where id=resource_uuid;
end $$;
revoke all on function public.mark_resource_verified(uuid) from public,anon;
grant execute on function public.mark_resource_verified(uuid) to authenticated;

create function public.search_official_resources(search_query text, area_key text default null, type_slug text default null, result_limit integer default 20, result_offset integer default 0)
returns table(id uuid,slug text,official_title text,short_title text,description text,official_url text,format text,year smallint,version_label text,language text,access public.access_level,status public.resource_status,last_verified_at timestamptz,health public.health_status,organisation_name text,organisation_slug text,resource_type text,rank real)
language sql stable security invoker set search_path='' as $$
  select r.id,r.slug,r.official_title,r.short_title,r.description,r.official_url,r.format,r.year,r.version_label,r.language,r.access,r.status,r.last_verified_at,r.health,o.name,o.slug,rt.name,
    case when search_query is null or trim(search_query)='' then 0::real else (ts_rank(r.search_document,websearch_to_tsquery('english',search_query))*10 + extensions.similarity(r.official_title,search_query)*5 + case when lower(r.official_title)=lower(search_query) then 100 else 0 end)::real end rank
  from public.official_resources r join public.organisations o on o.id=r.organisation_id join public.resource_types rt on rt.id=r.resource_type_id
  where r.published and r.status='current'
    and (search_query is null or trim(search_query)='' or r.search_document @@ websearch_to_tsquery('english',search_query) or r.official_title operator(extensions.%) search_query or search_query=any(o.aliases))
    and (type_slug is null or rt.slug=type_slug)
    and (area_key is null or exists(select 1 from public.resource_areas ra join public.expertise_areas ea on ea.id=ra.area_id where ra.resource_id=r.id and ea.key=area_key))
  order by rank desc,r.official_title limit least(result_limit,100) offset greatest(result_offset,0);
$$;
grant execute on function public.search_official_resources(text,text,text,integer,integer) to anon,authenticated;

-- RLS: deny by default, expose published public records, owner receives full CRUD.
do $$ declare t text; begin
  foreach t in array array['admin_users','site_settings','site_content','expertise_areas','expertise_translations','articles','article_translations','organisations','organisation_domains','resource_hubs','resource_hub_areas','resource_types','tags','official_resources','resource_areas','resource_tags','library_analyses','analysis_translations','analysis_resource_links','article_resource_links','media_assets','admin_favorites','resource_checks','audit_log','content_revisions','contact_messages'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant all on public.%I to authenticated',t);
    execute format('create policy owner_all on public.%I for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))',t);
  end loop;
end $$;

grant select on public.site_settings,public.site_content,public.expertise_areas,public.expertise_translations,public.articles,public.article_translations,public.organisations,public.organisation_domains,public.resource_hubs,public.resource_hub_areas,public.resource_types,public.tags,public.official_resources,public.resource_areas,public.resource_tags,public.library_analyses,public.analysis_translations,public.analysis_resource_links,public.article_resource_links,public.media_assets to anon;
create policy public_settings on public.site_settings for select to anon using(is_public);
create policy public_site_content on public.site_content for select to anon using(status='published');
create policy public_expertise on public.expertise_areas for select to anon using(active);
create policy public_expertise_i18n on public.expertise_translations for select to anon using(exists(select 1 from public.expertise_areas e where e.id=expertise_id and e.active));
create policy public_articles on public.articles for select to anon using(status='published');
create policy public_article_i18n on public.article_translations for select to anon using(exists(select 1 from public.articles a where a.id=article_id and a.status='published'));
create policy public_orgs on public.organisations for select to anon using(active);
create policy public_domains on public.organisation_domains for select to anon using(verified and exists(select 1 from public.organisations o where o.id=organisation_id and o.active));
create policy public_hubs on public.resource_hubs for select to anon using(status='published');
create policy public_hub_areas on public.resource_hub_areas for select to anon using(exists(select 1 from public.resource_hubs h where h.id=hub_id and h.status='published'));
create policy public_resource_types on public.resource_types for select to anon using(active);
create policy public_tags on public.tags for select to anon using(true);
create policy public_resources on public.official_resources for select to anon using(published and status='current' and title_verified and official_domain_verified);
create policy public_resource_areas on public.resource_areas for select to anon using(exists(select 1 from public.official_resources r where r.id=resource_id and r.published and r.status='current'));
create policy public_resource_tags on public.resource_tags for select to anon using(exists(select 1 from public.official_resources r where r.id=resource_id and r.published and r.status='current'));
create policy public_analyses on public.library_analyses for select to anon using(status='published');
create policy public_analysis_i18n on public.analysis_translations for select to anon using(exists(select 1 from public.library_analyses a where a.id=analysis_id and a.status='published'));
create policy public_analysis_links on public.analysis_resource_links for select to anon using(exists(select 1 from public.library_analyses a where a.id=analysis_id and a.status='published'));
create policy public_article_links on public.article_resource_links for select to anon using(exists(select 1 from public.articles a where a.id=article_id and a.status='published'));
create policy public_media on public.media_assets for select to anon using(published);
grant insert on public.contact_messages to anon;
create policy public_contact_insert on public.contact_messages for insert to anon with check(length(name) between 1 and 120 and length(email) between 3 and 254 and length(message) between 10 and 10000 and status='new');

-- Storage bucket and owner-only writes. Public reads apply only to the website-media bucket.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('website-media','website-media',true,10485760,array['image/jpeg','image/png','image/webp','image/svg+xml']) on conflict(id) do nothing;
create policy media_public_read on storage.objects for select to anon using(bucket_id='website-media');
create policy media_owner_all on storage.objects for all to authenticated using(bucket_id='website-media' and (select private.is_admin())) with check(bucket_id='website-media' and (select private.is_admin()));

-- Five immutable system relationships; copy changes display text only.
insert into public.expertise_areas(key,slug,display_name,sort_order,description) values
('sustainability-climate-change','sustainability-climate-change','Sustainability & Climate Change',1,'Environmental frameworks, climate strategy and decision-useful disclosure.'),
('geospatial-intelligence','geospatial-intelligence','Geospatial Intelligence',2,'Spatial evidence, Earth observation and location-aware environmental analysis.'),
('biodiversity-nature','biodiversity-nature','Biodiversity & Nature',3,'Nature-related dependencies, impacts, risks and opportunities.'),
('circular-economy','circular-economy','Circular Economy',4,'Material flows, circular design and measurement.'),
('carbon-markets-methodologies','carbon-markets-methodologies','Carbon Markets & Methodologies',5,'Crediting rules, integrity, MRV and market architecture.');

insert into public.resource_types(name,slug,sort_order) values
('Standard','standard',1),('Framework','framework',2),('Methodology','methodology',3),('Guidance','guidance',4),('Analytical Method','analytical-method',5),('Questionnaire','questionnaire',6),('Scoring Methodology','scoring-methodology',7),('Criteria','criteria',8),('Regulation','regulation',9),('Implementation Guidance','implementation-guidance',10),('Mapping','mapping',11),('Tool','tool',12),('Dataset','dataset',13),('Data Portal','data-portal',14),('API','api',15),('Template','template',16),('Calculator','calculator',17),('Technical Note','technical-note',18),('Report','report',19),('Webinar','webinar',20),('Slides','slides',21),('Video','video',22),('Reference Manual','reference-manual',23),('Official Overview','official-overview',24),('Other','other',99);

insert into public.site_settings(key,value,is_public) values
('site_identity','{"name":"Ze-Xun Lai","platform":"Environmental Intelligence","defaultLocale":"en","locales":["en","zh-TW"]}',true),
('social_links','{"linkedin":"https://www.linkedin.com/in/ze-xun-lai-3646432bb/","email":"zexunlai@gmail.com"}',true),
('system','{"contentSource":"supabase","publicSignup":false}',false);

insert into public.site_content(page_key,section_key,locale,content,status,sort_order) values
('home','hero','en','{"eyebrow":"Ze-Xun Lai · Environmental Intelligence","headline":"Environmental intelligence across systems, space and markets.","description":"Applying environmental frameworks, spatial evidence and methodological research to turn complex environmental questions into clearer analysis and decisions.","location":"Based in Taipei, Taiwan.","ctaText":"Explore expertise","ctaLink":"/expertise/"}','published',1),
('home','hero','zh-TW','{"eyebrow":"Ze-Xun Lai · Environmental Intelligence","headline":"連結環境系統、空間與市場的專業知識。","description":"運用環境框架、空間證據與方法學研究，將複雜的環境問題轉化為更清楚的分析與決策。","location":"位於台北，台灣。","ctaText":"探索專業領域","ctaLink":"/zh-TW/expertise/"}','published',1),
('home','sections','en','{"areasHeading":"Environmental questions across connected systems.","featuredHeading":"Recent analysis from each area.","libraryHeading":"Methods & Resources Library","libraryDescription":"A curated reference system connecting original analysis with official methods, frameworks, standards, datasets and technical resources across environmental practice.","aboutPreview":"A sustainability professional with a background in geography.","contactHeading":"Have a question or idea to discuss?","contactText":"Let’s connect.","footerIntro":"Environmental questions, examined spatially."}','published',2),
('home','sections','zh-TW','{"areasHeading":"相互連結的環境系統。","featuredHeading":"五大領域的近期分析。","libraryHeading":"方法與官方資源圖書館","libraryDescription":"連結原創分析與官方方法、框架、標準、資料集及技術資源的專業參考系統。","aboutPreview":"具地理學背景的永續專業工作者。","contactHeading":"有想共同討論的問題嗎？","contactText":"歡迎聯絡。","footerIntro":"從空間脈絡理解環境問題。"}','published',2);
