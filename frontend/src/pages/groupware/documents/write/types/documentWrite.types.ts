import type {
  ModuleItem,
  PageContent,
} from '../../../../dashboard/types/dashboard';
import type { F1GridUserOption } from '../../../../../shared/components/f1-grid/types/grid.types';

export type DocumentKind = '기안서' | '업무연락' | '지출결의서' | '근태신청';
export type ApprovalStatus = '임시저장' | '결재대기' | '결재중' | '보완요청' | '완료';

export type DocumentApprovalStage = {
  id: number;
  kind: 'approval' | 'agreement';
  users: F1GridUserOption[];
  isFixed?: boolean;
};

export type DocumentWriteItem = {
  id: number;
  title: string;
  kind: DocumentKind;
  status: ApprovalStatus;
  author: string;
  date: string;
  summary: string;
  isPinned?: boolean;
};

export type DocumentWritePageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
};
