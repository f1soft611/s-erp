import type { F1GridColumn } from '../../../../shared/components/f1-grid';
import { PROCESS_FLAG_COLUMNS, type ProcessRow } from '../types/processManagement.types';

type ColumnOptions = {
  nameHeader: string;
  /** 이름·설명·미사용을 편집할 수 있는 행. */
  canEditText: (row: ProcessRow) => boolean;
  /** 이미지와 공정 속성을 편집할 수 있는 행. 작업장 트리의 연결 행은 읽기 전용이다. */
  canEditProcess: (row: ProcessRow) => boolean;
};

/** 작업장 트리와 공정 설정 모달이 공유하는 공정 컬럼. */
export function createProcessColumns({ nameHeader, canEditText, canEditProcess }: ColumnOptions): F1GridColumn<ProcessRow>[] {
  return [
    { field: 'name', headerName: nameHeader, width: 220, editable: canEditText, required: true,
      validate: (value) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 100 ? true : '이름은 1~100자로 입력해 주세요.' },
    { field: 'description', headerName: '설명', width: 180, editable: canEditText },
    { field: 'image', headerName: '공정 이미지', type: 'image', width: 90, align: 'center',
      editable: canEditProcess,
      renderCell: ({ row }) => row.id.startsWith('g:') ? null : undefined },
    ...PROCESS_FLAG_COLUMNS.map(([field, headerName]): F1GridColumn<ProcessRow> => ({
      field, headerName, type: 'checkbox', width: 100, align: 'center', editable: canEditProcess, syncWithTreeCheckbox: false,
    })),
    { field: 'inactive', headerName: '미사용', type: 'checkbox', width: 80, align: 'center', editable: canEditText, syncWithTreeCheckbox: false },
  ];
}
