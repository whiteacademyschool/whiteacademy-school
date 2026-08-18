import './admin.css';
import { cmsClient, cmsConfigured } from '../cms/client.js';
import { collectCmsFields } from '../cms/content-model.js';

const PAGE_GROUPS = [
  {
    name: 'Main website',
    pages: [
      ['index.html', 'Homepage'],
      ['about-school.html', 'About School'],
      ['trust.html', 'Trust'],
      ['messages-chairman.html', 'Chairman Message'],
      ['messages-principal.html', 'Principal Message'],
      ['mandatory-disclosure.html', 'Mandatory Disclosure'],
    ],
  },
  {
    name: 'Academics',
    pages: [
      ['academics.html', 'Academics Overview'],
      ['kindergarten.html', 'Kindergarten'],
      ['primary-middle.html', 'Primary & Middle'],
      ['secondary-school.html', 'Secondary School'],
    ],
  },
  {
    name: 'Co-curricular',
    pages: [
      ['co-curricular.html', 'Co-Curricular Overview'],
      ['school-club.html', 'School Club'],
      ['school-houses.html', 'School Houses'],
      ['student-council.html', 'Student Council'],
      ['school-buzz.html', 'School Buzz'],
    ],
  },
  {
    name: 'School zone',
    pages: [
      ['school-zone.html', 'School Zone Overview'],
      ['school-timing.html', 'School Timing'],
      ['transportation.html', 'Transportation'],
      ['safety-security.html', 'Safety & Security'],
      ['our-staff.html', 'Our Staff'],
    ],
  },
  {
    name: 'Admissions & contact',
    pages: [
      ['admission-process.html', 'Admission Process'],
      ['contact.html', 'Contact'],
      ['career.html', 'Career'],
    ],
  },
];

const ALL_PAGES = PAGE_GROUPS.flatMap((group) =>
  group.pages.map(([path, label]) => ({ path, label, group: group.name })),
);

const state = {
  user: null,
  page: ALL_PAGES[0],
  fields: [],
  overrides: new Map(),
  drafts: new Map(),
  filter: 'all',
  search: '',
  loadingPage: false,
};

const app = document.querySelector('#admin-app');

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function pageUrl(path) {
  return path === 'index.html' ? '/' : `/${path}`;
}

function currentRecord(field) {
  return (
    state.drafts.get(field.key) ||
    state.overrides.get(field.key) || {
      value: field.originalValue,
      metadata: field.originalMetadata || field.metadata || {},
      content_type: field.type,
    }
  );
}

function recordChanged(field, record) {
  const override = state.overrides.get(field.key);
  if (!override) return record.value !== field.originalValue;

  return (
    record.value !== override.value ||
    JSON.stringify(record.metadata || {}) !== JSON.stringify(override.metadata || {})
  );
}

function setDraft(field, value, metadata = {}) {
  const record = {
    value,
    metadata,
    content_type: field.type,
  };

  if (recordChanged(field, record)) state.drafts.set(field.key, record);
  else state.drafts.delete(field.key);

  updateSaveState();
}

function updateSaveState() {
  const button = document.querySelector('#save-all');
  const counter = document.querySelector('#change-count');
  const count = state.drafts.size;

  if (button) button.disabled = count === 0;
  if (counter) counter.textContent = count ? `${count} unsaved change${count === 1 ? '' : 's'}` : 'All changes saved';
}

function toast(message, tone = 'success') {
  const container = document.querySelector('#toast-stack');
  if (!container) return;

  const item = document.createElement('div');
  item.className = `admin-toast admin-toast--${tone}`;
  item.textContent = message;
  container.appendChild(item);
  window.setTimeout(() => item.remove(), 4200);
}

function renderSetup() {
  app.innerHTML = `
    <main class="setup-screen">
      <section class="setup-card">
        <div class="brand-lockup"><span>WA</span><div><strong>White Academy</strong><small>Content administration</small></div></div>
        <div class="setup-icon">⚙</div>
        <p class="eyebrow">ONE-TIME CONFIGURATION</p>
        <h1>Connect the content database</h1>
        <p>The admin panel is installed, but Supabase environment variables have not been added yet. The public website is unaffected.</p>
        <ol>
          <li>Create a Supabase project.</li>
          <li>Run <code>supabase/cms.sql</code> in the SQL editor.</li>
          <li>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in Vercel.</li>
          <li>Redeploy the project.</li>
        </ol>
        <a class="primary-action" href="/">Return to website</a>
      </section>
    </main>`;
}

function renderLogin(message = '') {
  app.innerHTML = `
    <main class="login-screen">
      <section class="login-visual">
        <div class="login-visual__content">
          <div class="brand-lockup brand-lockup--light"><span>WA</span><div><strong>White Academy</strong><small>School administration</small></div></div>
          <div>
            <p class="eyebrow">CONTENT MANAGEMENT</p>
            <h1>Every page.<br />One secure place.</h1>
            <p>Update school information, page content, photos, links and search metadata without changing the website design.</p>
          </div>
          <small>Authorized administrator access only</small>
        </div>
      </section>
      <section class="login-panel">
        <form id="login-form" class="login-card">
          <p class="eyebrow">WELCOME BACK</p>
          <h2>Sign in to admin</h2>
          <p>Use the administrator email and password configured for the school.</p>
          ${message ? `<div class="form-alert">${escapeHtml(message)}</div>` : ''}
          <label>Email address<input name="email" type="email" autocomplete="username" required placeholder="admin@whiteacademy.in" /></label>
          <label>Password<input name="password" type="password" autocomplete="current-password" required placeholder="Enter your password" /></label>
          <button class="primary-action" type="submit">Sign in securely</button>
          <a class="back-link" href="/">← Back to website</a>
        </form>
      </section>
    </main>`;

  document.querySelector('#login-form').addEventListener('submit', handleLogin);
}

async function handleLogin(event) {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button');
  const formData = new FormData(event.currentTarget);

  button.disabled = true;
  button.textContent = 'Signing in…';

  const { data, error } = await cmsClient.auth.signInWithPassword({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (error) {
    renderLogin(error.message);
    return;
  }

  const authorized = await verifyAdmin(data.user);
  if (!authorized) {
    await cmsClient.auth.signOut();
    renderLogin('This account is not authorized to manage the website.');
  }
}

async function verifyAdmin(user) {
  if (!user) return false;

  const { data, error } = await cmsClient
    .from('cms_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) return false;

  state.user = user;
  renderDashboard();
  await loadPage(state.page.path);
  return true;
}

function pageNavigationMarkup() {
  return PAGE_GROUPS.map(
    (group) => `
      <div class="nav-group">
        <p>${escapeHtml(group.name)}</p>
        ${group.pages
          .map(
            ([path, label]) => `
              <button class="page-link ${state.page.path === path ? 'is-active' : ''}" data-page="${escapeHtml(path)}">
                <span>${escapeHtml(label.slice(0, 1))}</span>${escapeHtml(label)}
              </button>`,
          )
          .join('')}
      </div>`,
  ).join('');
}

function renderDashboard() {
  app.innerHTML = `
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <div class="sidebar-brand">
          <span>WA</span><div><strong>White Academy</strong><small>Admin panel</small></div>
        </div>
        <div class="sidebar-scroll"><div class="nav-group"><p>Media Centre</p><a class="page-link media-nav-link" href="/media-admin.html#events"><span>E</span>Event Albums</a><a class="page-link media-nav-link" href="/media-admin.html#news"><span>N</span>News & Updates</a></div>${pageNavigationMarkup()}</div>
        <div class="sidebar-user">
          <div>${escapeHtml(state.user?.email?.slice(0, 1).toUpperCase() || 'A')}</div>
          <p><strong>Administrator</strong><small>${escapeHtml(state.user?.email || '')}</small></p>
          <button id="sign-out" title="Sign out">↗</button>
        </div>
      </aside>
      <main class="admin-main">
        <header class="admin-topbar">
          <button id="sidebar-toggle" class="sidebar-toggle" aria-label="Toggle pages">☰</button>
          <div><p>Website content</p><h1 id="page-title">${escapeHtml(state.page.label)}</h1></div>
          <div class="topbar-actions">
            <span id="change-count">All changes saved</span>
            <a id="view-page" class="secondary-action" href="${pageUrl(state.page.path)}" target="_blank" rel="noreferrer">View page ↗</a>
            <button id="save-all" class="primary-action" disabled>Save changes</button>
          </div>
        </header>
        <section class="editor-toolbar">
          <div class="filter-tabs" role="tablist">
            <button data-filter="all" class="is-active">All</button>
            <button data-filter="text">Text</button>
            <button data-filter="image">Photos</button>
            <button data-filter="link">Links</button>
            <button data-filter="seo">SEO</button>
          </div>
          <label class="editor-search">⌕<input id="field-search" type="search" placeholder="Search this page…" /></label>
          <button id="reset-page" class="danger-link">Reset page</button>
        </section>
        <section id="editor-content" class="editor-content"></section>
      </main>
      <div id="toast-stack" class="toast-stack" aria-live="polite"></div>
    </div>`;

  bindDashboardEvents();
}

function bindDashboardEvents() {
  document.querySelectorAll('[data-page]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (state.drafts.size && !window.confirm('Discard unsaved changes and open another page?')) return;
      state.page = ALL_PAGES.find((page) => page.path === button.dataset.page) || state.page;
      state.drafts.clear();
      document.querySelector('#page-title').textContent = state.page.label;
      document.querySelector('#view-page').href = pageUrl(state.page.path);
      document.querySelectorAll('[data-page]').forEach((item) => item.classList.toggle('is-active', item.dataset.page === state.page.path));
      document.querySelector('.admin-shell').classList.remove('sidebar-open');
      await loadPage(state.page.path);
    });
  });

  document.querySelectorAll('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      state.filter = button.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach((item) => item.classList.toggle('is-active', item === button));
      renderFields();
    });
  });

  document.querySelector('#field-search').addEventListener('input', (event) => {
    state.search = event.target.value.toLowerCase().trim();
    renderFields();
  });
  document.querySelector('#save-all').addEventListener('click', saveDrafts);
  document.querySelector('#reset-page').addEventListener('click', resetPage);
  document.querySelector('#sidebar-toggle').addEventListener('click', () => document.querySelector('.admin-shell').classList.toggle('sidebar-open'));
  document.querySelector('#sign-out').addEventListener('click', () => cmsClient.auth.signOut());
}

async function loadPage(path) {
  const container = document.querySelector('#editor-content');
  state.loadingPage = true;
  container.innerHTML = `<div class="editor-loading"><span></span><p>Loading ${escapeHtml(state.page.label)}…</p></div>`;

  try {
    const [htmlResponse, contentResponse] = await Promise.all([
      fetch(`${pageUrl(path)}?cms_source=${Date.now()}`, { cache: 'no-store' }),
      cmsClient.from('cms_content').select('*').eq('page_path', path),
    ]);

    if (!htmlResponse.ok) throw new Error(`Could not load ${path}`);
    if (contentResponse.error) throw contentResponse.error;

    const source = new DOMParser().parseFromString(await htmlResponse.text(), 'text/html');
    state.fields = collectCmsFields(source, path);
    state.overrides = new Map((contentResponse.data || []).map((record) => [record.content_key, record]));
    state.drafts.clear();
    state.loadingPage = false;
    renderFields();
    updateSaveState();
  } catch (error) {
    state.loadingPage = false;
    container.innerHTML = `<div class="empty-state"><strong>Unable to load this page</strong><p>${escapeHtml(error.message)}</p><button id="retry-page" class="secondary-action">Try again</button></div>`;
    document.querySelector('#retry-page')?.addEventListener('click', () => loadPage(path));
  }
}

function filteredFields() {
  return state.fields.filter((field) => {
    const typeMatches = state.filter === 'all' || field.type === state.filter;
    const record = currentRecord(field);
    const searchText = `${field.label} ${field.section} ${record.value}`.toLowerCase();
    return typeMatches && (!state.search || searchText.includes(state.search));
  });
}

function fieldCard(field) {
  const record = currentRecord(field);
  const overridden = state.overrides.has(field.key);
  const drafted = state.drafts.has(field.key);
  const status = drafted ? 'Unsaved' : overridden ? 'Customized' : 'Original';
  const badgeClass = drafted ? 'is-draft' : overridden ? 'is-custom' : '';

  let control = '';
  if (field.type === 'image') {
    control = `
      <div class="image-editor">
        <div class="image-preview"><img src="${escapeHtml(record.value)}" alt="${escapeHtml(record.metadata?.alt || '')}" /></div>
        <div class="image-controls">
          <label>Alternative text<input data-field-value="alt" value="${escapeHtml(record.metadata?.alt || '')}" placeholder="Describe this image" /></label>
          <label class="upload-action">Replace photo<input data-image-upload type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" /></label>
          <small>PNG, JPG, WebP, GIF or SVG. Maximum 10 MB.</small>
        </div>
      </div>`;
  } else if (field.type === 'link') {
    control = `<label class="field-control">Destination URL<input data-field-value="value" value="${escapeHtml(record.value)}" /></label>`;
  } else {
    const rows = field.type === 'seo' && field.metadata?.field === 'title' ? 2 : Math.min(8, Math.max(2, Math.ceil(record.value.length / 85)));
    control = `<label class="field-control">${field.type === 'seo' ? field.label : 'Content'}<textarea data-field-value="value" rows="${rows}">${escapeHtml(record.value)}</textarea></label>`;
  }

  return `
    <article class="field-card" data-field-key="${escapeHtml(field.key)}">
      <header>
        <div><span class="field-type">${escapeHtml(field.type)}</span><h3>${escapeHtml(field.label)}</h3></div>
        <span class="field-status ${badgeClass}">${status}</span>
      </header>
      ${control}
      <footer>
        <small>${overridden || drafted ? 'This field differs from the original website.' : 'Using the original website value.'}</small>
        <button data-reset-field ${overridden || drafted ? '' : 'disabled'}>Restore original</button>
      </footer>
    </article>`;
}

function renderFields() {
  const container = document.querySelector('#editor-content');
  if (!container || state.loadingPage) return;

  const fields = filteredFields();
  if (!fields.length) {
    container.innerHTML = `<div class="empty-state"><strong>No matching content</strong><p>Try another filter or clear the search.</p></div>`;
    return;
  }

  const groups = new Map();
  fields.forEach((field) => {
    const list = groups.get(field.section) || [];
    list.push(field);
    groups.set(field.section, list);
  });

  container.innerHTML = Array.from(groups.entries())
    .map(
      ([section, items]) => `
        <section class="field-section">
          <div class="field-section__heading"><div><p>PAGE SECTION</p><h2>${escapeHtml(section)}</h2></div><span>${items.length} field${items.length === 1 ? '' : 's'}</span></div>
          <div class="field-list">${items.map(fieldCard).join('')}</div>
        </section>`,
    )
    .join('');

  bindFieldEvents();
}

function bindFieldEvents() {
  document.querySelectorAll('[data-field-key]').forEach((card) => {
    const field = state.fields.find((item) => item.key === card.dataset.fieldKey);
    if (!field) return;

    card.querySelectorAll('[data-field-value]').forEach((input) => {
      input.addEventListener('input', () => {
        const current = currentRecord(field);
        if (input.dataset.fieldValue === 'alt') {
          setDraft(field, current.value, { ...(current.metadata || {}), alt: input.value });
        } else {
          setDraft(field, input.value, current.metadata || {});
        }
      });
    });

    card.querySelector('[data-image-upload]')?.addEventListener('change', (event) => {
      const [file] = event.target.files;
      if (file) uploadImage(field, file);
    });
    card.querySelector('[data-reset-field]')?.addEventListener('click', () => resetField(field));
  });
}

async function saveDrafts() {
  if (!state.drafts.size) return;
  const button = document.querySelector('#save-all');
  button.disabled = true;
  button.textContent = 'Saving…';

  const records = Array.from(state.drafts.entries()).map(([key, record]) => ({
    page_path: state.page.path,
    content_key: key,
    content_type: record.content_type,
    value: record.value,
    metadata: record.metadata || {},
    updated_by: state.user.id,
  }));

  const { data, error } = await cmsClient
    .from('cms_content')
    .upsert(records, { onConflict: 'page_path,content_key' })
    .select();

  button.textContent = 'Save changes';
  if (error) {
    button.disabled = false;
    toast(error.message, 'error');
    return;
  }

  data.forEach((record) => state.overrides.set(record.content_key, record));
  state.drafts.clear();
  renderFields();
  updateSaveState();
  toast('Changes are live on the website.');
}

async function uploadImage(field, file) {
  if (!file.type.startsWith('image/')) {
    toast('Please select an image file.', 'error');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    toast('The image must be smaller than 10 MB.', 'error');
    return;
  }

  toast('Uploading photo…', 'info');
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.-]+/g, '-');
  const keyHash = Math.abs(Array.from(field.key).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) | 0, 7));
  const storagePath = `${state.page.path.replace('.html', '')}/${keyHash}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await cmsClient.storage.from('cms-media').upload(storagePath, file, { cacheControl: '3600' });

  if (uploadError) {
    toast(uploadError.message, 'error');
    return;
  }

  const { data: publicData } = cmsClient.storage.from('cms-media').getPublicUrl(storagePath);
  const current = currentRecord(field);
  const record = {
    page_path: state.page.path,
    content_key: field.key,
    content_type: 'image',
    value: publicData.publicUrl,
    metadata: current.metadata || field.metadata || {},
    updated_by: state.user.id,
  };
  const { data, error } = await cmsClient
    .from('cms_content')
    .upsert(record, { onConflict: 'page_path,content_key' })
    .select()
    .single();

  if (error) {
    toast(error.message, 'error');
    return;
  }

  state.overrides.set(field.key, data);
  state.drafts.delete(field.key);
  renderFields();
  updateSaveState();
  toast('Photo updated and published.');
}

async function resetField(field) {
  state.drafts.delete(field.key);

  if (state.overrides.has(field.key)) {
    const { error } = await cmsClient
      .from('cms_content')
      .delete()
      .eq('page_path', state.page.path)
      .eq('content_key', field.key);

    if (error) {
      toast(error.message, 'error');
      return;
    }
    state.overrides.delete(field.key);
  }

  renderFields();
  updateSaveState();
  toast('Original website value restored.');
}

async function resetPage() {
  if (!state.overrides.size && !state.drafts.size) {
    toast('This page already uses all original values.', 'info');
    return;
  }
  if (!window.confirm(`Restore every field on ${state.page.label} to the original website?`)) return;

  const { error } = await cmsClient.from('cms_content').delete().eq('page_path', state.page.path);
  if (error) {
    toast(error.message, 'error');
    return;
  }

  state.overrides.clear();
  state.drafts.clear();
  renderFields();
  updateSaveState();
  toast('The complete page was restored.');
}

async function boot() {
  if (!cmsConfigured || !cmsClient) {
    renderSetup();
    return;
  }

  const { data } = await cmsClient.auth.getSession();
  if (data.session?.user) {
    const authorized = await verifyAdmin(data.session.user);
    if (!authorized) renderLogin('This account is not authorized to manage the website.');
  } else {
    renderLogin();
  }

  cmsClient.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      state.user = null;
      renderLogin();
    }
  });
}

boot();
