import { cmsClient, cmsConfigured } from '../cms/client.js';

const root = document.querySelector('[data-staff-root]');

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function initials(name = '') {
  return name
    .replace(/^(Mr|Ms|Mrs|Dr)\.\s*/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'WA';
}

function staffCard(member) {
  const photo = member.photo_url
    ? '<img src="' + escapeHtml(member.photo_url) + '" alt="' + escapeHtml(member.name) + '" loading="lazy">'
    : '<span class="staff-initials">' + escapeHtml(initials(member.name)) + '</span>';

  return '<article class="staff-member-card">' +
    '<div class="staff-member-photo">' + photo + '</div>' +
    '<h3>' + escapeHtml(member.name) + '</h3>' +
    (member.designation ? '<p><strong>' + escapeHtml(member.designation) + '</strong></p>' : '') +
    (member.qualification ? '<p>' + escapeHtml(member.qualification) + '</p>' : '') +
    '</article>';
}

async function loadStaff() {
  if (!root) return;

  if (!cmsConfigured || !cmsClient) {
    root.innerHTML = '<div class="staff-empty">Staff directory is temporarily unavailable.</div>';
    return;
  }

  const { data, error } = await cmsClient
    .from('staff_members')
    .select('id, name, designation, qualification, photo_url, sort_order')
    .eq('status', 'published')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    root.innerHTML = '<div class="staff-empty">Staff directory is temporarily unavailable.</div>';
    return;
  }

  root.innerHTML = data?.length
    ? data.map(staffCard).join('')
    : '<div class="staff-empty">Staff profiles will be published shortly.</div>';
}

loadStaff();
