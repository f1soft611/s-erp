import { sanitizeHtml } from '../../../../../shared/utils/sanitizeHtml';

export function sanitizeNoticeBodyHtml(html: string): string {
  return sanitizeHtml(html, { preserveTextStyles: true });
}

export function prepareNoticeFeedHtml(html: string): string {
  const sanitizedHtml = sanitizeNoticeBodyHtml(html);
  if (typeof DOMParser === 'undefined') {
    return sanitizedHtml;
  }

  const document = new DOMParser().parseFromString(sanitizedHtml, 'text/html');
  Array.from(document.body.querySelectorAll('table')).forEach((table) => {
    if (table.parentElement?.closest('.tableWrapper')) {
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'tableWrapper';
    table.replaceWith(wrapper);
    wrapper.appendChild(table);
  });

  return document.body.innerHTML.trim();
}
