begin;

-- These tests are intentionally plain SQL so they also run without pgTAP.
set local role anon;
do $$ begin
  if exists(select 1 from public.articles where status <> 'published') then raise exception 'anon can read non-published articles'; end if;
  if exists(select 1 from public.official_resources where not published or status <> 'current') then raise exception 'anon can read non-public resources'; end if;
end $$;

do $$ begin
  begin perform 1 from public.admin_users limit 1; raise exception 'anon can read admin_users';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.contact_messages limit 1; raise exception 'anon can read contact inbox';
  exception when insufficient_privilege then null; end;
end $$;

do $$ begin
  begin insert into public.articles(slug,primary_area_id) select 'forbidden-anon-write',id from public.expertise_areas limit 1; raise exception 'anon article write unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
rollback;
