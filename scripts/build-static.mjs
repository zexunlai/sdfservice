import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'dist');
const sourceArticles=path.join(root,'articles');
const legacyArticles=path.join(root,'content','legacy-articles');
const escape=(value='')=>String(value).replace(/[&<>"']/g,(character)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[character]);
const titleCase=(value)=>value.replace(/[-_]+/g,' ').replace(/\b\w/g,(letter)=>letter.toUpperCase());
const labelDate=(date)=>date?new Intl.DateTimeFormat('en',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${date}T00:00:00Z`)):'';
const url=(value)=>encodeURI(value.split(path.sep).join('/'));

const parseFrontMatter=(source)=>{const match=source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);if(!match)return {data:{},body:source};const data={};for(const line of match[1].split(/\r?\n/)){const item=line.match(/^([^:]+):\s*(.*)$/);if(!item)continue;let [,key,value]=item;value=value.trim();if(value.startsWith('[')&&value.endsWith(']'))value=value.slice(1,-1).split(',').map((tag)=>tag.trim()).filter(Boolean);else if(value==='true'||value==='false')value=value==='true';data[key.trim()]=value}return {data,body:match[2]}};
const inline=(value)=>escape(value).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\[([^\]]+)]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>');
const markdown=(source)=>{const lines=source.trim().split(/\r?\n/);const blocks=[];let paragraph=[];let list=[];const flush=()=>{if(paragraph.length){blocks.push(`<p>${inline(paragraph.join(' '))}</p>`);paragraph=[]}if(list.length){blocks.push(`<ul>${list.map((item)=>`<li>${inline(item)}</li>`).join('')}</ul>`);list=[]}};for(const line of lines){if(/^###\s+/.test(line)){flush();blocks.push(`<h3>${inline(line.replace(/^###\s+/,''))}</h3>`)}else if(/^##\s+/.test(line)){flush();blocks.push(`<h2>${inline(line.replace(/^##\s+/,''))}</h2>`)}else if(/^[-*]\s+/.test(line)){if(paragraph.length)flush();list.push(line.replace(/^[-*]\s+/,''))}else if(!line.trim()){flush()}else{paragraph.push(line.trim())}}flush();return blocks.join('\n')};
const articlePage=({title,dateLabel,body})=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} — Ze-Xun Lai</title><link rel="stylesheet" href="../assets/site.css"></head><body><header class="site-header"><a class="wordmark" href="../">Ze-Xun Lai</a><nav aria-label="Primary navigation"><a href="../archive/">Archive</a></nav></header><main class="article-main"><p class="eyebrow">${escape(dateLabel||'Publication')}</p><h1>${escape(title)}</h1><article class="article-body">${body}</article><p><a class="text-link" href="../archive/">← Back to archive</a></p></main><footer class="site-footer"><span>Ze-Xun Lai</span></footer></body></html>`;

async function files(directory){const found=[];let entries=[];try{entries=await readdir(directory,{withFileTypes:true})}catch{return found}for(const entry of entries){if(entry.name.startsWith('.'))continue;const full=path.join(directory,entry.name);if(entry.isDirectory())found.push(...await files(full));else found.push(full)}return found}

await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
await cp(path.join(root,'static'),output,{recursive:true});await cp(path.join(root,'assets'),path.join(output,'assets'),{recursive:true});await cp(sourceArticles,path.join(output,'articles'),{recursive:true});
const grouped=new Map();
for(const file of await files(sourceArticles)){const relative=path.relative(sourceArticles,file);const extension=path.extname(relative).toLowerCase();if(!['.html','.pdf'].includes(extension))continue;const stem=relative.slice(0,-extension.length);const dateMatch=path.basename(stem).match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);const item=grouped.get(stem)??{date:dateMatch?.[1]??'',title:titleCase(dateMatch?.[2]??path.basename(stem)),html:null,pdf:null};item[extension.slice(1)]=url(path.join('articles',relative));grouped.set(stem,item)}
const publications=[...grouped.values()];
for(const file of await files(legacyArticles)){if(path.extname(file)!=='.md')continue;const {data,body}=parseFrontMatter(await readFile(file,'utf8'));if(data.draft===true)continue;const slug=path.basename(file,'.md');const filename=`legacy-${slug}.html`;const date=String(data.publicationDate??'').slice(0,10);const title=String(data.title??titleCase(slug));await writeFile(path.join(output,'articles',filename),articlePage({title,dateLabel:labelDate(date),body:markdown(body)}));publications.push({date,title,html:url(path.join('articles',filename)),pdf:null})}
publications.sort((left,right)=>right.date.localeCompare(left.date)||left.title.localeCompare(right.title));
const index=publications.map((item)=>({...item,dateLabel:labelDate(item.date)}));await mkdir(path.join(output,'data'),{recursive:true});await writeFile(path.join(output,'data','articles.json'),`${JSON.stringify(index,null,2)}\n`);console.log(`Built static site with ${index.length} publication(s).`);
