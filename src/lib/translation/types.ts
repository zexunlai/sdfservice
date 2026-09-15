export type SupportedLocale='en'|'zh-TW';
export interface TranslationRequest { contents:string[]; sourceLocale:SupportedLocale; targetLocale:SupportedLocale; mimeType?:'text/plain'|'text/html'; useGlossary?:boolean; }
export interface TranslationResult { translations:string[]; provider:string; model:string; providerJobId?:string; attributionRequired:boolean; raw:unknown; }
export interface TranslationProvider { readonly name:string; translate(request:TranslationRequest):Promise<TranslationResult>; }
