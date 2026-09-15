export type GlossaryRule='preferred'|'must_use'|'keep_original'|'keep_acronym'|'do_not_translate'|'context_dependent';
export type GlossaryDefinition={id:string;canonical_english_term:string;acronym?:string|null;public_display_rule:'first_occurrence_only'|'every_occurrence'|'manual_only';locale:'en'|'zh-TW';display_term:string;definition:string;source_organisation?:string|null;source_title?:string|null;source_url?:string|null};

export function stripHtml(value:string){return value.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim()}
export function escapeRegExp(value:string){return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}

export function checkTerminology(text:string,terms:any[],locale:'en'|'zh-TW'){
  const clean=stripHtml(text);const issues:any[]=[];
  for(const term of terms){
    if(term.status!=='approved')continue;
    const preferred=locale==='en'?term.preferred_english_term:term.preferred_chinese_term;
    const avoids=locale==='en'?(term.avoid_english??[]):(term.avoid_chinese??[]);
    for(const avoid of avoids){const flags=term.case_sensitive?'g':'gi';const matches=clean.match(new RegExp(escapeRegExp(avoid),flags));if(matches?.length)issues.push({termId:term.id,kind:'avoid',found:avoid,preferred,count:matches.length,message:`“${avoid}” is not preferred. Use “${preferred}”.`});}
    if(term.acronym&&term.case_sensitive){const loose=clean.match(new RegExp(`\\b${escapeRegExp(term.acronym)}\\b`,'gi'))??[];const wrong=loose.filter(x=>x!==term.acronym);if(wrong.length)issues.push({termId:term.id,kind:'case',found:wrong[0],preferred:term.acronym,count:wrong.length,message:`Use the approved acronym case: ${term.acronym}.`});}
  }
  return issues;
}

function escapeAttr(value:string){return value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;')}
export function annotateGlossaryHtml(html:string,definitions:GlossaryDefinition[]){
  const available=definitions.filter(x=>x.definition&&x.public_display_rule!=='manual_only').sort((a,b)=>b.display_term.length-a.display_term.length);if(!available.length)return html;
  const used=new Set<string>();let blocked=0;
  return html.split(/(<[^>]+>)/g).map(part=>{
    if(part.startsWith('<')){const close=/^<\//.test(part);const protectedTag=/^<\/?(a|button|code|pre|script|style)\b/i.exec(part);if(protectedTag)blocked+=close?-1:1;return part;}
    if(blocked>0)return part;
    let result=part;
    for(const def of available){if(def.public_display_rule==='first_occurrence_only'&&used.has(def.id))continue;const re=new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRegExp(def.display_term)})(?=$|[^\\p{L}\\p{N}])`,def.public_display_rule==='every_occurrence'?'giu':'iu');let matched=false;result=result.replace(re,(_m,prefix,term)=>{matched=true;return `${prefix}<button type="button" class="glossary-term" aria-expanded="false" data-term="${escapeAttr(def.display_term)}" data-definition="${escapeAttr(def.definition)}" data-source="${escapeAttr(def.source_organisation??'')}" data-source-url="${escapeAttr(def.source_url??'')}">${term}</button>`});if(matched)used.add(def.id);}
    return result;
  }).join('');
}
