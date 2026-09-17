export const NAVIGATION_PAGE_PATH = '__global__';
export const NAVIGATION_CONTENT_KEY = 'navigation:primary';

export const DEFAULT_NAVIGATION = [
  { id: 'home', label: 'Home', href: '/', visible: true },
  { id: 'about', label: 'About School', href: '/about-school.html', visible: true },
  { id: 'academics', label: 'Academics', href: '/kindergarten.html', visible: true },
  { id: 'cocurricular', label: 'Co-Curricular', href: '/school-club.html', visible: true },
  { id: 'schoolzone', label: 'School Zone', href: '/school-timing.html', visible: true },
  { id: 'media', label: 'Media Centre', href: '/gallery.html', visible: true },
  { id: 'contact', label: 'Contact Us', href: '/contact.html', visible: true },
];

const CHILDREN = {
  about: [
    ['About School', '/about-school.html'],
    ['Trust', '/trust.html'],
    ['Messages From Chairman', '/messages-chairman.html'],
    ['Message From Principal', '/messages-principal.html'],
    ['Mandatory Disclosure', '/mandatory-disclosure.html'],
  ],
  academics: [
    ['Kindergarten', '/kindergarten.html'],
    ['Primary and Middle', '/primary-middle.html'],
    ['Secondary School', '/secondary-school.html'],
  ],
  cocurricular: [
    ['School Club', '/school-club.html'],
    ['School Houses', '/school-houses.html'],
    ['Student Council', '/student-council.html'],
    ['School Buzz', '/school-buzz.html'],
  ],
  schoolzone: [
    ['School Timing', '/school-timing.html'],
    ['Transportation', '/transportation.html'],
    ['Safety and Security', '/safety-security.html'],
    ['Our Staff', '/our-staff.html'],
  ],
  media: [
    ['Event Gallery', '/gallery.html'],
    ['News & Updates', '/news.html'],
  ],
  contact: [
    ['Contact Us', '/contact.html'],
    ['Admission Process', '/admission-process.html'],
    ['Career', '/career.html'],
  ],
};

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function normalizeNavigation(value) {
  const source = Array.isArray(value) ? value : [];
  return DEFAULT_NAVIGATION.map(function (fallback) {
    const item = source.find(function (candidate) { return candidate?.id === fallback.id; }) || {};
    return {
      id: fallback.id,
      label: String(item.label || fallback.label).trim(),
      href: String(item.href || fallback.href).trim(),
      visible: item.visible !== false,
    };
  });
}

export function renderPrimaryNavigation(value, pathname = window.location.pathname) {
  return normalizeNavigation(value)
    .filter(function (item) { return item.visible; })
    .map(function (item) {
      const children = CHILDREN[item.id] || [];
      const active = pathname === item.href || children.some(function (child) { return child[1] === pathname; });
      const activeClass = active ? ' class="active"' : '';

      if (!children.length) {
        return '<a' + activeClass + ' href="' + escapeHtml(item.href) + '">' + escapeHtml(item.label) + '</a>';
      }

      return '<div class="nav-dropdown">' +
        '<a' + activeClass + ' href="' + escapeHtml(item.href) + '">' + escapeHtml(item.label) + ' ▾</a>' +
        '<div class="dropdown-menu">' +
        children.map(function (child) {
          return '<a href="' + escapeHtml(child[1]) + '">' + escapeHtml(child[0]) + '</a>';
        }).join('') +
        '</div></div>';
    })
    .join('');
}
