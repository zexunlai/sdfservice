import { getCollection } from 'astro:content';
import { createPublicClient } from './supabase';
import type { GlossaryDefinition } from './glossary';

export type Locale = 'en' | 'zh-TW';
export interface PublicArticle { id:string; slug:string; areaKey:string; area:string; subtopic?:string|null; author:string; publicationDate:string; updatedDate?:string|null; tags:string[]; featured?:boolean; title:string; subtitle?:string|null; summary:string; bodyHtml:string; source:'markdown'|'supabase'; requestedLocale:Locale; contentLocale:Locale; sourceLanguage:Locale; fallback:boolean; translationStatus?:string; translationProvider?:string|null; translatorName?:string|null; translationCreditPublic?:boolean; attributionRequired?:boolean; }

export async function getSiteSection(locals: App.Locals, pageKey: string, sectionKey: string, locale: Locale) {
  const db = createPublicClient(locals);
  if (!db) return null;
  const { data } = await db.from('site_content').select('content').eq('page_key', pageKey).eq('section_key', sectionKey).eq('locale', locale).eq('status', 'published').maybeSingle();
  if (data?.content) return data.content as Record<string, string>;
  if (locale !== 'en') {
    const { data: fallback } = await db.from('site_content').select('content').eq('page_key', pageKey).eq('section_key', sectionKey).eq('locale', 'en').eq('status', 'published').maybeSingle();
    return (fallback?.content as Record<string, string>) ?? null;
  }
  return null;
}

export async function getPublishedArticles(locals: App.Locals, locale: Locale = 'en'): Promise<PublicArticle[]> {
  const db = createPublicClient(locals);
  if (!db) {
    const entries = await getCollection('insights', ({ data }) => !data.draft);
    return entries.map(({ id, data }) => ({ id, slug: id, areaKey: '', area: data.area, subtopic: data.subtopic, author: data.author, publicationDate: data.publicationDate.toISOString().slice(0,10), updatedDate: data.updatedDate?.toISOString().slice(0,10), tags: data.tags, featured: data.featured, title: data.title, subtitle: null, summary: data.description, bodyHtml: '', source: 'markdown' as const,requestedLocale:locale,contentLocale:'en' as const,sourceLanguage:'en' as const,fallback:locale!=='en' }));
  }
  const { data, error } = await db.from('articles').select('id,slug,source_language,subtopic,author,publication_date,updated_date,tags,featured,expertise_areas!inner(key,display_name),article_translations(locale,title,subtitle,summary,body_html,seo_title,seo_description,translation_status,translation_provider,translator_name,translation_credit_public,attribution_required,is_published)').eq('status','published').order('publication_date',{ascending:false});
  if (error) throw error;
  return (data ?? []).map((row: any): PublicArticle | null => {
    const translations = row.article_translations ?? [];
    const translation = translations.find((item: any) => item.locale === locale) ?? translations.find((item: any) => item.locale === row.source_language) ?? translations[0];const contentLocale=(translation?.locale??row.source_language) as Locale;
    if (!row.slug || !row.expertise_areas?.key || !row.publication_date || !translation?.title) return null;
    return { id: row.id, slug: row.slug, areaKey: row.expertise_areas.key, area: row.expertise_areas.display_name ?? row.expertise_areas.key, subtopic: row.subtopic, author: row.author ?? 'Ze-Xun Lai', publicationDate: row.publication_date, updatedDate: row.updated_date, tags: Array.isArray(row.tags) ? row.tags : [], featured: row.featured === true, title: translation.title, subtitle: translation.subtitle ?? null, summary: translation.summary ?? '', bodyHtml: translation.body_html ?? '', source: 'supabase' as const,requestedLocale:locale,contentLocale,sourceLanguage: row.source_language as Locale, fallback:contentLocale!==locale,translationStatus:translation?.translation_status,translationProvider:translation?.translation_provider,translatorName:translation?.translator_name,translationCreditPublic:translation?.translation_credit_public,attributionRequired:translation?.attribution_required };
  }).filter((article): article is PublicArticle => article !== null);
}

export async function getArticleBySlug(locals: App.Locals, slug: string, locale: Locale = 'en') {
  const articles = await getPublishedArticles(locals, locale);
  return articles.find((article) => article.slug === slug) ?? null;
}

export async function getAnalyses(locals: App.Locals, locale: Locale = 'en') {
  const db = createPublicClient(locals); if (!db) return [];
  const { data, error } = await db.from('library_analyses').select('id,slug,source_language,analysis_type,subtopic,tags,publication_date,updated_date,featured,expertise_areas!inner(key,display_name),analysis_translations(locale,title,summary,body_html,seo_title,seo_description,translation_status,translation_provider,translator_name,translation_credit_public,attribution_required,is_published)').eq('status','published').order('publication_date',{ascending:false});
  if (error) throw error;
  return (data ?? []).map((row: any) => { const ts=row.analysis_translations??[]; const tr=ts.find((x:any)=>x.locale===locale)??ts.find((x:any)=>x.locale===row.source_language)??ts[0]; const contentLocale=(tr?.locale??row.source_language) as Locale;return {...row,areaKey:row.expertise_areas.key,area:row.expertise_areas.display_name,title:tr?.title,summary:tr?.summary,bodyHtml:tr?.body_html??'',requestedLocale:locale,contentLocale,sourceLanguage:row.source_language,fallback:contentLocale!==locale,translationStatus:tr?.translation_status,translationProvider:tr?.translation_provider,translatorName:tr?.translator_name,translationCreditPublic:tr?.translation_credit_public,attributionRequired:tr?.attribution_required}; });
}

export async function getPublicGlossaryDefinitions(locals:App.Locals,locale:Locale):Promise<GlossaryDefinition[]>{const db=createPublicClient(locals);if(!db)return[];const{data}=await db.from('public_glossary_definitions').select('*').in('locale',[locale,'en']);const rows=(data??[]) as GlossaryDefinition[],localized=new Map(rows.filter(x=>x.locale===locale).map(x=>[x.id,x]));for(const row of rows.filter(x=>x.locale==='en'))if(!localized.has(row.id))localized.set(row.id,row);return [...localized.values()]}

export async function getSiteSetting(locals:App.Locals,key:string){const db=createPublicClient(locals);if(!db)return null;const{data}=await db.from('site_settings').select('value').eq('key',key).eq('is_public',true).maybeSingle();return data?.value??null}

export async function searchResources(locals: App.Locals, params: { q?: string; area?: string; type?: string; organisation?: string; format?: string; language?: string; access?: string; year?: string; page?: number; pageSize?: number }) {
  const db = createPublicClient(locals); if (!db) return { resources: [], count: 0, configured: false };
  const page=Math.max(1,params.page??1), pageSize=Math.min(50,Math.max(1,params.pageSize??20));
  if (params.q?.trim()) {
    const ranked = await db.rpc('search_official_resources', { search_query:params.q.trim(), area_key:params.area||null, type_slug:params.type||null, result_limit:Math.min(100,pageSize*4), result_offset:(page-1)*pageSize });
    if (ranked.error) throw ranked.error;
    const ids=(ranked.data??[]).map((row:any)=>row.id);
    if (!ids.length) return { resources:[], count:0, configured:true };
    let detailQuery=db.from('official_resources').select('id,slug,official_title,short_title,description,official_url,format,year,version_label,language,access,status,last_verified_at,health,data_theme,data_type,geographic_coverage,api_available,organisations!inner(name,slug),resource_types!inner(name,slug),resource_areas!inner(expertise_areas!inner(key,display_name))').in('id',ids);
    if(params.organisation) detailQuery=detailQuery.eq('organisations.slug',params.organisation);
    if(params.format) detailQuery=detailQuery.eq('format',params.format);
    if(params.language) detailQuery=detailQuery.eq('language',params.language);
    if(params.access) detailQuery=detailQuery.eq('access',params.access);
    if(params.year) detailQuery=detailQuery.eq('year',Number(params.year));
    const details=await detailQuery;if(details.error)throw details.error;
    const rank=new Map<string,number>(ids.map((id:string,index:number)=>[id,index]));
    const resources=(details.data??[]).sort((a:any,b:any)=>(rank.get(a.id)??999)-(rank.get(b.id)??999));
    return {resources,count:resources.length,configured:true};
  }
  let query=db.from('official_resources').select('id,slug,official_title,short_title,description,official_url,format,year,version_label,language,access,status,last_verified_at,health,data_theme,data_type,geographic_coverage,api_available,organisations!inner(name,slug),resource_types!inner(name,slug),resource_areas!inner(expertise_areas!inner(key,display_name))',{count:'exact'}).eq('published',true).eq('status','current').eq('title_verified',true).eq('official_domain_verified',true);
  if(params.type) query=query.eq('resource_types.slug',params.type);
  if(params.organisation) query=query.eq('organisations.slug',params.organisation);
  if(params.format) query=query.eq('format',params.format);
  if(params.language) query=query.eq('language',params.language);
  if(params.access) query=query.eq('access',params.access);
  if(params.year) query=query.eq('year',Number(params.year));
  if(params.area) query=query.eq('resource_areas.expertise_areas.key',params.area);
  const {data,error,count}=await query.order('official_title').range((page-1)*pageSize,page*pageSize-1); if(error) throw error;
  return {resources:(data??[]) as any[],count:count??0,configured:true};
}

export async function getResourceBySlug(locals: App.Locals, slug: string) {
  const db=createPublicClient(locals); if(!db)return null;
  const {data}=await db.from('official_resources').select('*,organisations!inner(name,slug,official_website),resource_types!inner(name,slug),resource_areas!inner(expertise_areas!inner(key,display_name)),resource_tags(tags!inner(name,slug)),resource_hubs!inner(title,slug)').eq('slug',slug).eq('published',true).eq('status','current').maybeSingle(); return data as any;
}

export async function getHubBySlug(locals: App.Locals, slug: string) {
  const db=createPublicClient(locals); if(!db)return null;
  const {data}=await db.from('resource_hubs').select('*,organisations!inner(name,slug,official_website),resource_hub_areas(expertise_areas!inner(key,display_name)),official_resources(id,slug,official_title,description,official_url,format,year,version_label,access,status,last_verified_at,resource_types!inner(name,slug))').eq('slug',slug).eq('status','published').maybeSingle(); return data as any;
}
