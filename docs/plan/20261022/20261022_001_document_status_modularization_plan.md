# 문서현황 소스 분리 Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan task-by-task in the current session. Preserve existing uncommitted work.

**Goal:** 문서현황의 동작을 유지하면서 페이지를 조립 중심으로 바꾼다.

**Architecture:** 기능 전용 컴포넌트와 검색/조회/상세 상태 훅을 분리한다. 검색 옵션은 컬럼과 입력 검증에서 공유하며 서비스는 응답 검증과 전송을 분리한다.

**Tech Stack:** React, TypeScript, MUI, F1-Grid, Vitest, Playwright.

## 근거

- [작업지시서](../../directions/20261022/20261022_001_document_status_modularization_work_instruction.md)
- 기존 문서작성 분리 지시서 및 문서현황 세션/전체조회 사양

## 1. 기준선 및 테스트

- [x] 기존 문서현황 페이지/서비스 테스트 결과를 기록한다. 기준선: 24개 중 2개 실패.
- [x] `frontend/tests/document-status-page.test.tsx`에서 기존 텍스트 문서번호 및 숨김 최종 변경일에 맞게 기대를 정렬한다. 제품 동작은 바꾸지 않는다.
- [x] `frontend/tests/document-status-search.test.ts`에 필터 매핑, 허용하지 않은 enum 제외, 날짜 범위 복제 및 손상된 세션 거부 테스트를 작성한다.
- [x] `frontend/tests/document-status-hooks.test.tsx`에 이전 요청 취소/늦은 응답 무시, 오류/재시도, 상세 편집 종료 갱신을 검증한다.
- [x] 추출 전 새 테스트의 import 실패를 확인한다.

## 2. 타입·정의·서비스 분리

기준 경로: `frontend/src/pages/groupware/documents/status/`.

- [x] `types/documentStatus.types.ts`는 행/검색 필터 도메인 계약을 유지한다.
- [x] `types/documentStatusSearch.types.ts`에 검색 값과 세션 snapshot을 둔다.
- [x] `types/documentStatusPage.types.ts`에 페이지 props를 둔다.
- [x] `types/documentStatusApi.types.ts`에 응답 및 조회 결과를 둔다.
- [x] `data/documentStatusOptions.ts`에 옵션, 라벨, 색상과 enum 검증에 쓰는 집합을 모은다.
- [x] `data/documentStatusColumns.tsx`로 컬럼 팩터리를 옮긴다. 그리드의 기존 팩터리 export는 호환을 위해 유지한다.
- [x] `services/documentStatusSearch.ts`에 현재 필터 변환/검색 값 복제/세션 검증 함수를 그대로 옮긴다.
- [x] `services/documentStatusResponse.ts`에 현재 응답 검증/날짜 정규화를 옮긴다.
- [x] `services/documentStatus.service.ts`는 기존 전체조회/페이징 함수와 쿼리 직렬화를 유지하며 공통 응답 검증을 호출한다.

## 3. 훅 및 UI 분리

- [x] `hooks/useDocumentStatusSearch.ts`: 날짜 기본값 대기, 세션 복원/저장, 미적용 입력과 적용 필터 구분, 초기화.
- [x] `hooks/useDocumentStatusList.ts`: 전체조회, 로딩/오류/건수, AbortController, 취소 요청 결과 무시, 재시도.
- [x] `hooks/useDocumentStatusDetail.ts`: 선택 ID 검증, 상세 열기/닫기, 편집, 상세 갱신. 목록 갱신과의 연결은 페이지에서 담당하여 훅의 순환 의존을 방지한다.
- [x] `components/DocumentStatusSearchArea.tsx`: 기존 검색 마크업과 이벤트 연결.
- [x] `components/EmptyDocumentStatus.tsx`: 기존 빈 결과 안내와 초기화 버튼.
- [x] `components/DocumentStatusDetail.tsx`: 기존 상세 오버레이와 작성 다이얼로그 조립.
- [x] `components/DocumentStatusGrid.tsx`: F1Grid 연결만 유지.
- [x] `DocumentStatusPage.tsx`: 훅을 연결하고 헤더, 검색, 오류/재시도, 그리드/빈 결과, 상세 UI를 조립.

## 4. 검증과 기록

프론트엔드 폴더에서 실행:

```powershell
npm run test -- tests\document-status-page.test.tsx tests\document-status-service.test.ts tests\document-status-search.test.ts tests\document-status-hooks.test.tsx
npm run build
```

- [x] 테스트가 모두 성공하고 기존 전체조회/로컬 정렬·필터의 요청 횟수 검증을 유지한다.
- [x] 기존 4173 서버는 확인 후 재사용한다. 직접 시작하면 strictPort를 사용하고 종료 후 포트 해제를 확인한다.
- [x] 합성 데이터 브라우저 검증으로 375/768/1280px 렌더링, 상세검색, 상세/닫기, 오버플로를 확인한다. 실제 계정/테넌트 데이터는 결과에 남기지 않는다.
- [x] 결과 문서에 분리 구조, 기준선 실패의 테스트 정합성 조정, 검증 결과와 스크린샷을 남긴다.
- [x] 자체 diff 검토로 API/DB/공통 그리드 동작 변경 및 기존 변경 손실이 없는지 확인한다. 커밋은 요청하지 않았으므로 생성하지 않는다.
