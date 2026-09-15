import type { APIRoute } from 'astro';
import { getAdminContext } from '../../../lib/supabase';
import { assertSameOrigin } from '../../../lib/admin';
export const prerender=false;
export const POST:APIRoute=async({request,cookies,locals,redirect})=>{
  try{assertSameOrigin(request)}catch{return new Response('Invalid origin',{status:403})}
  const{client,admin,user}=await getAdminContext(request,cookies,locals);if(!client||!admin||!user)return new Response('Forbidden',{status:403});
  const form=await request.formData();const id=String(form.get('id')??'');const operation=String(form.get('operation')??'update');if(!id)return new Response('Missing media ID',{status:400});
  if(operation==='delete'){
    const [articleUse,articleOg,analysisOg]=await Promise.all([client.from('articles').select('id',{count:'exact',head:true}).eq('hero_image_id',id),client.from('article_translations').select('id',{count:'exact',head:true}).eq('og_image_id',id),client.from('analysis_translations').select('id',{count:'exact',head:true}).eq('og_image_id',id)]);
    const used=(articleUse.count??0)+(articleOg.count??0)+(analysisOg.count??0);if(used)return new Response(`Media is used by ${used} content item(s). Replace those references first.`,{status:409});
    const current=await client.from('media_assets').select('storage_path').eq('id',id).single();if(current.error)return new Response(current.error.message,{status:404});
    const removed=await client.storage.from('website-media').remove([current.data.storage_path]);if(removed.error)return new Response(removed.error.message,{status:400});
    const deleted=await client.from('media_assets').delete().eq('id',id);if(deleted.error)return new Response(deleted.error.message,{status:400});
    await client.from('audit_log').insert({admin_user_id:admin.id,action:'delete',entity_type:'media_assets',entity_id:id});
  }else{
    const update=await client.from('media_assets').update({alt_text:String(form.get('alt_text')??''),caption:String(form.get('caption')??'')||null,description:String(form.get('description')??'')||null,updated_by:user.id}).eq('id',id);if(update.error)return new Response(update.error.message,{status:400});
    await client.from('audit_log').insert({admin_user_id:admin.id,action:'update',entity_type:'media_assets',entity_id:id});
  }
  return redirect('/admin/media/?saved=1',303);
};
