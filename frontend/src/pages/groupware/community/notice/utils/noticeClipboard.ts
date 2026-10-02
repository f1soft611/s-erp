const allowedCellStyleProperties = new Set([
  'background',
  'background-color',
  'border',
  'border-bottom',
  'border-left',
  'border-right',
  'border-top',
  'color',
  'font-weight',
  'height',
  'text-align',
  'vertical-align',
  'width',
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

function sanitizeCellStyle(cell: Element): string | null {
  const declarations: string[] = [];
  const style = (cell as HTMLElement).style;

  for (const property of allowedCellStyleProperties) {
    const value = style.getPropertyValue(property).trim();
    if (!value || !isSafeCellStyleValue(value)) {
      continue;
    }

    const normalizedValue =
      property === 'width' || property === 'height'
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

function applyEmbeddedCellStyles(root: HTMLElement): void {
  const cells = Array.from(root.querySelectorAll('th, td'));
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
          isSafeCellStyleValue(value),
      );

    for (const selector of selectorText.split(',')) {
      for (const cell of cells) {
        try {
          if (!cell.matches(selector.trim())) {
            continue;
          }
        } catch {
          continue;
        }

        for (const [property, value] of declarations) {
          (cell as HTMLElement).style.setProperty(property, value);
        }
      }
    }
  };

  const applyRules = (rules: CSSRuleList): void => {
    Array.from(rules).forEach((rule) => {
      if (rule.type === CSSRule.STYLE_RULE) {
        const styleRule = rule as CSSStyleRule;
        for (const cell of cells) {
          try {
            if (!cell.matches(styleRule.selectorText)) {
              continue;
            }
          } catch {
            continue;
          }

          for (const property of styleProperties) {
            const value = styleRule.style.getPropertyValue(property).trim();
            if (value && isSafeCellStyleValue(value)) {
              (cell as HTMLElement).style.setProperty(property, value);
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

  const tableRows = Array.from(root.querySelectorAll('tr'));
  if (tableRows.length > 0) {
    const rows = tableRows
      .map((row) => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        if (cells.length === 0) {
          return '';
        }

        const normalizedCells = cells.map((cell) => {
          const value = (cell.textContent ?? '')
            .replace(/\u00a0/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          const tagName = cell.tagName.toLowerCase() === 'th' ? 'th' : 'td';
          const colspan = Math.max(
            1,
            Number(cell.getAttribute('colspan')) || 1,
          );
          const rowspan = Math.max(
            1,
            Number(cell.getAttribute('rowspan')) || 1,
          );
          const spanAttributes = [
            colspan > 1 ? ` colspan="${colspan}"` : '',
            rowspan > 1 ? ` rowspan="${rowspan}"` : '',
          ].join('');
          const style = sanitizeCellStyle(cell);
          const styleAttribute = style ? ` style="${escapeHtml(style)}"` : '';

          return `<${tagName}${spanAttributes}${styleAttribute}>${escapeHtml(value)}</${tagName}>`;
        });

        return `<tr>${normalizedCells.join('')}</tr>`;
      })
      .filter((row) => row !== '');

    if (rows.length > 0) {
      return `<table><tbody>${rows.join('')}</tbody></table>`;
    }
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