# 상태 배지 색상 및 프로젝트 모서리 통일 계획서

**Goal:** 문서/공지 상태 배지의 의미 색상과 모서리를 통일하고 프런트엔드 직각형 UI의 모서리 반경을 6px로 정규화한다.

**Architecture:** 기존 문서 프레젠테이션 메타데이터와 공지 분류 배지 컴포넌트를 유지하면서 배지 색상/모양만 정리한다. MUI 테마의 기존 6px shape 값을 공통 기준으로 삼고 모든 명시적 radius도 같은 값으로 맞춘다. 원형 요소와 의도적인 0px 경계는 예외로 보존한다.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Vite.

## 기준 문서

- [작업지시서](../../directions/20261110/20261110_005_status_badge_radius_작업지시서.md)
- [문서 표시 메타데이터](../../spec/20261014/20261014_008_문서결재취소_상태구분표시통일_상세사양서.md)
- [공지 구분 배지 작업지시서](../../directions/20261015/20261015_012_공지분류_문서구분_스타일_통일_작업지시서.md)

## 영향 범위

- `frontend/src/pages/groupware/documents/write/data/documentPresentation.ts`: 상태·업무 구분 semantic color 및 variant.
- `frontend/src/shared/components/PageMessageArea.tsx`: 정보성 메시지 배경을 페이지 캔버스와 구별되도록 조정.
- `frontend/src/pages/groupware/documents/status/data/documentStatusColumns.tsx`: 문서현황 상태 배지를 공통 결재 표시 메타데이터에 연결.
- `frontend/src/pages/sales/order/status/SalesOrderStatusPage.tsx`: 검색 결과 안내와 목록 사이의 중복 수직 여백을 제거.
- `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`: 문서 상태/구분 배지 반경.
- `frontend/src/pages/groupware/documents/write/components/ApprovalNoticePanel.tsx`: 결재 알림 상태 배지 반경.
- `frontend/src/pages/groupware/community/notice/components/NoticeCategoryBadge.tsx`: outlined 공지 구분 배지, 대비 및 기존 코드별 색상 유지.
- `frontend/src/theme/theme.ts` 및 `frontend/src/**/*.{tsx,ts,css}`: 전역 6px 모서리 기준과 명시적 모서리 값 정규화. 원형 및 0px는 예외.
- `frontend/tests/document-presentation.test.ts`, 관련 배지 테스트: 의미 색상/variant/반경 및 기존 동작 회귀 확인.
- 날짜별 작업지시서, 상세사양서, 결과 보고서 및 합성 데이터 스크린샷.

## 구현 단계

### Task 1: 상태 의미 색상 테스트

- 문서 상태별 라벨/색상/variant와 문서 유형별 의미 색상 기대값을 갱신한다.
- 업무 유형 `BUSINESS_CONTACT`가 초록 의미 색상을 사용하고, DRAFT가 중립 채움 배지인지 확인한다.
- 테스트를 단독 실행해 새 기대값에서 먼저 실패하는지 확인한다.

### Task 2: 상태/구분 배지 스타일 구현

- `documentPresentation.ts`의 canonical 상태·구분 메타데이터를 갱신한다.
- 문서 결재 상세, 결재 알림, 공지 분류 Chip의 모서리를 6px로 맞춘다.
- 공지 분류 코드 색상 계산과 라벨은 보존하고 outlined 표시 및 다크모드 대비를 확인한다.
- 상태·배지 관련 Vitest를 실행한다.

### Task 3: 프런트엔드 radius 정규화

- `frontend/src` 내 명시적 `borderRadius`/`border-radius` 값을 확인한다.
- 직각형 모서리는 MUI 6px 기준(`1.5` theme spacing 또는 `6px`)으로 통일한다.
- `50%` 원형 요소와 `0` 경계는 유지하고, 원형이 아닌 pill 및 부분 코너도 각 코너가 6px 기준을 사용하게 정규화한다.
- diff에서 반경 변경 외 동작/색상 변경이 포함되지 않았는지 확인한다.

### Task 4: 검증 및 결과 기록

- 집중 Vitest와 프런트엔드 build를 실행한다.
- 브라우저에서 문서/공지 배지와 대표 공통 UI를 375px, 768px, 1280px로 확인한다.
- 합성 데이터 스크린샷과 실제 검증 결과를 `docs/result/20261110/status-badge-radius/`에 기록한다.
- `git diff --check`로 공백 오류를 확인한다.

## 비범위

- API, 데이터 계약, 상태 전이, 공지 분류 코드/명칭, 백엔드 및 DB
- 원형 아바타/아이콘과 의도적으로 각진 경계
- 배지 외 색상 체계나 레이아웃 변경
