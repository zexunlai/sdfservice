import { officialResourceCatalog } from './official-resource-catalog';
import { checkResourceUrl } from '../src/lib/resource-health';

const entries=officialResourceCatalog.flatMap((hub)=>hub.resources.map((resource)=>({hub:hub.slug,title:resource.title,url:resource.url})));
const results:Array<{hub:string;title:string;url:string;status:number|null;health:string;finalUrl:string|null}>=[];
let cursor=0;
async function worker(){while(cursor<entries.length){const item=entries[cursor++];const check=await checkResourceUrl(item.url,{timeoutMs:12000});results.push({...item,status:check.http_status,health:check.result,finalUrl:check.final_url});}}
await Promise.all(Array.from({length:10},()=>worker()));
const counts=Object.groupBy(results,(item)=>item.health);
console.log(`Checked ${results.length} official URLs.`);
for(const [health,items] of Object.entries(counts))console.log(`${health}: ${items?.length??0}`);
for(const item of results.filter((item)=>!['healthy','redirected','blocked'].includes(item.health)))console.log(`${item.health}\t${item.status??''}\t${item.url}\t${item.title}`);
if(results.some((item)=>item.health==='broken'))process.exitCode=1;
