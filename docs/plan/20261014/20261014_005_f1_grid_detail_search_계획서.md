# F1-Grid 상세검색 연동 문서 계획서

## 목표

기존 `필터와 정렬` 포털 페이지에 `F1GridColumn.search` metadata를 공통 `PageSearchArea` 접이식 상세검색과 연결하는 개발자 가이드를 추가한다.

## 구현 원칙

- 필터/정렬 포털 페이지에 한 섹션을 추가하고 별도 메뉴나 신규 기능은 만들지 않는다.
- 실제 source contract를 따른다: `F1GridColumn.search` → `toPageSearchFields(columns)` → `PageSearchArea.detailFields`.
- 검색 폼 metadata와 실제 검색 조건/서버 조회 책임을 구분한다.
- 포털 문서 검색으로 상세검색 가이드를 찾고, 기존 공개 API 이름 검색 및 참조 항목 이동 동작을 보존한다.

## 작업 순서

1. [작업지시서](../../directions/20261014/20261014_005_f1_grid_detail_search_작업지시서.md), [상세 사양서](../../spec/20261014/20261014_005_f1_grid_detail_search_상세사양서.md), 승인 설계를 검토한다.
2. [f1-grid-docs.test.tsx](../../../frontend/tests/f1-grid-docs.test.tsx)에 실패 우선 테스트를 추가해 `filtering-sorting` 문서에 상세검색 연동 안내가 있고, metadata/지원 유형/조회 책임이 누락되지 않는지 검증한다.
3. 테스트를 먼저 실행해 문서 섹션이 없는 기존 상태에서 실패함을 확인한다.
4. [f1GridDocs.ts](../../../frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts)의 `필터와 정렬` 문서에 metadata 목록, 변환 흐름 예제, PageSearchArea 연결 및 날짜/select 입력 사례를 추가한다.
5. [f1GridApiReference.ts](../../../frontend/src/pages/f1-grid-docs/data/f1GridApiReference.ts)의 기존 `search` API 행과 타입은 유지하면서 설명에 `F1GridColumn.search` 표기를 추가해 해당 검색어로 직접 찾을 수 있게 하고, 새 가이드가 `toPageSearchFields` 검색으로 발견되는지 확인한다. 문서 본문은 인라인 API 앵커를 지원하지 않으므로 가짜 링크는 추가하지 않는다.
6. [F1-GRID.md](../../../frontend/src/pages/f1-grid-docs/F1-GRID.md)의 포털/상세검색 섹션을 갱신해 검색 필드 생성과 서버 조회 책임을 설명한다.
7. 관련 포털 테스트, 전체 프론트엔드 빌드를 실행하고 브라우저에서 필터/정렬 문서 및 API 항목 검색을 확인한다.
8. 결과 문서를 `docs/result/20261014/f1-grid-docs-overhaul`에 저장한다.

## 변경 파일

- `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts`
- `frontend/src/pages/f1-grid-docs/data/f1GridApiReference.ts` (기존 API 계약 설명을 보강해야 할 때만)
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- `frontend/tests/f1-grid-docs.test.tsx`
- `docs/result/20261014/f1-grid-docs-overhaul/20261014_005_f1_grid_detail_search_작업결과.md`
