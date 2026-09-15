-- Align the editorial default with the allowed definition provenance values.
alter table public.glossary_terms
  alter column definition_type set default 'ze_xun_lai';
