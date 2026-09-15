import type { TranslationProvider,TranslationRequest,TranslationResult } from './types';

const encoder=new TextEncoder();
const b64url=(value:Uint8Array|string)=>{const bytes=typeof value==='string'?encoder.encode(value):value;let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');};
const pemBytes=(pem:string)=>{const binary=atob(pem.replaceAll('\\n','\n').replace(/-----[^-]+-----|\s/g,''));return Uint8Array.from(binary,char=>char.charCodeAt(0));};

export class GoogleCloudTranslationProvider implements TranslationProvider{
  readonly name='google_cloud_translation';
  constructor(private config:{projectId:string;location:string;clientEmail:string;privateKey:string;glossaryId?:string}){}
  async accessToken(){
    const now=Math.floor(Date.now()/1000);const header=b64url(JSON.stringify({alg:'RS256',typ:'JWT'}));const payload=b64url(JSON.stringify({iss:this.config.clientEmail,scope:'https://www.googleapis.com/auth/cloud-platform',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3300}));const unsigned=`${header}.${payload}`;
    const key=await crypto.subtle.importKey('pkcs8',pemBytes(this.config.privateKey),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,encoder.encode(unsigned));
    const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:`${unsigned}.${b64url(new Uint8Array(signature))}`})});if(!response.ok)throw new Error(`Google authentication failed (${response.status})`);const data=await response.json() as {access_token:string};return data.access_token;
  }
  async translate(request:TranslationRequest):Promise<TranslationResult>{
    const token=await this.accessToken();const parent=`projects/${this.config.projectId}/locations/${this.config.location}`;const glossary=request.useGlossary&&this.config.glossaryId?{glossary:`${parent}/glossaries/${this.config.glossaryId}`}:undefined;
    const response=await fetch(`https://translation.googleapis.com/v3/${parent}:translateText`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({contents:request.contents,sourceLanguageCode:request.sourceLocale==='zh-TW'?'zh-TW':'en',targetLanguageCode:request.targetLocale==='zh-TW'?'zh-TW':'en',mimeType:request.mimeType??'text/html',model:`${parent}/models/general/nmt`,glossaryConfig:glossary})});
    const raw=await response.json() as any;if(!response.ok)throw new Error(raw?.error?.message??`Google translation failed (${response.status})`);const rows=raw.glossaryTranslations??raw.translations??[];return{translations:rows.map((row:any)=>row.translatedText),provider:this.name,model:'general/nmt',providerJobId:response.headers.get('x-request-id')??undefined,attributionRequired:true,raw};
  }
}
