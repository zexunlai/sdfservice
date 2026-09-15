begin;
do $$ declare org uuid; hub uuid; rt uuid; area uuid; begin
  select id into org from public.organisations limit 1;
  if org is null then insert into public.organisations(name,slug,official_website) values('Invariant Test','invariant-test','https://example.gov') returning id into org; end if;
  insert into public.organisation_domains(organisation_id,domain) values(org,'example.gov') on conflict do nothing;
  select id into area from public.expertise_areas limit 1;
  select id into rt from public.resource_types limit 1;
  insert into public.resource_hubs(organisation_id,slug,title,description) values(org,'invariant-test','Invariant Test','Test hub') on conflict(slug) do update set title=excluded.title returning id into hub;
  begin
    insert into public.official_resources(hub_id,organisation_id,resource_type_id,slug,official_title,description,official_url,format,status,published,title_verified,official_domain_verified)
    values(hub,org,rt,'unverified-published','ABC-010203','Test','https://example.gov/ABC-010203.pdf','PDF','current',true,false,true);
    raise exception 'unverified title published';
  exception when check_violation then null; end;
end $$;
rollback;
