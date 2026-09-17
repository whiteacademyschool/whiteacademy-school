import './admin.css';
import { cmsClient, cmsConfigured } from '../cms/client.js';
import {
  DEFAULT_NAVIGATION,
  NAVIGATION_CONTENT_KEY,
  NAVIGATION_PAGE_PATH,
  normalizeNavigation,
} from '../cms/navigation.js';

const app = document.querySelector('#admin-app');
const modules = {
  images: { label: 'Page Images', icon: 'I', description: 'Replace photos page by page' },
  staff: { label: 'Our Staff', icon: 'S', description: 'Manage staff profiles and photos' },
  events: { label: 'Events', icon: 'E', description: 'Create albums and upload event photos' },
  news: { label: 'News & Updates', icon: 'N', description: 'Publish school announcements' },
  navigation: { label: 'Navigation', icon: 'M', description: 'Manage the global website menu' },
};
const requestedModule = location.hash.replace('#', '');
const state = {
  user: null,
  module: modules[requestedModule] ? requestedModule : 'images',
  navigation: DEFAULT_NAVIGATION,
};

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

function renderSetup() {
  app.innerHTML = '<main class="setup-screen"><section class="setup-card"><div class="brand-lockup"><span>WA</span><div><strong>White Academy</strong><small>Administration</small></div></div><h1>Admin connection unavailable</h1><p>The Supabase connection is missing from this deployment.</p><a class="primary-action" href="/">Return to website</a></section></main>';
}

function renderLogin(message = '') {
  app.innerHTML = '<main class="login-screen"><section class="login-visual"><div class="login-visual__content"><div class="brand-lockup brand-lockup--light"><span>WA</span><div><strong>White Academy</strong><small>School administration</small></div></div><div><p class="eyebrow">ONE ADMIN PANEL</p><h1>Simple, focused<br>and organized.</h1><p>Manage page images, staff, events, news and the website menu from one secure place.</p></div><small>Authorized administrator access only</small></div></section><section class="login-panel"><form id="login-form" class="login-card"><p class="eyebrow">WELCOME BACK</p><h2>Sign in to White Academy</h2><p>Use the school administrator account.</p>' +
    (message ? '<div class="form-alert">' + escapeHtml(message) + '</div>' : '') +
    '<label>Email address<input name="email" type="email" autocomplete="username" required value="whiteschoolacademyweb@gmail.com"></label><label>Password<input name="password" type="password" autocomplete="current-password" required placeholder="Enter your password"></label><button class="primary-action" type="submit">Open admin panel</button><a class="back-link" href="/">← Back to website</a></form></section></main>';
  document.querySelector('#login-form').addEventListener('submit', handleLogin);
}

async function handleLogin(event) {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button');
  const values = new FormData(event.currentTarget);
  button.disabled = true;
  button.textContent = 'Signing in…';
  const { data, error } = await cmsClient.auth.signInWithPassword({
    email: values.get('email'),
    password: values.get('password'),
  });
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
  await openModule(state.module);
  return true;
}

function moduleButtons() {
  return Object.entries(modules).map(function (entry) {
    const id = entry[0];
    const module = entry[1];
    return '<button class="page-link' + (state.module === id ? ' is-active' : '') + '" data-module="' + id + '"><span>' + module.icon + '</span><b>' + escapeHtml(module.label) + '</b><small>' + escapeHtml(module.description) + '</small></button>';
  }).join('');
}

function renderShell() {
  app.innerHTML = '<div class="admin-shell unified-admin"><aside class="admin-sidebar"><div class="sidebar-brand"><span>WA</span><div><strong>White Academy</strong><small>Admin panel</small></div></div><div class="sidebar-scroll"><div class="nav-group"><p>Manage website</p>' + moduleButtons() + '</div><div class="nav-group"><p>Open website</p><a class="page-link media-nav-link" href="/" target="_blank"><span>↗</span>View live website</a></div></div><div class="sidebar-user"><div>' + escapeHtml(state.user?.email?.slice(0, 1).toUpperCase() || 'A') + '</div><p><strong>Administrator</strong><small>' + escapeHtml(state.user?.email || '') + '</small></p><button id="sign-out" title="Sign out">↗</button></div></aside><main class="admin-main"><button id="sidebar-toggle" class="sidebar-toggle unified-sidebar-toggle" aria-label="Toggle navigation">☰</button><section id="module-host" class="module-host"><div class="editor-loading"><span></span><p>Loading admin module…</p></div></section></main><div id="toast-stack" class="toast-stack" aria-live="polite"></div></div>';

  document.querySelectorAll('[data-module]').forEach(function (button) {
    button.addEventListener('click', function () {
      openModule(button.dataset.module);
      document.querySelector('.admin-shell').classList.remove('sidebar-open');
    });
  });
  document.querySelector('#sidebar-toggle').addEventListener('click', function () {
    document.querySelector('.admin-shell').classList.toggle('sidebar-open');
  });
  document.querySelector('#sign-out').addEventListener('click', function () { cmsClient.auth.signOut(); });
}

function moduleUrl(id) {
  if (id === 'images') return '/content-admin.html?embedded=1';
  if (id === 'staff') return '/staff-admin.html?embedded=1';
  if (id === 'events') return '/media-admin.html?embedded=1#events';
  if (id === 'news') return '/media-admin.html?embedded=1#news';
  return '';
}

async function openModule(id) {
  if (!modules[id]) id = 'images';
  state.module = id;
  history.replaceState(null, '', '#' + id);
  document.querySelectorAll('[data-module]').forEach(function (button) {
    button.classList.toggle('is-active', button.dataset.module === id);
  });

  const host = document.querySelector('#module-host');
  if (id === 'navigation') {
    await renderNavigationEditor();
    return;
  }

  host.innerHTML = '<iframe class="admin-module-frame" title="' + escapeHtml(modules[id].label) + '" src="' + moduleUrl(id) + '"></iframe>';
}

async function renderNavigationEditor() {
  const host = document.querySelector('#module-host');
  host.innerHTML = '<div class="editor-loading"><span></span><p>Loading navigation…</p></div>';

  const { data, error } = await cmsClient.from('cms_content').select('*').eq('page_path', NAVIGATION_PAGE_PATH).eq('content_key', NAVIGATION_CONTENT_KEY).maybeSingle();
  if (error) {
    host.innerHTML = '<div class="empty-state"><strong>Unable to load navigation</strong><p>' + escapeHtml(error.message) + '</p></div>';
    return;
  }

  try {
    state.navigation = normalizeNavigation(data?.value ? JSON.parse(data.value) : DEFAULT_NAVIGATION);
  } catch {
    state.navigation = normalizeNavigation(DEFAULT_NAVIGATION);
  }

  host.innerHTML = '<header class="admin-topbar"><div><p>Global settings</p><h1>Website Navigation</h1></div><div class="topbar-actions"><a class="secondary-action" href="/" target="_blank">View website ↗</a><button id="save-navigation" class="primary-action">Save navigation</button></div></header><section class="navigation-workspace"><div class="navigation-intro"><h2>One menu for every page</h2><p>Change a menu label, destination or visibility once. The same navigation is used throughout the website.</p></div><div class="navigation-list">' +
    state.navigation.map(function (item) {
      return '<div class="navigation-row" data-navigation-id="' + escapeHtml(item.id) + '"><span class="navigation-handle">≡</span><label>Menu label<input data-nav-label value="' + escapeHtml(item.label) + '"></label><label>Destination<input data-nav-href value="' + escapeHtml(item.href) + '"></label><label class="navigation-visible"><input data-nav-visible type="checkbox"' + (item.visible ? ' checked' : '') + '><span>Visible</span></label></div>';
    }).join('') +
    '</div><div class="navigation-actions"><button id="restore-navigation" class="danger-link">Restore default navigation</button><p>Dropdown links remain organized automatically under their main menu.</p></div></section>';

  document.querySelector('#save-navigation').addEventListener('click', saveNavigation);
  document.querySelector('#restore-navigation').addEventListener('click', restoreNavigation);
}

function collectNavigationForm() {
  return [...document.querySelectorAll('[data-navigation-id]')].map(function (row) {
    return {
      id: row.dataset.navigationId,
      label: row.querySelector('[data-nav-label]').value.trim(),
      href: row.querySelector('[data-nav-href]').value.trim(),
      visible: row.querySelector('[data-nav-visible]').checked,
    };
  });
}

async function saveNavigation() {
  const button = document.querySelector('#save-navigation');
  button.disabled = true;
  button.textContent = 'Saving…';
  const navigation = normalizeNavigation(collectNavigationForm());
  const { error } = await cmsClient.from('cms_content').upsert({
    page_path: NAVIGATION_PAGE_PATH,
    content_key: NAVIGATION_CONTENT_KEY,
    content_type: 'text',
    value: JSON.stringify(navigation),
    metadata: { setting: 'primary_navigation' },
    updated_by: state.user.id,
  }, { onConflict: 'page_path,content_key' });
  button.disabled = false;
  button.textContent = 'Save navigation';
  if (error) return toast(error.message, 'error');
  state.navigation = navigation;
  toast('Navigation updated across the live website.');
}

async function restoreNavigation() {
  if (!window.confirm('Restore the original website navigation?')) return;
  const { error } = await cmsClient.from('cms_content').delete().eq('page_path', NAVIGATION_PAGE_PATH).eq('content_key', NAVIGATION_CONTENT_KEY);
  if (error) return toast(error.message, 'error');
  state.navigation = normalizeNavigation(DEFAULT_NAVIGATION);
  toast('Default navigation restored.');
  await renderNavigationEditor();
}

async function boot() {
  if (!cmsConfigured || !cmsClient) return renderSetup();
  const { data } = await cmsClient.auth.getSession();
  if (data.session?.user) {
    if (!(await verifyAdmin(data.session.user))) renderLogin('This account is not authorized to manage the website.');
  } else {
    renderLogin();
  }

  cmsClient.auth.onAuthStateChange(function (event) {
    if (event === 'SIGNED_OUT') {
      state.user = null;
      renderLogin();
    }
  });
}

boot();
