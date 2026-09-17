import './disclosure-admin.css';
import { cmsClient, cmsConfigured } from '../cms/client.js';

const app = document.querySelector('#admin-app');
const embedded = new URLSearchParams(location.search).has('embedded');
const state = { user: null, records: [], busyKey: '' };

function escapeHtml(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function toast(message, tone = 'success') {
  const stack = document.querySelector('#toast-stack');
  if (!stack) return;
  const item = document.createElement('div');
  item.className = 'admin-toast admin-toast--' + tone;
  item.textContent = message;
  stack.appendChild(item);
  window.setTimeout(function () { item.remove(); }, 4500);
}

function renderLogin(message = '') {
  app.innerHTML = '<main class="login-screen"><section class="login-panel"><form id="login-form" class="login-card"><p class="eyebrow">WHITE ACADEMY</p><h2>Sign in to Mandatory PDFs</h2><p>Use the school administrator account.</p>' +
    (message ? '<div class="form-alert">' + escapeHtml(message) + '</div>' : '') +
    '<label>Email address<input name="email" type="email" autocomplete="username" required value="whiteschoolacademyweb@gmail.com"></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button class="primary-action" type="submit">Sign in</button></form></section></main>';
  document.querySelector('#login-form').addEventListener('submit', handleLogin);
}

async function handleLogin(event) {
  event.preventDefault();
  const values = new FormData(event.currentTarget);
  const button = event.currentTarget.querySelector('button');
  button.disabled = true;
  button.textContent = 'Signing in…';
  const { data, error } = await cmsClient.auth.signInWithPassword({
    email: values.get('email'),
    password: values.get('password'),
  });
  if (error) return renderLogin(error.message);
  if (!(await verifyAdmin(data.user))) {
    await cmsClient.auth.signOut();
    renderLogin('This account is not authorized.');
  }
}

async function verifyAdmin(user) {
  if (!user) return false;
  const { data, error } = await cmsClient.from('cms_admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (error || !data) return false;
  state.user = user;
  renderShell();
  await loadDocuments();
  return true;
}

function renderShell() {
  app.innerHTML = '<div class="admin-shell ' + (embedded ? 'admin-shell--embedded' : '') + '">' +
    (embedded ? '' : '<aside class="admin-sidebar"><div class="sidebar-brand"><span>WA</span><div><strong>White Academy</strong><small>Mandatory PDFs</small></div></div></aside>') +
    '<main class="admin-main"><header class="admin-topbar"><div><p>Official records</p><h1>Mandatory PDFs</h1></div><div class="topbar-actions"><a class="secondary-action" href="/mandatory-disclosure.html" target="_blank">View live page ↗</a></div></header>' +
    '<section class="disclosure-admin-summary"><div><strong id="pdf-count">—</strong><span>of 13 PDFs uploaded</span></div><p>Choose a disclosure, upload its PDF, and it becomes available on the live website immediately.</p></section>' +
    '<section id="disclosure-content" class="disclosure-admin-content"><div class="editor-loading"><span></span><p>Loading disclosures…</p></div></section></main>' +
    '<div id="toast-stack" class="toast-stack" aria-live="polite"></div></div>';
}

async function loadDocuments() {
  const container = document.querySelector('#disclosure-content');
  const { data, error } = await cmsClient.from('disclosure_documents').select('*').order('sort_order', { ascending: true });
  if (error) {
    container.innerHTML = '<div class="empty-state"><strong>Unable to load mandatory disclosures</strong><p>' + escapeHtml(error.message) + '</p></div>';
    return;
  }
  state.records = data || [];
  document.querySelector('#pdf-count').textContent = state.records.filter(function (item) { return item.pdf_url; }).length;
  renderDocuments();
}

function renderDocuments() {
  const container = document.querySelector('#disclosure-content');
  container.innerHTML = '<div class="disclosure-admin-list">' + state.records.map(function (item, index) {
    const uploaded = Boolean(item.pdf_url);
    const busy = state.busyKey === item.document_key;
    return '<article class="disclosure-admin-row' + (uploaded ? ' is-uploaded' : '') + '">' +
      '<div class="disclosure-admin-number">' + String(index + 1).padStart(2, '0') + '</div>' +
      '<div class="disclosure-admin-copy"><h2>' + escapeHtml(item.title) + '</h2><p>' + escapeHtml(item.description) + '</p></div>' +
      '<div class="disclosure-admin-status"><span class="pdf-status pdf-status--' + (uploaded ? 'ready' : 'empty') + '">' + (busy ? 'Working…' : uploaded ? 'PDF uploaded' : 'No PDF') + '</span></div>' +
      '<div class="disclosure-admin-actions">' +
        (uploaded ? '<a class="secondary-action disclosure-open" href="' + escapeHtml(item.pdf_url) + '" target="_blank" rel="noopener">Open PDF</a>' : '') +
        '<label class="primary-action disclosure-upload' + (busy ? ' is-disabled' : '') + '">' + (uploaded ? 'Replace PDF' : 'Upload PDF') +
          '<input type="file" accept="application/pdf,.pdf" data-upload-pdf="' + escapeHtml(item.document_key) + '"' + (busy ? ' disabled' : '') + '>' +
        '</label>' +
        (uploaded ? '<button class="danger-link disclosure-remove" data-remove-pdf="' + escapeHtml(item.document_key) + '"' + (busy ? ' disabled' : '') + '>Remove</button>' : '') +
      '</div></article>';
  }).join('') + '</div>';

  container.querySelectorAll('[data-upload-pdf]').forEach(function (input) {
    input.addEventListener('change', function () {
      if (input.files[0]) uploadPdf(input.dataset.uploadPdf, input.files[0]);
    });
  });
  container.querySelectorAll('[data-remove-pdf]').forEach(function (button) {
    button.addEventListener('click', function () { removePdf(button.dataset.removePdf); });
  });
}

function validPdf(file) {
  return file && file.size > 0 && file.size <= 20 * 1024 * 1024 &&
    (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
}

async function uploadPdf(key, file) {
  const item = state.records.find(function (record) { return record.document_key === key; });
  if (!item) return;
  if (!validPdf(file)) {
    toast('Choose a PDF file smaller than 20 MB.', 'error');
    return;
  }

  state.busyKey = key;
  renderDocuments();
  const path = 'disclosures/' + key + '/' + crypto.randomUUID() + '.pdf';

  try {
    const upload = await cmsClient.storage.from('cms-media').upload(path, file, {
      cacheControl: '3600',
      contentType: 'application/pdf',
      upsert: false,
    });
    if (upload.error) throw upload.error;

    const publicUrl = cmsClient.storage.from('cms-media').getPublicUrl(path).data.publicUrl;
    const response = await cmsClient.from('disclosure_documents').update({
      pdf_url: publicUrl,
      pdf_storage_path: path,
      updated_by: state.user.id,
    }).eq('id', item.id);
    if (response.error) {
      await cmsClient.storage.from('cms-media').remove([path]);
      throw response.error;
    }

    if (item.pdf_storage_path) {
      await cmsClient.storage.from('cms-media').remove([item.pdf_storage_path]);
    }

    toast(item.pdf_url ? 'PDF replaced and updated on the live website.' : 'PDF uploaded and published on the live website.');
    await loadDocuments();
  } catch (error) {
    state.busyKey = '';
    renderDocuments();
    toast('PDF upload failed: ' + error.message, 'error');
  }
}

async function removePdf(key) {
  const item = state.records.find(function (record) { return record.document_key === key; });
  if (!item || !window.confirm('Remove the PDF for “' + item.title + '” from the live website?')) return;

  state.busyKey = key;
  renderDocuments();
  const response = await cmsClient.from('disclosure_documents').update({
    pdf_url: '',
    pdf_storage_path: '',
    updated_by: state.user.id,
  }).eq('id', item.id);

  if (response.error) {
    state.busyKey = '';
    renderDocuments();
    return toast(response.error.message, 'error');
  }

  if (item.pdf_storage_path) {
    const removal = await cmsClient.storage.from('cms-media').remove([item.pdf_storage_path]);
    if (removal.error) toast('The public link was removed, but storage cleanup failed.', 'error');
  }

  toast('PDF removed from the live website.');
  await loadDocuments();
}

async function boot() {
  if (!cmsConfigured || !cmsClient) return renderLogin('Supabase is not configured.');
  const { data } = await cmsClient.auth.getSession();
  if (data.session?.user) {
    if (!(await verifyAdmin(data.session.user))) renderLogin('This account is not authorized.');
  } else {
    renderLogin();
  }
}

boot();
