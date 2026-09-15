-- Expose only approved glossary definitions while keeping master glossary tables private.
create or replace function public.get_public_glossary_definitions()
returns table(
  id uuid,
  canonical_english_term text,
  acronym text,
  public_display_rule public.glossary_display_rule,
  locale text,
  display_term text,
  definition text,
  source_organisation text,
  source_title text,
  source_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    gt.id,
    gt.canonical_english_term,
    gt.acronym,
    gt.public_display_rule,
    tr.locale,
    tr.display_term,
    tr.definition,
    gs.organisation,
    gs.official_title,
    gs.official_url
  from public.glossary_terms gt
  join public.glossary_term_translations tr on tr.glossary_term_id = gt.id
  left join public.glossary_sources gs on gs.id = gt.definition_source_id
  where gt.status = 'approved'
    and gt.public_definition_enabled
    and tr.definition is not null;
$$;

revoke all on function public.get_public_glossary_definitions() from public;
grant execute on function public.get_public_glossary_definitions() to anon, authenticated;

create or replace view public.public_glossary_definitions
with (security_barrier = true, security_invoker = false)
as select * from public.get_public_glossary_definitions();

revoke all on public.public_glossary_definitions from public, authenticated;
grant select on public.public_glossary_definitions to anon, authenticated;
