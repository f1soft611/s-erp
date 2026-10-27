export type ClassificationKind = 'item' | 'partner';

export interface Classification {
  id: number;
  name: string;
  level: number;
  parentId: number | null;
  sortSeq: number;
  useAt: 'Y' | 'N';
}

export interface ClassificationSavePayload {
  name: string;
  parentId?: number | null;
  sortSeq?: number;
  useAt?: 'Y' | 'N';
}
