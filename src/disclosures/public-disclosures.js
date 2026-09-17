import './disclosures.css';
import { cmsClient, cmsConfigured } from '../cms/client.js';

const root = document.querySelector('[data-disclosure-root]');

function escapeHtml(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function render(documents) {
  if (!root) return;
  root.innerHTML = documents.map(function (item, index) {
    const link = item.pdf_url
      ? '<a href="' + escapeHtml(item.pdf_url) + '" target="_blank" rel="noopener">View PDF →</a>'
      : '<span class="document-link-unavailable" aria-label="PDF not uploaded">PDF coming soon</span>';
    return '<article><i>' + String(index + 1).padStart(2, '0') + '</i><h3>' + escapeHtml(item.title) + '</h3><p>' + escapeHtml(item.description) + '</p>' + link + '</article>';
  }).join('');
}

async function loadDisclosures() {
  if (!root || !cmsConfigured || !cmsClient) {
    if (root) root.innerHTML = '<div class="disclosure-load-error"><p>Disclosure documents are temporarily unavailable.</p></div>';
    return;
  }

  const { data, error } = await cmsClient
    .from('disclosure_documents')
    .select('document_key,title,description,pdf_url,sort_order')
    .order('sort_order', { ascending: true });

  if (error) {
    root.innerHTML = '<div class="disclosure-load-error"><p>Disclosure documents could not be loaded. Please try again shortly.</p></div>';
    return;
  }

  render(data || []);
}

loadDisclosures();

if (cmsConfigured && cmsClient) {
  cmsClient.channel('public-disclosure-documents')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'disclosure_documents' }, loadDisclosures)
    .subscribe();
}
