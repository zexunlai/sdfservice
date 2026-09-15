import { mkdir, writeFile } from 'node:fs/promises';
import { officialResourceCatalog } from './official-resource-catalog';

const q=(value:string|null|undefined)=>value==null?'null':`'${value.replaceAll("'","''")}'`;
const a=(values:string[]|undefined)=>`array[${(values??[]).map(q).join(',')}]::text[]`;
const slugify=(value:string)=>value.normalize('NFKD').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase().slice(0,90);
const typeSlug=(type:string)=>slugify(type);
const access=(value?:string)=>value??'public';
const needsReviewUrls=new Set([
  'https://help.cdp.net/en-US/knowledgebase/article/KA-01019','https://www.unep-wcmc.org/en/resources-and-data','https://seea.un.org/content/seea-publications','https://www.wbcsd.org/actions/circular-economy/','https://www.ellenmacarthurfoundation.org/resources/learning-hub/overview','https://www.keybiodiversityareas.org/','https://www.keybiodiversityareas.org/working-with-kbas/proposing-updating/criteria','https://www.keybiodiversityareas.org/sites/search','https://globalgoals.goldstandard.org/standards/400-series/','https://www.goldstandard.org/resources','https://acrcarbon.org/eligibility-criteria/','https://acrcarbon.org/documents/','https://www.planvivo.org/pv-climate','https://unfccc.int/process-and-meetings/the-paris-agreement/article-64-mechanism','https://unfccc.int/process-and-meetings/the-paris-agreement/the-paris-agreement/cooperative-implementation/article-6/article-62','https://unfccc.int/process-and-meetings/the-paris-agreement/the-paris-agreement/cooperative-implementation/article-6','https://unfccc.int/process-and-meetings/bodies/constituted-bodies/article-64-supervisory-body/rules-and-regulations','https://www.planvivo.org/documents-and-resources','https://unfccc.int/process-and-meetings/bodies/constituted-bodies/article-64-supervisory-body','https://vcmintegrity.org/resources/','https://www.planvivo.org/methodologies','https://www.earthdata.nasa.gov/data/instruments/smap','https://www.earthdata.nasa.gov/data/instruments/gpm','https://acrcarbon.org/methodologies/','https://www.ncei.noaa.gov/','https://www.ncei.noaa.gov/access','https://www.fao.org/in-action/sepal-platform/en',
]);
let sql=`-- Generated from scripts/official-resource-catalog.ts.\n-- Official external documents are linked, never mirrored.\nbegin;\n`;
const seen = new Set<string>();
let resourceCount=0;
let publishedCount=0;
for(const hub of officialResourceCatalog){
  sql+=`\ninsert into public.organisations(name,slug,description,official_website,aliases,active) values (${q(hub.organisation)},${q(hub.organisationSlug)},${q(hub.description)},${q(hub.website)},${a(hub.aliases)},true) on conflict(slug) do update set name=excluded.name,description=excluded.description,official_website=excluded.official_website,aliases=excluded.aliases,active=true;\n`;
  for(const domain of hub.domains) sql+=`insert into public.organisation_domains(organisation_id,domain,allow_subdomains,verified) select id,${q(domain)},true,true from public.organisations where slug=${q(hub.organisationSlug)} on conflict(organisation_id,domain) do update set verified=true;\n`;
  sql+=`insert into public.resource_hubs(organisation_id,slug,title,description,official_website,status,last_verified_at) select id,${q(hub.slug)},${q(hub.title)},${q(hub.description)},${q(hub.website)},'published',timestamptz '2026-09-15T00:00:00+08:00' from public.organisations where slug=${q(hub.organisationSlug)} on conflict(slug) do update set title=excluded.title,description=excluded.description,official_website=excluded.official_website,status='published',last_verified_at=excluded.last_verified_at;\n`;
  for(const area of hub.areas) sql+=`insert into public.resource_hub_areas(hub_id,area_id) select h.id,e.id from public.resource_hubs h,public.expertise_areas e where h.slug=${q(hub.slug)} and e.key=${q(area)} on conflict do nothing;\n`;
  for(const item of hub.resources){
    let slug=slugify(`${hub.slug}-${item.title}`);let n=2;while(seen.has(slug))slug=`${slugify(`${hub.slug}-${item.title}`).slice(0,86)}-${n++}`;seen.add(slug);
    const format=item.format??(item.url.toLowerCase().includes('.pdf')?'PDF':item.type==='API'?'API':item.type==='Dataset'?'Dataset':item.type==='Data Portal'?'Web':'Web');
    const description=`Official ${String(item.type??'resource').toLowerCase()} published by ${hub.organisation}. Use the linked source for the current content, access conditions and supporting documentation.`;
    const host=new URL(item.url).hostname.toLowerCase().replace(/^www\./,'');
    const verifiedDomain=hub.domains.some((domain)=>host===domain||host.endsWith(`.${domain}`));
    const publishable=verifiedDomain&&!needsReviewUrls.has(item.url);
    const status=publishable?'current':'needs_review';
    sql+=`insert into public.official_resources(hub_id,organisation_id,resource_type_id,slug,official_title,short_title,document_code,description,official_url,format,language,access,status,update_frequency,last_verified_at,next_review_at,title_source,title_verified,official_domain_verified,health,is_featured,published,data_theme,data_type,geographic_coverage,api_available,documentation_url) select h.id,o.id,t.id,${q(slug)},${q(item.title)},${q(item.short)},${q(item.code)},${q(description)},${q(item.url)},${q(format)},'en',${q(access(item.access))}::public.access_level,${q(status)}::public.resource_status,'quarterly',timestamptz '2026-09-15T00:00:00+08:00',timestamptz '2026-12-15T00:00:00+08:00','page_heading',true,${verifiedDomain},'unknown',false,${publishable},${q(item.dataTheme)},${q(item.dataType)},${q(item.geographicCoverage)},${item.api===undefined?'null':item.api},${q(item.documentationUrl)} from public.resource_hubs h join public.organisations o on o.id=h.organisation_id cross join public.resource_types t where h.slug=${q(hub.slug)} and t.slug=${q(typeSlug(item.type??'Official Overview'))} on conflict(slug) do update set official_title=excluded.official_title,description=excluded.description,official_url=excluded.official_url,format=excluded.format,access=excluded.access,last_verified_at=excluded.last_verified_at,next_review_at=excluded.next_review_at,title_verified=excluded.title_verified,official_domain_verified=excluded.official_domain_verified,published=excluded.published,status=excluded.status;\n`;
    for(const area of item.areas??hub.areas) sql+=`insert into public.resource_areas(resource_id,area_id) select r.id,e.id from public.official_resources r,public.expertise_areas e where r.slug=${q(slug)} and e.key=${q(area)} on conflict do nothing;\n`;
    resourceCount++;
    if(publishable)publishedCount++;
  }
}
sql+='\ncommit;\n';
await mkdir('supabase',{recursive:true});await writeFile('supabase/seed.sql',sql);
console.log(`Generated ${officialResourceCatalog.length} Resource Hubs, ${resourceCount} catalog records and ${publishedCount} domain-verified published Official Resources.`);
