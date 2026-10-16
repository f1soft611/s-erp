# F1-Grid 상세검색 연동 가이드 개편 작업결과

## 결과 요약

기존 `필터와 정렬` 문서의 긴 설명과 일반화된 부분 코드를 초심자도 순서대로 따라 할 수 있는 단계별 레시피로 개편했다. Grid 헤더 필터와 페이지 상세검색의 차이부터 컬럼 설정, `toPageSearchFields`, `PageSearchArea`, 페이지 조회조건, 실제 기안양식 검색 예제까지 설명한다.

기안양식 상세검색은 실제 구현과 동일하게 분류(`categoryItemId`), 등록주기(`regTermId`), 사용여부(`useAt`)를 다루며 양식코드/양식명은 별도 키워드 입력으로 설명한다. 날짜 범위는 일반적인 다른 화면의 예제로 분리했고, 현재 기안양식 화면에 날짜 필터가 있거나 확인되지 않은 서버 파라미터가 있다고 표현하지 않았다.

## 변경 파일

- [포털 문서 데이터](../../../../frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts) — 8개 순서형 섹션, 실제 업무 예제, 별도 날짜 범위 예제, 설정 빠른 참조 추가
- [포털 계약 테스트](../../../../frontend/tests/f1-grid-docs.test.tsx) — 섹션 순서, 실제 검색 키/값 변환, 메타데이터 및 날짜 예제 검증; 기존 `F1GridColumn.search` API 검색 회귀 보존
- [지속 상세검색 문서](../../../../frontend/src/pages/f1-grid-docs/F1-GRID.md) — 실제 계약과 API 책임, 포털 경로 반영
- [작업지시서](../../../directions/20261015/20261015_001_f1_grid_detail_search_guide_redesign_작업지시서.md)
- [계획서](../../../plan/20261015/20261015_001_f1_grid_detail_search_guide_redesign_계획서.md)
- [상세 사양서](../../../spec/20261015/20261015_001_f1_grid_detail_search_guide_redesign_상세사양서.md)

## 검증 결과

- RED: 새 섹션 순서 및 실제 검색 계약 테스트가 기존 문서에서 기대한 내용이 없어 실패하는 것을 확인했다.
- `npm run test -- tests/f1-grid-docs.test.tsx`: 통과, 28 tests.
- 초기 기준선 실행에서 기존 API 검색 회귀 테스트가 1회 5초 제한을 넘었으나, 동일 테스트 재실행과 최종 집중 테스트는 모두 통과했다.
- `npm run build`: TypeScript 및 Vite 빌드 통과. 기존 1,000 kB 청크 경고가 계속 표시되어 변경하지 않았다.
- Problems: 수정한 포털 데이터 및 테스트 파일에 오류 없음.
- `git diff --check`: 오류 없음.
- 브라우저: `toPageSearchFields` 검색으로 개편 가이드가 표시되고 제목 순서가 사양과 일치했다. `F1GridColumn.search` 검색으로 API 참조의 `search F1GridColumnSearchOptions` 행을 확인했다.
- 반응형 브라우저: 1280px, 768px, 375px에서 페이지 `scrollWidth`가 각 viewport `clientWidth`와 일치했고, 가이드 제목과 코드 블록이 viewport 경계를 넘지 않았다.
- 백엔드, API 계약, 데이터베이스 및 실제 업무 화면 런타임은 변경하지 않았다.

## 스크린샷

- 데스크톱: [f1-grid-detail-search-guide-desktop.png](./screenshots/f1-grid-detail-search-guide-desktop.png)
- 모바일: [f1-grid-detail-search-guide-mobile.png](./screenshots/f1-grid-detail-search-guide-mobile.png)

## 참고 설계

- [승인된 상세검색 가이드 개편 설계](../../../superpowers/specs/2026-10-15-f1-grid-detailed-search-guide-redesign.md)
