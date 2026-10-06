import { sanitizeHtml } from '../../utils/sanitizeHtml';

const allowedCellStyleProperties = new Set([
  'background',
  'background-color',
  'border',
  'border-bottom',
  'border-left',
  'border-right',
  'border-top',
  'color',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'height',
  'line-height',
  'overflow-wrap',
  'text-align',
  'text-decoration',
  'vertical-align',
  'width',
  'white-space',
  'word-break',
]);

const allowedTextStyleProperties = new Set([
  'background-color',
  'color',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'line-height',
  'overflow-wrap',
  'text-decoration',
  'white-space',
  'word-break',
]);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isSafeCellStyleValue(value: string): boolean {
  return !/[{}<>]|url\s*\(|expression\s*\(|javascript\s*:/i.test(value);
}

function isSafeStyleDeclaration(property: string, value: string): boolean {
  if (!isSafeCellStyleValue(value)) return false;
  const normalized = value.trim().toLowerCase();
  if (property === 'white-space') {
    return [
      'normal',
      'pre',
      'nowrap',
      'pre-wrap',
      'pre-line',
      'break-spaces',
    ].includes(normalized);
  }
  if (property === 'word-break') {
    return ['normal', 'break-all', 'keep-all', 'break-word'].includes(
      normalized,
    );
  }
  if (property === 'overflow-wrap') {
    return ['normal', 'break-word', 'anywhere'].includes(normalized);
  }
  return true;
}

function normalizeCellDimension(value: string | null): string | null {
  const normalized = value?.trim() ?? '';
  if (!normalized) {
    return null;
  }

  if (/^\d+(?:\.\d+)?$/.test(normalized)) {
    return `${normalized}px`;
  }

  return /^(?:\d+(?:\.\d+)?)(?:px|pt|pc|cm|mm|in|em|rem|%|vh|vw)$/.test(
    normalized,
  )
    ? normalized
    : null;
}

function normalizeImageDimension(value: string | null): string | null {
  const normalized = value?.trim() ?? '';
  return /^(?:\d+(?:\.\d+)?)(?:px|%)$/.test(normalized) ? normalized : null;
}

function normalizeColumnWidth(value: string | null): number | null {
  const normalized = normalizeCellDimension(value);
  if (!normalized) {
    return null;
  }

  const match = normalized.match(/^(\d+(?:\.\d+)?)(px|pt|pc|in|cm|mm)?$/);
  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2] ?? 'px';
  const pixels =
    unit === 'pt'
      ? (amount * 96) / 72
      : unit === 'pc'
        ? amount * 16
        : unit === 'in'
          ? amount * 96
          : unit === 'cm'
            ? (amount * 96) / 2.54
            : unit === 'mm'
              ? (amount * 96) / 25.4
              : amount;

  return Number.isFinite(pixels) && pixels > 0 && pixels <= 2000
    ? Math.max(1, Math.round(pixels))
    : null;
}

function getClipboardTableColumnWidths(table: Element): number[] {
  const columns = Array.from(table.querySelectorAll(':scope > colgroup > col'));

  return columns.flatMap((column) => {
    const width = normalizeColumnWidth(
      (column as HTMLElement).style.getPropertyValue('width') ||
        column.getAttribute('width'),
    );
    const span = Math.max(1, Number(column.getAttribute('span')) || 1);
    return Array.from({ length: span }, () => width ?? 0);
  });
}

function sanitizeCellStyle(cell: Element, omitWidth = false): string | null {
  const declarations: string[] = [];
  const style = (cell as HTMLElement).style;

  for (const property of allowedCellStyleProperties) {
    if (omitWidth && property === 'width') {
      continue;
    }

    const value = style.getPropertyValue(property).trim();
    if (!value || !isSafeStyleDeclaration(property, value)) {
      continue;
    }

    const normalizedValue =
      property === 'width' || property === 'height' || property === 'font-size'
        ? normalizeCellDimension(value)
        : value;
    if (normalizedValue) {
      declarations.push(`${property}:${normalizedValue}`);
    }
  }

  for (const [property, attribute] of [
    ['width', 'width'],
    ['height', 'height'],
  ] as const) {
    if (omitWidth && property === 'width') {
      continue;
    }

    if (
      declarations.some((declaration) => declaration.startsWith(`${property}:`))
    ) {
      continue;
    }

    const normalizedValue = normalizeCellDimension(
      cell.getAttribute(attribute),
    );
    if (normalizedValue) {
      declarations.push(`${property}:${normalizedValue}`);
    }
  }

  return declarations.length > 0 ? declarations.join(';') : null;
}

function sanitizeTextStyle(element: Element): string | null {
  const declarations: string[] = [];
  const style = (element as HTMLElement).style;

  for (const property of allowedTextStyleProperties) {
    const value = style.getPropertyValue(property).trim();
    if (!value || !isSafeStyleDeclaration(property, value)) {
      continue;
    }

    const normalizedValue =
      property === 'font-size' ? normalizeCellDimension(value) : value;
    if (normalizedValue) {
      declarations.push(`${property}:${normalizedValue}`);
    }
  }

  if (element.tagName.toLowerCase() === 'font') {
    const legacyAttributes = [
      ['face', 'font-family'],
      ['color', 'color'],
    ] as const;
    for (const [attribute, property] of legacyAttributes) {
      const value = element.getAttribute(attribute)?.trim() ?? '';
      if (
        value &&
        !declarations.some((declaration) =>
          declaration.startsWith(`${property}:`),
        ) &&
        isSafeCellStyleValue(value) &&
        !value.includes(';')
      ) {
        declarations.push(`${property}:${value}`);
      }
    }

    const legacySize = element.getAttribute('size')?.trim() ?? '';
    const legacyFontSizes: Record<string, string> = {
      '1': '8pt',
      '2': '10pt',
      '3': '12pt',
      '4': '14pt',
      '5': '18pt',
      '6': '24pt',
      '7': '36pt',
    };
    const fontSize =
      legacyFontSizes[legacySize] ?? normalizeCellDimension(legacySize);
    if (
      fontSize &&
      !declarations.some((declaration) => declaration.startsWith('font-size:'))
    ) {
      declarations.push(`font-size:${fontSize}`);
    }
  }

  return declarations.length > 0 ? declarations.join(';') : null;
}

function normalizeLegacyClipboardFonts(root: HTMLElement): void {
  root.querySelectorAll('font').forEach((font) => {
    const style = sanitizeTextStyle(font);
    if (!style) {
      font.replaceWith(...Array.from(font.childNodes));
      return;
    }
    const span = font.ownerDocument.createElement('span');
    span.setAttribute('style', style);
    while (font.firstChild) {
      span.appendChild(font.firstChild);
    }
    font.replaceWith(span);
  });
}

function normalizeClipboardBlockTextStyles(root: HTMLElement): void {
  root
    .querySelectorAll('p,div,h1,h2,h3,h4,h5,h6,li,blockquote,pre')
    .forEach((block) => {
      const style = sanitizeTextStyle(block);
      if (!style) return;
      const span = block.ownerDocument.createElement('span');
      span.setAttribute('style', style);
      while (block.firstChild) {
        span.appendChild(block.firstChild);
      }
      block.appendChild(span);
      block.removeAttribute('style');
    });
}

function normalizeClipboardTable(table: Element): string {
  const rows = Array.from(table.querySelectorAll('tr')).filter(
    (row) => row.closest('table') === table,
  );
  const columnWidths = getClipboardTableColumnWidths(table);
  const occupiedUntil: number[] = [];
  const normalizedRows = rows
    .map((row, rowIndex) => {
      const cells = Array.from(row.children).filter(
        (cell) =>
          cell.tagName.toLowerCase() === 'td' ||
          cell.tagName.toLowerCase() === 'th',
      );
      if (cells.length === 0) {
        return '<tr></tr>';
      }

      let columnIndex = 0;
      const normalizedCells = cells.map((cell) => {
        const tagName = cell.tagName.toLowerCase() === 'th' ? 'th' : 'td';
        const colspan = Math.max(1, Number(cell.getAttribute('colspan')) || 1);
        const rowspan = Math.max(1, Number(cell.getAttribute('rowspan')) || 1);
        while ((occupiedUntil[columnIndex] ?? 0) > rowIndex) {
          columnIndex += 1;
        }
        const cellColumn = columnIndex;
        const cellColumnWidths = columnWidths.slice(
          cellColumn,
          cellColumn + colspan,
        );
        const colwidthAttribute =
          cellColumnWidths.length === colspan &&
          cellColumnWidths.every((width) => width > 0)
            ? ` colwidth="${cellColumnWidths.join(',')}"`
            : '';
        const spanAttributes = [
          colspan > 1 ? ` colspan="${colspan}"` : '',
          rowspan > 1 ? ` rowspan="${rowspan}"` : '',
        ].join('');
        for (
          let spanColumn = cellColumn;
          spanColumn < cellColumn + colspan;
          spanColumn += 1
        ) {
          occupiedUntil[spanColumn] = Math.max(
            occupiedUntil[spanColumn] ?? 0,
            rowIndex + rowspan,
          );
        }
        columnIndex += colspan;
        const style = sanitizeCellStyle(cell, Boolean(colwidthAttribute));
        const styleAttribute = style ? ` style="${escapeHtml(style)}"` : '';
        const content = Array.from(cell.childNodes)
          .map(serializeClipboardCellNode)
          .join('')
          .trim();

        return `<${tagName}${spanAttributes}${colwidthAttribute}${styleAttribute}>${content}</${tagName}>`;
      });

      return `<tr>${normalizedCells.join('')}</tr>`;
    })
    .filter(Boolean);

  return normalizedRows.length > 0
    ? `<table><tbody>${normalizedRows.join('')}</tbody></table>`
    : '';
}

function serializeClipboardCellNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent ?? '')
      .replace(/\u00a0/g, ' ')
      .replace(/\r\n?/g, '\n');
    if (!text.trim() && text.includes('\n')) {
      return '';
    }

    return escapeHtml(text.replace(/[\t\f\v ]+/g, ' ')).replace(/\n/g, '<br>');
  }

  if (!(node instanceof Element)) {
    return '';
  }

  const tagName = node.tagName.toLowerCase();
  if (tagName === 'br') {
    return '<br>';
  }
  if (tagName === 'table') {
    return normalizeClipboardTable(node);
  }

  const content = Array.from(node.childNodes)
    .map(serializeClipboardCellNode)
    .join('');
  const style = sanitizeTextStyle(node);
  const styleAttribute = style ? ` style="${escapeHtml(style)}"` : '';
  const styledContent = style
    ? `<span${styleAttribute}>${content}</span>`
    : content;

  if (tagName === 'strong' || tagName === 'b') {
    return `<strong>${styledContent}</strong>`;
  }
  if (tagName === 'em' || tagName === 'i') {
    return `<em>${styledContent}</em>`;
  }
  if (tagName === 's' || tagName === 'strike' || tagName === 'del') {
    return `<s>${styledContent}</s>`;
  }
  if (tagName === 'p' || tagName === 'div') {
    return `<p>${styledContent}</p>`;
  }
  if (tagName === 'span' || tagName === 'font') {
    return style ? `<span${styleAttribute}>${content}</span>` : content;
  }

  return content;
}

function applyEmbeddedCellStyles(root: HTMLElement): void {
  const styleTargets = Array.from(
    root.querySelectorAll(
      'th, td, span, p, div, font, strong, b, em, i, s, del',
    ),
  );
  const styleProperties = Array.from(allowedCellStyleProperties);

  const applyDeclarationText = (
    selectorText: string,
    declarationText: string,
  ): void => {
    const declarations = declarationText
      .split(';')
      .map((declaration) => declaration.split(':'))
      .filter(([property, value]) => property && value)
      .map(
        ([property, value]) =>
          [property.trim().toLowerCase(), value.trim()] as const,
      )
      .filter(
        ([property, value]) =>
          allowedCellStyleProperties.has(property) &&
          isSafeStyleDeclaration(property, value),
      );

    for (const selector of selectorText.split(',')) {
      for (const element of styleTargets) {
        try {
          if (!element.matches(selector.trim())) {
            continue;
          }
        } catch {
          continue;
        }

        const allowedProperties = element.matches('td, th')
          ? allowedCellStyleProperties
          : allowedTextStyleProperties;
        for (const [property, value] of declarations) {
          if (allowedProperties.has(property)) {
            (element as HTMLElement).style.setProperty(property, value);
          }
        }
      }
    }
  };

  const applyRules = (rules: CSSRuleList): void => {
    Array.from(rules).forEach((rule) => {
      if (rule.type === CSSRule.STYLE_RULE) {
        const styleRule = rule as CSSStyleRule;
        for (const element of styleTargets) {
          try {
            if (!element.matches(styleRule.selectorText)) {
              continue;
            }
          } catch {
            continue;
          }

          const allowedProperties = element.matches('td, th')
            ? styleProperties
            : Array.from(allowedTextStyleProperties);
          for (const property of allowedProperties) {
            const value = styleRule.style.getPropertyValue(property).trim();
            if (value && isSafeStyleDeclaration(property, value)) {
              (element as HTMLElement).style.setProperty(property, value);
            }
          }
        }
      } else if (rule.type !== CSSRule.IMPORT_RULE) {
        const nestedRules = (rule as CSSGroupingRule).cssRules;
        if (nestedRules) {
          applyRules(nestedRules);
        }
      }
    });
  };

  root.ownerDocument.querySelectorAll('style').forEach((styleElement) => {
    const runtimeStyle = root.ownerDocument.createElement('style');
    runtimeStyle.textContent = styleElement.textContent;
    root.ownerDocument.head.appendChild(runtimeStyle);

    if (runtimeStyle.sheet?.cssRules) {
      applyRules(runtimeStyle.sheet.cssRules);
    }

    const cssText = styleElement.textContent ?? '';
    const fallbackRulePattern = /([^{}]+)\{([^{}]*)\}/g;
    let fallbackMatch = fallbackRulePattern.exec(cssText);
    while (fallbackMatch) {
      applyDeclarationText(fallbackMatch[1], fallbackMatch[2]);
      fallbackMatch = fallbackRulePattern.exec(cssText);
    }

    runtimeStyle.remove();
  });
}

export function normalizeClipboardHtmlForEditor(
  rawHtml: string | null | undefined,
): string {
  if (!rawHtml || !rawHtml.trim()) {
    return '';
  }

  const doc = new DOMParser().parseFromString(rawHtml, 'text/html');
  const root = doc.body;

  applyEmbeddedCellStyles(root);

  root
    .querySelectorAll('script,style,iframe,svg,object,embed,form,meta,link')
    .forEach((node) => node.remove());

  root.querySelectorAll('img').forEach((image) => {
    const src = image.getAttribute('src')?.trim() ?? '';
    if (!/^(?:https?:|\/)(?!\/)/i.test(src) && !/^https?:\/\//i.test(src)) {
      image.remove();
      return;
    }
    Array.from(image.attributes).forEach((attribute) => {
      if (
        !['src', 'alt', 'title', 'width', 'height'].includes(attribute.name)
      ) {
        image.removeAttribute(attribute.name);
      }
    });
    const width = normalizeImageDimension(image.getAttribute('width'));
    const height = normalizeImageDimension(image.getAttribute('height'));
    if (width) image.setAttribute('width', width);
    else image.removeAttribute('width');
    if (height) image.setAttribute('height', height);
    else image.removeAttribute('height');
  });

  const tables = Array.from(root.querySelectorAll('table')).filter(
    (table) => !table.parentElement?.closest('table'),
  );
  const normalizedTables = tables.map(normalizeClipboardTable).filter(Boolean);
  if (normalizedTables.length > 0) {
    return normalizedTables.join('');
  }

  const textCells = Array.from(root.querySelectorAll('td, th'));
  if (textCells.length > 0) {
    const rows = textCells
      .map((cell) => {
        const value = (cell.textContent ?? '')
          .replace(/\u00a0/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        return value ? value : '';
      })
      .filter(Boolean);

    if (rows.length > 0) {
      return rows.map((value) => `<p>${escapeHtml(value)}</p>`).join('');
    }
  }

  const plainTextCandidate = root.textContent ?? '';
  const normalizedText = plainTextCandidate
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' | ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!normalizedText) {
    return '';
  }

  normalizeLegacyClipboardFonts(root);
  normalizeClipboardBlockTextStyles(root);
  const normalizedHtml = sanitizeHtml(root.innerHTML, {
    preserveTextStyles: true,
  });
  if (normalizedHtml) {
    return normalizedHtml;
  }

  const blocks = normalizedText
    .split(/\n{2,}|\n/)
    .map((line) => line.replace(/\s+\|\s+/g, ' | ').trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');

  return blocks || `<p>${escapeHtml(normalizedText)}</p>`;
}

export function normalizeClipboardTextForEditor(rawText: string): string {
  return rawText
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, ' | ');
}

export function hasSpreadsheetClipboardContent(
  clipboardData: DataTransfer | null | undefined,
): boolean {
  if (!clipboardData) {
    return false;
  }

  const html = clipboardData.getData('text/html') ?? '';
  const text = clipboardData.getData('text/plain') ?? '';

  if (/<table\b/i.test(html)) {
    return true;
  }

  const normalizedText = text.replace(/\r\n?/g, '\n').trim();
  if (!normalizedText) {
    return false;
  }

  return normalizedText.includes('\t') && normalizedText.includes('\n');
}
