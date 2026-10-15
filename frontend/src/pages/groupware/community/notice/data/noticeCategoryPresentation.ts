export type NoticeCategoryPresentation = {
  backgroundColor: string;
  color: string;
};

const lightFallback: NoticeCategoryPresentation = {
  backgroundColor: '#dbeafe',
  color: '#2563eb',
};

const darkFallback: NoticeCategoryPresentation = {
  backgroundColor: 'rgba(59,130,246,0.18)',
  color: '#2563eb',
};

export function getNoticeCategoryPresentation(
  noticeGubunCode: string | null | undefined,
  isDark: boolean,
): NoticeCategoryPresentation {
  const normalizedCode = noticeGubunCode?.trim();

  if (!normalizedCode) {
    return isDark ? darkFallback : lightFallback;
  }

  let hash = 0;
  for (const character of normalizedCode) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined) {
      hash = (hash * 31 + codePoint) >>> 0;
    }
  }

  const hue = hash % 360;
  return {
    backgroundColor: isDark
      ? `hsl(${hue} 55% 24%)`
      : `hsl(${hue} 75% 92%)`,
    color: isDark ? `hsl(${hue} 80% 84%)` : `hsl(${hue} 65% 30%)`,
  };
}
