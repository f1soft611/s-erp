// 협업공간 프론트 계약안. 백엔드 사양 단계에서 재확정한다.

export type WorkspaceLevel = 'read' | 'write' | 'admin';
import type { CommonViewMode } from '../../../../../shared/components/view-mode/commonViewTypes';

// 공통 보기 방식(칸반·피드·리스트·파일)을 그대로 쓴다.
export type WorkspaceViewMode = CommonViewMode;

export type WorkspaceUser = { id: string; name: string };

export type WorkspaceColumn = {
  id: string;
  name: string;
  /** 방 설정에서 정한 컬럼 색(#rrggbb). 없으면 기본 모양. 사용자별 색이 있으면 그쪽이 우선한다. */
  color?: string;
};

export type WorkspaceMember = { kind: 'user'; userId: string };

export type WorkspaceGroup = {
  id: string;
  name: string;
  members: WorkspaceMember[];
  level: WorkspaceLevel;
};

export type WorkspaceRoom = {
  id: string;
  name: string;
  defaultView: WorkspaceViewMode;
  columns: WorkspaceColumn[];
  groups: WorkspaceGroup[];
};

export type WorkspaceAttachment = {
  name: string;
  size: number;
  type: string;
  /** 1MB 이하 파일만 저장한다. 미리보기·내려받기에 쓰며, 없으면 파일 정보만 있는 첨부다. */
  dataUrl?: string;
};

export type WorkspaceComment = {
  id: string;
  authorId: string;
  /** 서식(HTML) 본문. 옛 일반 텍스트 값도 화면에서 문단으로 변환해 보여준다. */
  body: string;
  createdAt: string;
  replies: WorkspaceComment[];
  attachments?: WorkspaceAttachment[];
  /** 삭제된 댓글. 답글 구조를 유지하려고 본문·첨부를 비우고 표시만 남긴다. */
  deleted?: boolean;
};

export type WorkspacePost = {
  id: string;
  roomId: string;
  title: string;
  /** 서식(HTML) 본문. 옛 일반 텍스트 값도 화면에서 문단으로 변환해 보여준다. */
  body: string;
  authorId: string;
  createdAt: string;
  columnId: string | null;
  attachments: WorkspaceAttachment[];
  comments: WorkspaceComment[];
};

export type WorkspaceViewPrefs = {
  hiddenColumnIds: string[];
  collapsedColumnIds: string[];
  columnOrder: string[];
  /** 사용자별로 바꾼 컬럼 색(컬럼 id -> #rrggbb). 방 설정의 색보다 우선한다. */
  columnColors: Record<string, string>;
  onlyMine: boolean;
  keyword: string;
};

export type WorkspaceStore = { rooms: WorkspaceRoom[]; posts: WorkspacePost[] };
