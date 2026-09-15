import type { APIRoute } from 'astro';
import { getAdminContext } from '../../../lib/supabase';
import { assertSameOrigin, documentFromHtml } from '../../../lib/admin';
import { getTranslationProvider } from '../../../lib/translation';
export const prerender=false;

export const POST:APIRoute=async({request,cookies,locals,redirect})=>{
  try{assertSameOrigin(request)}catch{return new Response('Invalid origin',{status:403})}
  const{client,user,admin}=await getAdminContext(request,cookies,locals);if(!client||!user||!admin)return new Response('Forbidden',{status:403});
  const provider=getTranslationProvider(locals);if(!provider)return new Response('Google Cloud Translation is not configured.',{status:503});
  const form=await request.formData();const entity=String(form.get('entity')??'');const entityId=String(form.get('id')??'');const targetLocale=String(form.get('target_locale')??'zh-TW') as 'en'|'zh-TW';
  const meta=entity==='article'?{parent:'articles',translations:'article_translations',parentKey:'article_id',back:'articles'}:entity==='analysis'?{parent:'library_analyses',translations:'analysis_translations',parentKey:'analysis_id',back:'analyses'}:null;if(!meta||!entityId)return new Response('Invalid translation request',{status:400});
  const parent=await client.from(meta.parent).select('id,source_language,updated_at').eq('id',entityId).single();if(parent.error)return new Response(parent.error.message,{status:404});const sourceLocale=parent.data.source_language as 'en'|'zh-TW';if(sourceLocale===targetLocale)return new Response('Target language is already the source language',{status:400});
  const source=await client.from(meta.translations).select('title,summary,body_html').eq(meta.parentKey,entityId).eq('locale',sourceLocale).single();if(source.error)return new Response('Source translation is missing',{status:400});
  const sync=await client.from('translation_glossary_syncs').select('id').eq('provider','google_cloud_translation').eq('source_locale',sourceLocale).eq('target_locale',targetLocale).eq('sync_status','synced').order('synced_at',{ascending:false}).limit(1).maybeSingle();
  const job=await client.from('translation_jobs').insert({entity_type:entity,entity_id:entityId,source_locale:sourceLocale,target_locale:targetLocale,provider:provider.name,provider_model:'general/nmt',job_status:'running',glossary_sync_id:sync.data?.id??null,requested_by:user.id,started_at:new Date().toISOString()}).select('id').single();if(job.error)return new Response(job.error.message,{status:400});
  try{
    const [plain,rich]=await Promise.all([provider.translate({contents:[source.data.title,source.data.summary],sourceLocale,targetLocale,mimeType:'text/plain',useGlossary:Boolean(sync.data)}),provider.translate({contents:[source.data.body_html],sourceLocale,targetLocale,mimeType:'text/html',useGlossary:Boolean(sync.data)})]);
    const translatedHtml=rich.translations[0]??'';const row:any={[meta.parentKey]:entityId,locale:targetLocale,title:plain.translations[0]??'',summary:plain.translations[1]??'',body_html:translatedHtml,body:documentFromHtml(translatedHtml),translation_status:'machine_translated',translation_provider:provider.name,provider_model:plain.model,translator_name:null,translation_credit_public:true,translated_at:new Date().toISOString(),reviewed_at:null,source_updated_at_at_translation:parent.data.updated_at,provider_job_id:plain.providerJobId??null,machine_translation_raw:{plain:plain.raw,rich:rich.raw},published_content:null,is_published:false,translation_published_at:null,attribution_required:plain.attributionRequired,glossary_sync_id:sync.data?.id??null};
    const saved=await client.from(meta.translations).upsert(row,{onConflict:`${meta.parentKey},locale`});if(saved.error)throw saved.error;
    await client.from('translation_jobs').update({job_status:'succeeded',completed_at:new Date().toISOString(),provider_job_id:plain.providerJobId??null}).eq('id',job.data.id);
    await client.from('audit_log').insert({admin_user_id:admin.id,action:'translate',entity_type:entity,entity_id:entityId,metadata:{sourceLocale,targetLocale,provider:provider.name,glossarySyncId:sync.data?.id??null}});
    return redirect(`/admin/${meta.back}/?id=${entityId}&translated=1`,303);
  }catch(error:any){await client.from('translation_jobs').update({job_status:'failed',completed_at:new Date().toISOString(),error_detail:String(error?.message??error).slice(0,2000)}).eq('id',job.data.id);return new Response(`Translation failed: ${String(error?.message??error)}`,{status:502});}
};

