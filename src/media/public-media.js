import { cmsClient, cmsConfigured } from '../cms/client.js';

const root = document.querySelector('[data-media-root]');
const page = document.body.dataset.mediaPage;

function escapeHtml(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
}

function emptyState(title, message) {
  root.innerHTML = `<div class="public-empty"><span>WA</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p></div>`;
}

function eventCard(album) {
  return `<a class="public-media-card" href="/gallery-event.html?id=${encodeURIComponent(album.id)}"><div class="public-media-card__image">${album.cover_image_url ? `<img src="${escapeHtml(album.cover_image_url)}" alt="${escapeHtml(album.title)}" loading="lazy">` : '<span>WA</span>'}</div><div class="public-media-card__body"><p>${formatDate(album.event_date)}</p><h2>${escapeHtml(album.title)}</h2><span>${escapeHtml(album.description || 'View event photographs')}</span><strong>View album →</strong></div></a>`;
}

function newsCard(post) {
  return `<a class="public-media-card public-media-card--news" href="/news-detail.html?id=${encodeURIComponent(post.id)}"><div class="public-media-card__image">${post.cover_image_url ? `<img src="${escapeHtml(post.cover_image_url)}" alt="${escapeHtml(post.title)}" loading="lazy">` : '<span>WA</span>'}</div><div class="public-media-card__body"><p>${formatDate(post.published_at || post.created_at)}</p><h2>${escapeHtml(post.title)}</h2><span>${escapeHtml(post.excerpt || post.content)}</span><strong>Read update →</strong></div></a>`;
}

async function loadGallery() {
  const { data, error } = await cmsClient.from('event_albums').select('*').eq('status', 'published').order('event_date', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
  if (error) throw error;
  if (!data?.length) return emptyState('Gallery coming soon', 'Published event albums will appear here.');
  root.innerHTML = `<div class="public-media-grid">${data.map(eventCard).join('')}</div>`;
}

async function loadNews() {
  const { data, error } = await cmsClient.from('news_posts').select('*').eq('status', 'published').order('published_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
  if (error) throw error;
  if (!data?.length) return emptyState('Updates coming soon', 'Published school news and announcements will appear here.');
  root.innerHTML = `<div class="public-media-grid">${data.map(newsCard).join('')}</div>`;
}

function addLightbox() {
  const dialog = document.createElement('dialog');
  dialog.className = 'gallery-lightbox';
  dialog.innerHTML = '<button aria-label="Close image">×</button><img alt="">';
  document.body.appendChild(dialog);
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  document.querySelectorAll('[data-lightbox]').forEach((button) => button.addEventListener('click', () => {
    const image = button.querySelector('img');
    dialog.querySelector('img').src = image.src;
    dialog.querySelector('img').alt = image.alt;
    dialog.showModal();
  }));
}

async function loadEventDetail() {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) return emptyState('Album not found', 'Return to the gallery and select an event album.');
  const [{ data: album, error }, { data: photos, error: photoError }] = await Promise.all([
    cmsClient.from('event_albums').select('*').eq('id', id).eq('status', 'published').maybeSingle(),
    cmsClient.from('event_photos').select('*').eq('album_id', id).order('sort_order').order('created_at'),
  ]);
  if (error || photoError) throw error || photoError;
  if (!album) return emptyState('Album not found', 'This album may be unpublished or no longer available.');
  document.title = `${album.title} | White Academy`;
  document.querySelector('[data-detail-title]').textContent = album.title;
  document.querySelector('[data-detail-date]').textContent = formatDate(album.event_date);
  document.querySelector('[data-detail-description]').textContent = album.description || 'Moments from White Academy.';
  const allPhotos = album.cover_image_url ? [{ id: 'cover', image_url: album.cover_image_url, caption: album.title }, ...(photos || [])] : photos || [];
  if (!allPhotos.length) return emptyState('Photos coming soon', 'This event album has been created and photographs will be added shortly.');
  root.innerHTML = `<div class="event-photo-grid">${allPhotos.map((photo) => `<button data-lightbox><img src="${escapeHtml(photo.image_url)}" alt="${escapeHtml(photo.caption || album.title)}" loading="lazy"></button>`).join('')}</div>`;
  addLightbox();
}

async function loadNewsDetail() {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) return emptyState('Update not found', 'Return to News & Updates and select a post.');
  const [{ data: post, error }, { data: photos, error: photoError }] = await Promise.all([
    cmsClient.from('news_posts').select('*').eq('id', id).eq('status', 'published').maybeSingle(),
    cmsClient.from('news_photos').select('*').eq('news_id', id).order('sort_order').order('created_at'),
  ]);
  if (error || photoError) throw error || photoError;
  if (!post) return emptyState('Update not found', 'This update may be unpublished or no longer available.');
  document.title = `${post.title} | White Academy`;
  document.querySelector('[data-detail-title]').textContent = post.title;
  document.querySelector('[data-detail-date]').textContent = formatDate(post.published_at || post.created_at);
  if (post.cover_image_url) document.querySelector('[data-news-cover]').innerHTML = `<img src="${escapeHtml(post.cover_image_url)}" alt="${escapeHtml(post.title)}">`;
  root.innerHTML = `<div class="news-article-copy">${post.content.split(/\n+/).filter(Boolean).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}</div>${photos?.length ? `<div class="news-photo-grid">${photos.map((photo) => `<button data-lightbox><img src="${escapeHtml(photo.image_url)}" alt="${escapeHtml(photo.caption || post.title)}" loading="lazy"></button>`).join('')}</div>` : ''}`;
  if (photos?.length) addLightbox();
}

async function boot() {
  if (!root) return;
  if (!cmsConfigured || !cmsClient) return emptyState('Media Centre unavailable', 'The website database is not configured yet.');
  try {
    if (page === 'gallery') await loadGallery();
    if (page === 'event-detail') await loadEventDetail();
    if (page === 'news') await loadNews();
    if (page === 'news-detail') await loadNewsDetail();
  } catch (error) {
    console.error('Media Centre could not load.', error);
    if (page === 'gallery' || page === 'event-detail') {
      emptyState('Gallery coming soon', 'Event photographs will be published here shortly.');
    } else {
      emptyState('Updates coming soon', 'School news and announcements will be published here shortly.');
    }
  }
}

boot();
