import './admin.css';
import { cmsClient, cmsConfigured } from '../cms/client.js';

const app = document.querySelector('#admin-app');
const embedded = new URLSearchParams(location.search).has('embedded');
const state = { user: null, records: [], editing: null };

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
  window.setTimeout(() => item.remove(), 4500);
}

function renderLogin(message = '') {
  app.innerHTML = '<main class="login-screen"><section class="login-panel"><form id="login-form" class="login-card"><p class="eyebrow">WHITE ACADEMY</p><h2>Sign in to Staff Manager</h2><p>Use the school administrator account.</p>' +
    (message ? '<div class="form-alert">' + escapeHtml(message) + '</div>' : '') +
    '<label>Email address<input name="email" type="email" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button class="primary-action" type="submit">Sign in</button></form></section></main>';
  document.querySelector('#login-form').addEventListener('submit', handleLogin);
}

async function handleLogin(event) {
  event.preventDefault();
  const values = new FormData(event.currentTarget);
  const { data, error } = await cmsClient.auth.signInWithPassword({ email: values.get('email'), password: values.get('password') });
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
  await loadRecords();
  return true;
}

function renderShell() {
  app.innerHTML = '<div class="admin-shell ' + (embedded ? 'admin-shell--embedded' : '') + '">' +
    (embedded ? '' : '<aside class="admin-sidebar"><div class="sidebar-brand"><span>WA</span><div><strong>White Academy</strong><small>Staff Manager</small></div></div></aside>') +
    '<main class="admin-main"><header class="admin-topbar"><div><p>People</p><h1>Staff Directory</h1></div><div class="topbar-actions"><a class="secondary-action" href="/our-staff.html" target="_blank">View page ↗</a><button id="new-staff" class="primary-action">+ Add staff member</button></div></header><section class="media-summary"><div><strong id="record-count">—</strong><span>staff members</span></div><p>Add, update, arrange or hide staff profiles. Public profiles update immediately.</p></section><section id="staff-content" class="media-content"><div class="editor-loading"><span></span><p>Loading staff…</p></div></section></main><div id="toast-stack" class="toast-stack" aria-live="polite"></div></div>';
  document.querySelector('#new-staff').addEventListener('click', function () { openEditor(); });
}

async function loadRecords() {
  const container = document.querySelector('#staff-content');
  const { data, error } = await cmsClient.from('staff_members').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true });
  if (error) {
    container.innerHTML = '<div class="empty-state"><strong>Unable to load staff</strong><p>' + escapeHtml(error.message) + '</p></div>';
    return;
  }
  state.records = data || [];
  document.querySelector('#record-count').textContent = state.records.length;
  renderList();
}

function renderList() {
  const container = document.querySelector('#staff-content');
  if (!state.records.length) {
    container.innerHTML = '<div class="empty-state media-empty"><strong>Add the first staff member</strong><p>Create a clean profile with name, role, qualification and photo.</p><button class="primary-action" id="empty-new">Add staff member</button></div>';
    document.querySelector('#empty-new').addEventListener('click', function () { openEditor(); });
    return;
  }

  container.innerHTML = '<div class="media-card-grid">' + state.records.map(function (member) {
    const visual = member.photo_url ? '<img src="' + escapeHtml(member.photo_url) + '" alt="" loading="lazy">' : '<span>' + escapeHtml(member.name.slice(0, 1).toUpperCase()) + '</span>';
    return '<article class="media-admin-card"><div class="media-admin-card__image">' + visual + '<small class="status-pill status-pill--' + escapeHtml(member.status) + '">' + escapeHtml(member.status) + '</small></div><div class="media-admin-card__body"><p>Position ' + escapeHtml(String(member.sort_order || 0)) + '</p><h2>' + escapeHtml(member.name) + '</h2><span>' + escapeHtml(member.designation || member.qualification || 'Staff member') + '</span></div><footer><button data-edit-staff="' + member.id + '">Edit</button><button class="danger-link" data-delete-staff="' + member.id + '">Delete</button></footer></article>';
  }).join('') + '</div>';

  container.querySelectorAll('[data-edit-staff]').forEach(function (button) {
    button.addEventListener('click', function () { openEditor(button.dataset.editStaff); });
  });
  container.querySelectorAll('[data-delete-staff]').forEach(function (button) {
    button.addEventListener('click', function () { deleteMember(button.dataset.deleteStaff); });
  });
}

function openEditor(id = '') {
  state.editing = id ? state.records.find(function (member) { return member.id === id; }) : null;
  const member = state.editing || {};
  const preview = member.photo_url ? '<img src="' + escapeHtml(member.photo_url) + '" alt="Current staff photo">' : '<div class="upload-placeholder">No photo selected</div>';
  document.querySelector('#staff-content').innerHTML = '<div class="media-editor"><div class="media-editor__heading"><div><p class="eyebrow">' + (member.id ? 'EDIT PROFILE' : 'NEW PROFILE') + '</p><h2>' + (member.id ? 'Update staff member' : 'Add staff member') + '</h2></div><button class="secondary-action" id="close-staff">← Back to list</button></div><form id="staff-form" class="media-form"><div class="media-form__main"><label>Full name<input name="name" value="' + escapeHtml(member.name || '') + '" required placeholder="Full name"></label><label>Designation or role<input name="designation" value="' + escapeHtml(member.designation || '') + '" placeholder="Teacher, Principal, Coordinator…"></label><label>Qualification<input name="qualification" value="' + escapeHtml(member.qualification || '') + '" placeholder="M.Sc, B.Ed"></label><div class="media-form__row"><label>Display order<input name="sort_order" type="number" min="0" value="' + escapeHtml(String(member.sort_order ?? state.records.length + 1)) + '"></label><label>Visibility<select name="status"><option value="published"' + (member.status !== 'draft' ? ' selected' : '') + '>Published</option><option value="draft"' + (member.status === 'draft' ? ' selected' : '') + '>Hidden draft</option></select></label></div></div><aside class="media-form__aside"><div class="upload-panel"><p>Staff photo</p>' + preview + '<label class="upload-action">Choose photo<input name="photo" type="file" accept="image/jpeg,image/png,image/webp"></label><small>Portrait photos work best.</small></div></aside><div class="media-form__actions"><span id="staff-progress"></span><button type="button" class="secondary-action" id="cancel-staff">Cancel</button><button type="submit" class="primary-action" id="save-staff">Save staff profile</button></div></form></div>';
  document.querySelector('#close-staff').addEventListener('click', renderList);
  document.querySelector('#cancel-staff').addEventListener('click', renderList);
  document.querySelector('#staff-form').addEventListener('submit', saveMember);
}

async function compressImage(file) {
  if (file.size > 15 * 1024 * 1024) throw new Error('The photo must be smaller than 15 MB.');
  const bitmap = await createImageBitmap(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise(function (resolve) { canvas.toBlob(resolve, 'image/webp', 0.84); });
  if (!blob) throw new Error('Could not prepare the photo.');
  return new File([blob], 'staff-photo.webp', { type: 'image/webp' });
}

async function uploadPhoto(file, id) {
  const optimized = await compressImage(file);
  const path = 'staff/' + id + '/' + crypto.randomUUID() + '.webp';
  const { error } = await cmsClient.storage.from('cms-media').upload(path, optimized, { cacheControl: '31536000' });
  if (error) throw error;
  return { photo_storage_path: path, photo_url: cmsClient.storage.from('cms-media').getPublicUrl(path).data.publicUrl };
}

async function saveMember(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const values = new FormData(form);
  const button = document.querySelector('#save-staff');
  const progress = document.querySelector('#staff-progress');
  button.disabled = true;
  button.textContent = 'Saving…';

  const payload = {
    name: values.get('name').trim(),
    designation: values.get('designation').trim(),
    qualification: values.get('qualification').trim(),
    sort_order: Number(values.get('sort_order')) || 0,
    status: values.get('status'),
    updated_by: state.user.id,
  };

  const query = state.editing
    ? cmsClient.from('staff_members').update(payload).eq('id', state.editing.id)
    : cmsClient.from('staff_members').insert(payload);
  const { data, error } = await query.select().single();
  if (error) {
    toast(error.message, 'error');
    button.disabled = false;
    button.textContent = 'Try again';
    return;
  }

  let saved = data;
  const photo = values.get('photo');
  try {
    if (photo?.size) {
      progress.textContent = 'Uploading photo…';
      const uploaded = await uploadPhoto(photo, saved.id);
      if (saved.photo_storage_path) await cmsClient.storage.from('cms-media').remove([saved.photo_storage_path]);
      const response = await cmsClient.from('staff_members').update(uploaded).eq('id', saved.id).select().single();
      if (response.error) throw response.error;
      saved = response.data;
    }
    toast('Staff profile is live.');
    await loadRecords();
  } catch (uploadError) {
    toast('Profile saved, but the photo failed: ' + uploadError.message, 'error');
    button.disabled = false;
    button.textContent = 'Save again';
  }
}

async function deleteMember(id) {
  const member = state.records.find(function (item) { return item.id === id; });
  if (!member || !window.confirm('Delete ' + member.name + ' permanently?')) return;
  const { error } = await cmsClient.from('staff_members').delete().eq('id', id);
  if (error) return toast(error.message, 'error');
  if (member.photo_storage_path) await cmsClient.storage.from('cms-media').remove([member.photo_storage_path]);
  toast('Staff profile deleted.');
  await loadRecords();
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
