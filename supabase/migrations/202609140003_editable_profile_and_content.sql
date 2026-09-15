create table public.profile_items (
  id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('experience','education','teaching','credential','language','tool')),
  locale text not null check(locale in ('en','zh-TW')), title text not null, organisation text, location text,
  start_label text, end_label text, summary text, sort_order integer not null default 0, active boolean not null default true,
  created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index profile_items_public_idx on public.profile_items(kind,locale,active,sort_order);
alter table public.profile_items enable row level security;
revoke all on public.profile_items from anon,authenticated;
grant select on public.profile_items to anon;
grant all on public.profile_items to authenticated;
create policy public_profile_items on public.profile_items for select to anon using(active);
create policy owner_all on public.profile_items for all to authenticated using((select private.is_admin())) with check((select private.is_admin()));
create trigger profile_items_updated before update on public.profile_items for each row execute function private.set_updated_at();
create trigger profile_items_revision before update on public.profile_items for each row execute function private.capture_revision();

insert into public.site_content(page_key,section_key,locale,content,status,sort_order) values
('header','navigation','en','{"home":"Home","expertise":"Expertise","insights":"Insights","library":"Library","about":"About","contact":"Contact"}','published',1),
('header','navigation','zh-TW','{"home":"首頁","expertise":"專業領域","insights":"觀點文章","library":"圖書館","about":"關於","contact":"聯絡"}','published',1),
('footer','main','en','{"intro":"Environmental questions, examined spatially.","location":"Based in Taiwan","copyright":"© 2026 Ze-Xun Lai. All rights reserved."}','published',1),
('footer','main','zh-TW','{"intro":"從空間脈絡理解環境問題。","location":"位於台灣","copyright":"© 2026 Ze-Xun Lai. All rights reserved."}','published',1),
('about','profile','en','{"eyebrow":"About","heading":"Ze-Xun Lai","profile":"A sustainability professional working at the intersection of geospatial analysis, climate, biodiversity, circular economy and carbon markets.","approach":"My work and research interests focus on understanding how environmental challenges can be translated into measurable risks, spatial patterns, management frameworks and practical decision-making tools."}','published',1),
('about','profile','zh-TW','{"eyebrow":"關於","heading":"Ze-Xun Lai","profile":"永續專業工作者，關注空間分析、氣候、生物多樣性、循環經濟與碳市場的交會。","approach":"我的工作與研究著重於將環境挑戰轉化為可衡量的風險、空間型態、管理框架與實務決策工具。"}','published',1),
('contact','main','en','{"eyebrow":"Contact","heading":"Let’s connect around shared questions.","description":"I welcome conversations and potential collaborations across the five areas of this platform."}','published',1),
('contact','main','zh-TW','{"eyebrow":"聯絡","heading":"一起討論共同關心的問題。","description":"歡迎就本平台的五大領域交流與合作。"}','published',1),
('privacy','main','en','{"heading":"Privacy & Cookies","lastUpdated":"14 Sep 2026"}','published',1),
('disclaimer','main','en','{"heading":"Disclaimer & Terms","lastUpdated":"14 Sep 2026"}','published',1),
('seo','defaults','en','{"siteTitle":"Ze-Xun Lai — Environmental Intelligence","description":"Environmental intelligence across systems, space and markets."}','published',1)
on conflict(page_key,section_key,locale) do nothing;

insert into public.profile_items(kind,locale,title,organisation,start_label,end_label,summary,sort_order) values
('education','en','B.Sc. in Geography','National Taiwan University',null,null,'Academic training in spatial thinking, GIS, remote sensing, environmental systems, climate, statistics and data analysis.',1),
('language','en','Chinese',null,null,null,null,1),('language','en','English',null,null,null,null,2),('language','en','Taiwanese',null,null,null,null,3),('language','en','Japanese',null,null,null,null,4),
('tool','en','GIS',null,null,null,null,1),('tool','en','Remote Sensing',null,null,null,null,2),('tool','en','Excel',null,null,null,null,3),('tool','en','R',null,null,null,null,4),('tool','en','Environmental Data Analysis',null,null,null,null,5);
