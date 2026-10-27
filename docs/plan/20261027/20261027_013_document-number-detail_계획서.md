# 문서현황 문서번호 상세 진입 구현 계획

근거: [작업지시서](../../directions/20261027/20261027_013_document-number-detail_작업지시서.md).

**목표:** 행 선택과 상세 진입을 분리하고 문서번호 링크로만 기존 상세를 연다.

**설계:** 공통 F1-Grid를 수정하지 않고 수주현황의 `Link component="button"` 패턴을 사용한다. 선택 배열을 상세 ID로 바꾸는 콜백 대신 문서 행을 받는 `onOpenDocument`를 연결한다.

**기술:** React, TypeScript, MUI, Vitest, Playwright.

## 구현 순서

1. `frontend/tests/document-status-page.test.tsx`에서 일반 셀/키보드 선택은 상세를 열지 않고 문서번호만 상세를 여는 회귀 테스트를 작성한다. 기존 상세 편집 테스트의 진입점도 링크로 변경한다.
2. `npm run test -- tests/document-status-page.test.tsx`로 실패를 확인한다.
3. `documentStatusColumns.tsx`에 선택적 `onOpenDocument` 옵션과 이벤트 전파를 막는 버튼형 링크를 추가한다. 검색 메타데이터 생성 시 옵션 없는 호출은 유지한다.
4. `DocumentStatusGrid.tsx`에서 콜백별 컬럼을 메모이제이션하고 선택 이벤트와 상세 연결을 제거한다.
5. `useDocumentStatusDetail.ts`에 행을 받는 명시적 상세 콜백을 만들고 `DocumentStatusPage.tsx`에서 전달한다. 양의 안전한 정수 ID 검증은 유지한다.
6. 대상 테스트, `npm run build`, 변경 파일의 `npm run lint -- ...`를 실행한다.
7. 합성 데이터만 사용한 Chromium에서 4173 서버로 문서번호/일반 셀/닫기·재열기와 375/768/1280px 가로 넘침을 확인하고 스크린샷 및 결과를 기록한다.

## 선택 근거

행 선택 콜백에서 클릭 대상을 추론하는 방법은 키보드 선택과 상세가 계속 결합된다. 공통 그리드 이벤트를 추가하는 방법은 불필요하게 영향 범위를 넓힌다. 기존 수주현황의 컬럼 링크 방식을 재사용하는 것이 최소 변경이다.
