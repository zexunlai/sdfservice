import { generateHTML, generateJSON } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import { checkResourceUrl } from './resource-health';

const extensions = [StarterKit.configure({link:false}), Image, Link, Table, TableRow, TableHeader, TableCell, Superscript, Subscript];
export function parseEditor(value: FormDataEntryValue | null) { try { const parsed=JSON.parse(String(value??'')); return parsed?.type==='doc'?parsed:{type:'doc',content:[]}; } catch { return {type:'doc',content:[]}; } }
export function renderEditor(doc: Record<string,unknown>) { return generateHTML(doc as any, extensions); }
export function documentFromHtml(html:string) { return generateJSON(html,extensions); }
export function commaList(value: FormDataEntryValue | null) { return String(value??'').split(',').map(x=>x.trim()).filter(Boolean); }
export function nullable(value: FormDataEntryValue | null) { const text=String(value??'').trim();return text||null; }
export function checked(form:FormData,name:string){return form.get(name)==='on';}
export function assertSameOrigin(request:Request){const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new Error('Invalid request origin');}

export const checkOfficialUrl = checkResourceUrl;
