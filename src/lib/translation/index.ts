import { envValue } from '../supabase';
import { GoogleCloudTranslationProvider } from './google';
export function getTranslationProvider(locals:App.Locals){
  const projectId=envValue(locals,'GOOGLE_CLOUD_PROJECT_ID'),clientEmail=envValue(locals,'GOOGLE_TRANSLATE_SERVICE_ACCOUNT_EMAIL'),privateKey=envValue(locals,'GOOGLE_TRANSLATE_PRIVATE_KEY');
  if(!projectId||!clientEmail||!privateKey)return null;
  return new GoogleCloudTranslationProvider({projectId,clientEmail,privateKey,location:envValue(locals,'GOOGLE_CLOUD_LOCATION')||'global',glossaryId:envValue(locals,'GOOGLE_TRANSLATE_GLOSSARY_ID')||undefined});
}
