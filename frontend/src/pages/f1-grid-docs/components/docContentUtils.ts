function slug(value: string) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function getDocSectionId(docId: string, heading: string) {
  return `section-${slug(docId)}-${slug(heading)}`;
}

export function getDocApiRowId(heading: string, name: string) {
  return `api-${slug(heading)}-${slug(name)}`;
}
