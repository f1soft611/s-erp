import type { WorkspaceStore, WorkspaceUser } from '../types/workspace.types';
import { SAMPLE_IMAGE_ASSEMBLY, SAMPLE_IMAGE_BLUEPRINT } from './workspaceSampleImages';

export const SAMPLE_USERS: WorkspaceUser[] = [
  { id: 'u1', name: '김민수' },
  { id: 'u2', name: '이서연' },
  { id: 'u3', name: '박지훈' },
  { id: 'u4', name: '최유리' },
  // 어느 방에도 속하지 않은 사용자(참여 중인 방이 없는 상태 확인용)
  { id: 'u5', name: '정하늘' },
];

export const getUserName = (userId: string): string =>
  SAMPLE_USERS.find((user) => user.id === userId)?.name ?? '알 수 없음';

const member = (userId: string) => ({ kind: 'user' as const, userId });

// 호출할 때마다 새 객체를 돌려줘 저장소가 샘플을 오염시키지 않게 한다.
export function createSampleStore(): WorkspaceStore {
  return {
    rooms: [
      {
        id: 'room-sales',
        name: '영업팀 협업',
        defaultView: 'kanban',
        columns: [
          { id: 'col-request', name: '요청' },
          { id: 'col-doing', name: '진행중' },
          { id: 'col-done', name: '완료' },
        ],
        groups: [
          { id: 'g-sales-admin', name: '영업 관리자', level: 'admin', members: [member('u1')] },
          { id: 'g-sales-team', name: '영업팀 전원', level: 'write', members: [member('u2'), member('u3')] },
          { id: 'g-sales-view', name: '타 부서(열람)', level: 'read', members: [member('u4')] },
        ],
      },
      {
        id: 'room-design',
        name: '설계도면 공유',
        defaultView: 'feed',
        columns: [],
        groups: [
          { id: 'g-design-admin', name: '설계 관리자', level: 'admin', members: [member('u2')] },
          { id: 'g-design-team', name: '설계팀', level: 'write', members: [member('u3'), member('u4')] },
        ],
      },
      {
        id: 'room-free',
        name: '전사 자유게시',
        defaultView: 'feed',
        columns: [],
        groups: [
          { id: 'g-free-admin', name: '운영자', level: 'admin', members: [member('u1')] },
          { id: 'g-free-all', name: '전 직원', level: 'write', members: [member('u2'), member('u3'), member('u4')] },
        ],
      },
    ],
    posts: [
      {
        id: 'post-1',
        roomId: 'room-sales',
        title: '견적 문의 - A사',
        body: '<p>A사에서 300EA 견적 요청이 들어왔습니다. 단가 기준 확인 부탁드립니다.</p>',
        authorId: 'u2',
        createdAt: '2026-11-25T17:40:00',
        columnId: 'col-request',
        attachments: [{ name: 'A사_견적요청.xlsx', size: 48210, type: 'application/vnd.ms-excel' }],
        comments: [
          { id: 'cm-1', authorId: 'u3', body: '<p>지난달 단가표 기준으로 산출해 보겠습니다.</p>', createdAt: '2026-11-25T18:05:00', replies: [] },
        ],
      },
      {
        id: 'post-2',
        roomId: 'room-sales',
        title: '계약서 검토',
        body: '<p>2차 초안을 올립니다. 3조 수정 부분 확인 부탁드립니다.</p>',
        authorId: 'u3',
        createdAt: '2026-11-26T09:12:00',
        columnId: 'col-doing',
        attachments: [{ name: '계약서_v2.pdf', size: 312400, type: 'application/pdf' }],
        comments: [
          {
            id: 'cm-2',
            authorId: 'u1',
            body: '<p>3조 확인했습니다. 단가 문구만 조정이 필요합니다.</p>',
            createdAt: '2026-11-26T09:40:00',
            replies: [
              { id: 'cm-3', authorId: 'u3', body: '<p>반영해서 v3 올리겠습니다.</p>', createdAt: '2026-11-26T09:55:00', replies: [] },
            ],
          },
        ],
      },
      {
        id: 'post-3',
        roomId: 'room-sales',
        title: '샘플 발송',
        body: '<p>B사 샘플 발송을 완료했습니다.</p>',
        authorId: 'u2',
        createdAt: '2026-11-24T14:20:00',
        columnId: 'col-done',
        attachments: [],
        comments: [],
      },
      {
        id: 'post-4',
        roomId: 'room-design',
        title: '조립도 Rev.C 공유',
        body: `<p>조립도 Rev.C 파일입니다. 변경 이력은 첨부 문서를 참고해 주세요.</p><p>변경된 체결부 위치는 아래 이미지와 같습니다.</p><p><img src="${SAMPLE_IMAGE_ASSEMBLY}" alt="체결부 위치"></p>`,
        authorId: 'u3',
        createdAt: '2026-11-25T11:00:00',
        columnId: null,
        attachments: [
          { name: '조립도_RevC.dwg', size: 1843200, type: 'application/acad' },
          { name: '도면_미리보기.png', size: 5200, type: 'image/png', dataUrl: SAMPLE_IMAGE_BLUEPRINT },
        ],
        comments: [],
      },
      {
        id: 'post-5',
        roomId: 'room-free',
        title: '점심 메뉴 추천 받습니다',
        body: '<p>이번 주 점심 어디가 좋을까요?</p>',
        authorId: 'u4',
        createdAt: '2026-11-26T11:20:00',
        columnId: null,
        attachments: [],
        comments: [],
      },
    ],
  };
}
