import { cmsClient, cmsConfigured } from './client.js';
import {
  applyCmsRecord,
  collectCmsFields,
  normalizePagePath,
  resetCmsField,
} from './content-model.js';

function indexFields(fields) {
  return new Map(fields.map((field) => [field.key, field]));
}

export async function initCmsRuntime() {
  if (!cmsConfigured || !cmsClient || document.body?.dataset.cmsAdmin === 'true') return;

  const pagePath = normalizePagePath();
  const fields = indexFields(collectCmsFields(document, pagePath));

  try {
    const { data, error } = await cmsClient
      .from('cms_content')
      .select('page_path, content_key, content_type, value, metadata')
      .eq('page_path', pagePath);

    if (error) throw error;

    data?.forEach((record) => applyCmsRecord(fields.get(record.content_key), record));

    cmsClient
      .channel(`cms-content-${pagePath}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cms_content',
          filter: `page_path=eq.${pagePath}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            resetCmsField(fields.get(payload.old.content_key));
            return;
          }

          applyCmsRecord(fields.get(payload.new.content_key), payload.new);
        },
      )
      .subscribe();
  } catch (error) {
    console.warn('White Academy CMS could not load content overrides.', error);
  }
}
