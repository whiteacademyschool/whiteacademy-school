import './admin.css';
import { cmsClient, cmsConfigured } from '../cms/client.js';

const app = document.querySelector('#admin-app');
const state = { user: null, section: location.hash === '#news' ? 'news' : 'events', records: [], editing: null, photos: [] };

function escapeHtml(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function formatDate(value) {
  if (!value) return 'Date not set';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'update';
}

function toast(message, tone = 'success') {
  const stack = document.querySelector('#toast-stack');
  if (!stack) return;
  const item = document.createElement('div');
  item.className = `admin-toast admin-toast--${tone}`;
  item.textContent = message;
  stack.appendChild(item);
  window.setTimeout(() => item.remove(), 5000);
}

function renderSetup() {
  app.innerHTML = `<main class="setup-screen"><section class="setup-card"><div class="brand-lockup"><span>WA</span><div><strong>White Academy</strong><small>Media Centre</small></div></div><div class="setup-icon">⚙</div><p class="eyebrow">CONFIGURATION REQUIRED</p><h1>Connect Supabase first</h1><p>Add the Supabase environment variables and redeploy before using the Media Centre.</p><a class="primary-action" href="/admin.html">Open content admin</a></section></main>`;
}

function renderLogin(message = '') {
  app.innerHTML = `<main class="login-screen"><section class="login-visual"><div class="login-visual__content"><div class="brand-lockup brand-lockup--light"><span>WA</span><div><strong>White Academy</strong><small>Media Centre</small></div></div><div><p class="eyebrow">EVENTS & NEWS</p><h1>School stories.<br />Beautifully managed.</h1><p>Create event albums, upload campus photos in bulk and publish news from one secure place.</p></div><small>Authorized administrator access only</small></div></section><section class="login-panel"><form id="login-form" class="login-card"><p class="eyebrow">WELCOME BACK</p><h2>Sign in to Media Centre</h2><p>Your existing school administrator account works here.</p>${message ? `<div class="form-alert">${escapeHtml(message)}</div>` : ''}<label>Email address<input name="email" type="email" autocomplete="username" required /></label><label>Password<input name="password" type="password" autocomplete="current-password" required /></label><button class="primary-action" type="submit">Sign in securely</button><a class="back-link" href="/">← Back to website</a></form></section></main>`;
  document.querySelector('#login-form').addEventListener('submit', handleLogin);
}

async function handleLogin(event) {
  event.preventDefault();
  const values = new FormData(event.currentTarget);
  const button = event.currentTarget.querySelector('button');
  button.disabled = true;
  button.textContent = 'Signing in…';
  const { data, error } = await cmsClient.auth.signInWithPassword({ email: values.get('email'), password: values.get('password') });
  if (error) return renderLogin(error.message);
  if (!(await verifyAdmin(data.user))) {
    await cmsClient.auth.signOut();
    renderLogin('This account is not authorized to manage the website.');
  }
}

async function verifyAdmin(user) {
  if (!user) return false;
  const { data, error } = await cmsClient.from('cms_admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (error || !data) return false;
  state.user = user;
  renderShell();
  await loadRecords();
  return true;
}

function renderShell() {
  app.innerHTML = `<div class="admin-shell"><aside class="admin-sidebar"><div class="sidebar-brand"><span>WA</span><div><strong>White Academy</strong><small>Admin panel</small></div></div><div class="sidebar-scroll"><div class="nav-group"><p>Administration</p><a class="page-link media-nav-link" href="/admin.html"><span>W</span>Website Content</a><button class="page-link" data-media-section="events"><span>E</span>Event Albums</button><button class="page-link" data-media-section="news"><span>N</span>News & Updates</button></div><div class="nav-group"><p>Public pages</p><a class="page-link media-nav-link" href="/gallery.html" target="_blank"><span>↗</span>View Gallery</a><a class="page-link media-nav-link" href="/news.html" target="_blank"><span>↗</span>View News</a></div></div><div class="sidebar-user"><div>${escapeHtml(state.user.email?.slice(0, 1).toUpperCase() || 'A')}</div><p><strong>Administrator</strong><small>${escapeHtml(state.user.email || '')}</small></p><button id="sign-out" title="Sign out">↗</button></div></aside><main class="admin-main"><header class="admin-topbar"><button id="sidebar-toggle" class="sidebar-toggle" aria-label="Toggle navigation">☰</button><div><p>Media Centre</p><h1 id="media-title">${state.section === 'events' ? 'Event Albums' : 'News & Updates'}</h1></div><div class="topbar-actions"><button id="new-record" class="primary-action">+ ${state.section === 'events' ? 'New album' : 'New post'}</button></div></header><section class="media-summary"><div><strong id="record-count">—</strong><span>${state.section === 'events' ? 'albums' : 'posts'}</span></div><p id="media-help">${state.section === 'events' ? 'Create an event once, then upload all its photos together.' : 'Publish a text update or add a cover and supporting photos.'}</p></section><section id="media-content" class="media-content"><div class="editor-loading"><span></span><p>Loading…</p></div></section></main><div id="toast-stack" class="toast-stack" aria-live="polite"></div></div>`;
  bindShell();
  updateSectionNavigation();
}

function bindShell() {
  document.querySelectorAll('[data-media-section]').forEach((button) => button.addEventListener('click', async () => {
    state.section = button.dataset.mediaSection;
    state.editing = null;
    state.photos = [];
    history.replaceState(null, '', `#${state.section}`);
    updateSectionNavigation();
    await loadRecords();
    document.querySelector('.admin-shell').classList.remove('sidebar-open');
  }));
  document.querySelector('#new-record').addEventListener('click', () => openEditor());
  document.querySelector('#sidebar-toggle').addEventListener('click', () => document.querySelector('.admin-shell').classList.toggle('sidebar-open'));
  document.querySelector('#sign-out').addEventListener('click', () => cmsClient.auth.signOut());
}

function updateSectionNavigation() {
  document.querySelectorAll('[data-media-section]').forEach((item) => item.classList.toggle('is-active', item.dataset.mediaSection === state.section));
  const isEvents = state.section === 'events';
  document.querySelector('#media-title').textContent = isEvents ? 'Event Albums' : 'News & Updates';
  document.querySelector('#new-record').textContent = isEvents ? '+ New album' : '+ New post';
  document.querySelector('#media-help').textContent = isEvents ? 'Create an event once, then upload all its photos together.' : 'Publish a text update or add a cover and supporting photos.';
}

async function loadRecords() {
  const container = document.querySelector('#media-content');
  container.innerHTML = '<div class="editor-loading"><span></span><p>Loading Media Centre…</p></div>';
  const table = state.section === 'events' ? 'event_albums' : 'news_posts';
  const orderColumn = state.section === 'events' ? 'event_date' : 'published_at';
  const { data, error } = await cmsClient.from(table).select('*').order(orderColumn, { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
  if (error) {
    container.innerHTML = `<div class="empty-state"><strong>Media Centre database is not ready</strong><p>Run <code>supabase/media-centre.sql</code> in Supabase, then reload this page.</p></div>`;
    return;
  }
  state.records = data || [];
  document.querySelector('#record-count').textContent = state.records.length;
  renderList();
}

function renderList() {
  const container = document.querySelector('#media-content');
  if (!state.records.length) {
    container.innerHTML = `<div class="empty-state media-empty"><strong>${state.section === 'events' ? 'Create the first event album' : 'Publish the first school update'}</strong><p>${state.section === 'events' ? 'Albums can contain one photo or hundreds.' : 'Posts can be text-only or include multiple photos.'}</p><button class="primary-action" data-empty-new>Create now</button></div>`;
    container.querySelector('[data-empty-new]').addEventListener('click', () => openEditor());
    return;
  }
  container.innerHTML = `<div class="media-card-grid">${state.records.map((record) => `<article class="media-admin-card"><div class="media-admin-card__image">${record.cover_image_url ? `<img src="${escapeHtml(record.cover_image_url)}" alt="" loading="lazy">` : '<span>WA</span>'}<small class="status-pill status-pill--${record.status}">${escapeHtml(record.status)}</small></div><div class="media-admin-card__body"><p>${formatDate(state.section === 'events' ? record.event_date : record.published_at || record.created_at)}</p><h2>${escapeHtml(record.title)}</h2><span>${escapeHtml(state.section === 'events' ? record.description : record.excerpt || record.content)}</span></div><footer><button data-edit-record="${record.id}">Edit</button><button class="danger-link" data-delete-record="${record.id}">Delete</button></footer></article>`).join('')}</div>`;
  container.querySelectorAll('[data-edit-record]').forEach((button) => button.addEventListener('click', () => openEditor(button.dataset.editRecord)));
  container.querySelectorAll('[data-delete-record]').forEach((button) => button.addEventListener('click', () => deleteRecord(button.dataset.deleteRecord)));
}

async function openEditor(id = '') {
  state.editing = id ? state.records.find((record) => record.id === id) : null;
  state.photos = [];
  if (id) {
    const table = state.section === 'events' ? 'event_photos' : 'news_photos';
    const foreignKey = state.section === 'events' ? 'album_id' : 'news_id';
    const { data } = await cmsClient.from(table).select('*').eq(foreignKey, id).order('sort_order').order('created_at');
    state.photos = data || [];
  }
  renderEditor();
}

function renderEditor() {
  const isEvents = state.section === 'events';
  const record = state.editing || {};
  const dateValue = isEvents ? record.event_date || '' : (record.published_at || '').slice(0, 10);
  document.querySelector('#media-content').innerHTML = `<div class="media-editor"><div class="media-editor__heading"><div><p class="eyebrow">${record.id ? 'EDIT' : 'CREATE'}</p><h2>${isEvents ? (record.id ? 'Edit event album' : 'New event album') : (record.id ? 'Edit news post' : 'New news post')}</h2></div><button class="secondary-action" id="close-editor">← Back to list</button></div><form id="media-form" class="media-form"><div class="media-form__main"><label>Title<input name="title" value="${escapeHtml(record.title || '')}" required placeholder="${isEvents ? 'Annual Sports Day 2026' : 'Admissions open for 2027'}"></label><div class="media-form__row"><label>${isEvents ? 'Event date' : 'Publish date'}<input name="date" type="date" value="${escapeHtml(dateValue)}"></label><label>Status<select name="status"><option value="draft" ${record.status !== 'published' ? 'selected' : ''}>Draft</option><option value="published" ${record.status === 'published' ? 'selected' : ''}>Published</option></select></label></div>${isEvents ? `<label>Description<textarea name="description" rows="4" placeholder="A short introduction to this event">${escapeHtml(record.description || '')}</textarea></label>` : `<label>Short summary<textarea name="excerpt" rows="3" placeholder="Shown on the news listing page">${escapeHtml(record.excerpt || '')}</textarea></label><label>Full update<textarea name="content" rows="12" required placeholder="Write the complete news or announcement here…">${escapeHtml(record.content || '')}</textarea></label>`}</div><aside class="media-form__aside"><div class="upload-panel"><p>Cover photo</p>${record.cover_image_url ? `<img src="${escapeHtml(record.cover_image_url)}" alt="Current cover">` : '<div class="upload-placeholder">No cover selected</div>'}<label class="upload-action">Choose cover<input name="cover" type="file" accept="image/jpeg,image/png,image/webp"></label><small>Automatically resized and compressed.</small></div><div class="upload-panel"><p>${isEvents ? 'Album photos' : 'Additional photos'}</p><label class="upload-drop">+ Select multiple photos<input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple></label><small>You can select many photos together. Uploads continue in small batches.</small></div></aside><div class="media-form__actions"><span id="upload-progress"></span><button type="button" class="secondary-action" id="cancel-editor">Cancel</button><button type="submit" class="primary-action" id="save-media">${record.id ? 'Save and publish changes' : 'Create and upload'}</button></div></form>${record.id ? `<section class="existing-media"><div><h3>Uploaded photos</h3><span>${state.photos.length} photo${state.photos.length === 1 ? '' : 's'}</span></div>${state.photos.length ? `<div class="existing-media-grid">${state.photos.map((photo) => `<figure><img src="${escapeHtml(photo.image_url)}" alt="" loading="lazy"><button data-delete-photo="${photo.id}" title="Delete photo">×</button></figure>`).join('')}</div>` : '<p>No additional photos uploaded yet.</p>'}</section>` : ''}</div>`;
  document.querySelector('#close-editor').addEventListener('click', renderList);
  document.querySelector('#cancel-editor').addEventListener('click', renderList);
  document.querySelector('#media-form').addEventListener('submit', saveRecord);
  document.querySelectorAll('[data-delete-photo]').forEach((button) => button.addEventListener('click', () => deletePhoto(button.dataset.deletePhoto)));
}

async function compressImage(file) {
  if (file.size > 15 * 1024 * 1024) throw new Error(`${file.name} is larger than 15 MB.`);
  const bitmap = await createImageBitmap(file);
  const maxSide = 2000;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.84));
  if (!blob) throw new Error(`Could not prepare ${file.name}.`);
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, { type: 'image/webp' });
}

async function uploadFile(file, folder) {
  const optimized = await compressImage(file);
  const safeName = optimized.name.toLowerCase().replace(/[^a-z0-9.-]+/g, '-');
  const path = `${folder}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await cmsClient.storage.from('cms-media').upload(path, optimized, { cacheControl: '31536000' });
  if (error) throw error;
  return { storage_path: path, image_url: cmsClient.storage.from('cms-media').getPublicUrl(path).data.publicUrl };
}

async function uploadMany(files, folder, onProgress) {
  const queue = [...files];
  const uploaded = [];
  let completed = 0;
  async function worker() {
    while (queue.length) {
      const file = queue.shift();
      uploaded.push(await uploadFile(file, folder));
      completed += 1;
      onProgress(completed, files.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, files.length) }, worker));
  return uploaded;
}

async function saveRecord(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const values = new FormData(form);
  const button = document.querySelector('#save-media');
  const progress = document.querySelector('#upload-progress');
  const isEvents = state.section === 'events';
  const table = isEvents ? 'event_albums' : 'news_posts';
  button.disabled = true;
  button.textContent = 'Saving…';
  const title = values.get('title').trim();
  const payload = isEvents ? { title, description: values.get('description').trim(), event_date: values.get('date') || null, status: values.get('status'), updated_by: state.user.id } : { title, excerpt: values.get('excerpt').trim(), content: values.get('content').trim(), published_at: values.get('date') ? `${values.get('date')}T00:00:00+05:30` : null, status: values.get('status'), updated_by: state.user.id };
  if (!state.editing) payload.slug = `${slugify(title)}-${Date.now().toString(36)}`;
  let saved;
  const query = state.editing ? cmsClient.from(table).update(payload).eq('id', state.editing.id) : cmsClient.from(table).insert(payload);
  const { data, error } = await query.select().single();
  if (error) { toast(error.message, 'error'); button.disabled = false; button.textContent = 'Try again'; return; }
  saved = data;
  if (!state.editing) state.editing = saved;
  try {
    const cover = values.get('cover');
    if (cover?.size) {
      progress.textContent = 'Uploading cover photo…';
      const uploadedCover = await uploadFile(cover, `${isEvents ? 'events' : 'news'}/${saved.id}/cover`);
      if (saved.cover_storage_path) await cmsClient.storage.from('cms-media').remove([saved.cover_storage_path]);
      const { data: updated, error: coverError } = await cmsClient.from(table).update({ cover_image_url: uploadedCover.image_url, cover_storage_path: uploadedCover.storage_path }).eq('id', saved.id).select().single();
      if (coverError) throw coverError;
      saved = updated;
    }
    const files = [...form.querySelector('[name="photos"]').files];
    if (files.length) {
      const uploaded = await uploadMany(files, `${isEvents ? 'events' : 'news'}/${saved.id}/photos`, (done, total) => { progress.textContent = `Uploading photo ${done} of ${total}…`; });
      const photoTable = isEvents ? 'event_photos' : 'news_photos';
      const foreignKey = isEvents ? 'album_id' : 'news_id';
      const rows = uploaded.map((item, index) => ({ ...item, [foreignKey]: saved.id, sort_order: state.photos.length + index }));
      const { error: photoError } = await cmsClient.from(photoTable).insert(rows);
      if (photoError) throw photoError;
    }
    toast(isEvents ? 'Event album is saved.' : 'News update is saved.');
    await loadRecords();
  } catch (uploadError) {
    toast(`The item was saved, but a photo failed: ${uploadError.message}`, 'error');
    button.disabled = false;
    button.textContent = 'Save again';
  }
}

async function deletePhoto(id) {
  const photo = state.photos.find((item) => item.id === id);
  if (!photo || !window.confirm('Delete this photo permanently?')) return;
  const table = state.section === 'events' ? 'event_photos' : 'news_photos';
  const { error } = await cmsClient.from(table).delete().eq('id', id);
  if (error) return toast(error.message, 'error');
  await cmsClient.storage.from('cms-media').remove([photo.storage_path]);
  state.photos = state.photos.filter((item) => item.id !== id);
  renderEditor();
  toast('Photo deleted.');
}

async function deleteRecord(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record || !window.confirm(`Delete “${record.title}” and all its uploaded photos? This cannot be undone.`)) return;
  const photoTable = state.section === 'events' ? 'event_photos' : 'news_photos';
  const foreignKey = state.section === 'events' ? 'album_id' : 'news_id';
  const table = state.section === 'events' ? 'event_albums' : 'news_posts';
  const { data: photos } = await cmsClient.from(photoTable).select('storage_path').eq(foreignKey, id);
  const paths = [...(photos || []).map((item) => item.storage_path), record.cover_storage_path].filter(Boolean);
  const { error } = await cmsClient.from(table).delete().eq('id', id);
  if (error) return toast(error.message, 'error');
  if (paths.length) await cmsClient.storage.from('cms-media').remove(paths);
  toast('Item deleted.');
  await loadRecords();
}

async function boot() {
  if (!cmsConfigured || !cmsClient) return renderSetup();
  const { data } = await cmsClient.auth.getSession();
  if (data.session?.user) {
    if (!(await verifyAdmin(data.session.user))) renderLogin('This account is not authorized to manage the website.');
  } else renderLogin();
  cmsClient.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') { state.user = null; renderLogin(); } });
}

boot();
