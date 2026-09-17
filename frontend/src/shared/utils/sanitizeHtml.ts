const allowedTags = new Set([
  'a',
  'blockquote',
  'br',
  'code',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'ol',
  'p',
  'pre',
  'strong',
  'ul',
]);

const allowedAttributes = new Set(['aria-label', 'href', 'rel', 'target']);

function isSafeUrl(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (
    !normalized ||
    normalized.startsWith('#') ||
    (normalized.startsWith('/') && !normalized.startsWith('//'))
  ) {
    return true;
  }
  return /^(https?:|mailto:)/i.test(normalized);
}

export function sanitizeHtml(value: string): string {
  if (typeof DOMParser === 'undefined') {
    return value
      .replace(/<(script|style|svg)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, '')
      .replace(/\s+on[a-z-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(
        /\s+(?:href|src)\s*=\s*(?:"\s*(?:(?:javascript|data|vbscript):|\/\/)[^" ]*"|'\s*(?:(?:javascript|data|vbscript):|\/\/)[^' ]*'|[^\s>]*\s*)/gi,
        '',
      )
      .trim();
  }

  const parsed = new DOMParser().parseFromString(value, 'text/html');
  parsed
    .querySelectorAll('script, style, svg, iframe, object, embed, link, meta')
    .forEach((node) => node.remove());

  parsed.body.querySelectorAll('*').forEach((node) => {
    const element = node as HTMLElement;
    if (!allowedTags.has(element.tagName.toLowerCase())) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const isUrl = name === 'href' || name === 'src';
      if (
        name.startsWith('on') ||
        !allowedAttributes.has(name) ||
        (isUrl && !isSafeUrl(attribute.value))
      ) {
        element.removeAttribute(attribute.name);
      }
    });

    if (element.tagName.toLowerCase() === 'a') {
      element.setAttribute('rel', 'noopener noreferrer');
      if (element.hasAttribute('target') === false) {
        element.setAttribute('target', '_blank');
      }
    }
  });

  return parsed.body.innerHTML.trim();
}
