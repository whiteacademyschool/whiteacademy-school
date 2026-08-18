const IGNORED_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'SVG',
  'PATH',
  'USE',
]);

const cleanText = (value = '') => value.replace(/\s+/g, ' ').trim();

export function normalizePagePath(pathname = window.location.pathname) {
  const cleanPath = pathname.split('?')[0].split('#')[0];
  const fileName = cleanPath.split('/').filter(Boolean).pop();

  if (!fileName || fileName === 'index') return 'index.html';
  return fileName.endsWith('.html') ? fileName : `${fileName}.html`;
}

export function getElementPath(element) {
  const segments = [];
  let current = element;

  while (current && current.tagName && current.tagName !== 'BODY') {
    const tag = current.tagName.toLowerCase();
    const parent = current.parentElement;

    if (!parent) break;

    const siblings = Array.from(parent.children).filter(
      (sibling) => sibling.tagName === current.tagName,
    );
    const index = siblings.indexOf(current) + 1;
    const segment = siblings.length > 1 ? `${tag}:nth-of-type(${index})` : tag;

    segments.unshift(segment);
    current = parent;
  }

  return `body>${segments.join('>')}`;
}

function getSectionLabel(element) {
  const section = element.closest('section, header, nav, footer, main, article');

  if (!section) return 'Page content';
  if (section.matches('nav')) return 'Navigation';
  if (section.matches('footer')) return 'Footer';
  if (section.matches('header')) return 'Header';

  const heading = section.querySelector('h1, h2, h3');
  return cleanText(heading?.textContent) || 'Page content';
}

function makeTextField(node, pagePath, position) {
  const parent = node.parentElement;
  const path = getElementPath(parent);
  const textNodes = Array.from(parent.childNodes).filter(
    (child) => child.nodeType === Node.TEXT_NODE,
  );
  const nodeIndex = textNodes.indexOf(node) + 1;
  const rawValue = node.nodeValue || '';
  const leadingSpace = rawValue.match(/^\s*/)?.[0] || '';
  const trailingSpace = rawValue.match(/\s*$/)?.[0] || '';
  const value = cleanText(rawValue);
  const tag = parent.tagName.toLowerCase();

  return {
    pagePath,
    key: `text:${path}:node(${nodeIndex})`,
    type: 'text',
    value,
    originalValue: value,
    metadata: {},
    label: `${tag.toUpperCase()} text ${position}`,
    section: getSectionLabel(parent),
    element: parent,
    apply(nextValue) {
      node.nodeValue = `${leadingSpace}${nextValue}${trailingSpace}`;
    },
  };
}

function makeImageField(image, pagePath, position) {
  const value = image.getAttribute('src') || '';
  const alt = image.getAttribute('alt') || '';

  return {
    pagePath,
    key: `image:${getElementPath(image)}`,
    type: 'image',
    value,
    originalValue: value,
    metadata: { alt },
    originalMetadata: { alt },
    label: alt || `Image ${position}`,
    section: getSectionLabel(image),
    element: image,
    apply(nextValue, metadata = {}) {
      image.setAttribute('src', nextValue);
      if (typeof metadata.alt === 'string') image.setAttribute('alt', metadata.alt);
    },
  };
}

function makeLinkField(link, pagePath, position) {
  const value = link.getAttribute('href') || '';
  const label = cleanText(link.textContent) || link.getAttribute('aria-label') || `Link ${position}`;

  return {
    pagePath,
    key: `link:${getElementPath(link)}`,
    type: 'link',
    value,
    originalValue: value,
    metadata: {},
    label,
    section: getSectionLabel(link),
    element: link,
    apply(nextValue) {
      link.setAttribute('href', nextValue);
    },
  };
}

function makeSeoFields(document, pagePath) {
  const title = document.querySelector('title');
  const description = document.querySelector('meta[name="description"]');
  const titleValue = cleanText(title?.textContent) || '';
  const descriptionValue = description?.getAttribute('content') || '';

  return [
    {
      pagePath,
      key: 'seo:title',
      type: 'seo',
      value: titleValue,
      originalValue: titleValue,
      metadata: { field: 'title' },
      label: 'Browser title',
      section: 'SEO settings',
      element: title,
      apply(nextValue) {
        document.title = nextValue;
      },
    },
    {
      pagePath,
      key: 'seo:description',
      type: 'seo',
      value: descriptionValue,
      originalValue: descriptionValue,
      metadata: { field: 'description' },
      label: 'Meta description',
      section: 'SEO settings',
      element: description,
      apply(nextValue) {
        let meta = document.querySelector('meta[name="description"]');
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', 'description');
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', nextValue);
      },
    },
  ];
}

export function collectCmsFields(document, pagePath = normalizePagePath()) {
  if (!document.body) return makeSeoFields(document, pagePath);

  const textFields = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode();

  while (textNode) {
    const parent = textNode.parentElement;
    const value = cleanText(textNode.nodeValue);
    const ignored =
      !parent ||
      !value ||
      IGNORED_TAGS.has(parent.tagName) ||
      parent.closest('[data-cms-ignore], script, style, noscript, svg');

    if (!ignored) {
      textFields.push(makeTextField(textNode, pagePath, textFields.length + 1));
    }

    textNode = walker.nextNode();
  }

  const imageFields = Array.from(
    document.querySelectorAll('img:not([data-cms-ignore])'),
  ).map((image, index) => makeImageField(image, pagePath, index + 1));

  const linkFields = Array.from(
    document.querySelectorAll('a[href]:not([data-cms-ignore])'),
  ).map((link, index) => makeLinkField(link, pagePath, index + 1));

  return [
    ...makeSeoFields(document, pagePath),
    ...textFields,
    ...imageFields,
    ...linkFields,
  ];
}

export function applyCmsRecord(field, record) {
  if (!field || !record) return;
  field.apply(record.value, record.metadata || {});
}

export function resetCmsField(field) {
  if (!field) return;
  field.apply(field.originalValue, field.originalMetadata || field.metadata || {});
}
