# F1-Grid 상세검색 연동 문서 작업결과

## 결과

문서 포털의 `필터와 정렬` 문서에 `F1GridColumn.search` 설정부터 `PageSearchArea.detailFields` 전달, 입력값 callback, 페이지 조회 책임까지 이어지는 상세검색 연동 가이드를 추가했다. 별도 메뉴를 추가하지 않았고 Grid 검색 동작이나 업무 페이지 코드는 변경하지 않았다.

`search.hidden`, `column.hidden`, `search.label/group/order/span`, `searchSpan` 기본값과 범위, 지원 입력 유형 및 미지원 유형의 `text` 변환, 날짜 `{ from, to }`, select `options`를 안내한다. `F1GridColumn.search` API 설명에도 검색 가능한 정확한 식별자를 포함해 포털 검색에서 API 행으로 이동할 수 있도록 했다.

## 변경 파일

- `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts`
- `frontend/src/pages/f1-grid-docs/data/f1GridApiReference.ts`
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- `frontend/tests/f1-grid-docs.test.tsx`
- `docs/plan/20261014/20261014_005_f1_grid_detail_search_계획서.md`

## 검증

- RED: 상세검색 섹션이 없는 상태에서 새 포털 문서 계약 테스트가 실패하는 것을 확인했다. API 상세 속성 검색도 기존 `F1GridColumn.search` 식별자로 API 행을 찾지 못하는 것을 확인했다.
- `npm run test -- tests/f1-grid-docs.test.tsx`: 통과, 27 tests.
- `npm run build`: 통과. 기존 번들 크기 경고가 남아 있으며, minify 후 1,000 kB를 넘는 청크가 있음을 알린다.
- Problems: 변경한 포털 데이터 및 테스트 파일에서 오류 없음.
- 브라우저: `toPageSearchFields` 검색으로 `필터와 정렬` 상세검색 섹션과 예제를 찾았고, `F1GridColumn.search` 검색 결과를 선택해 API 참조의 `search` 행으로 이동하는 것을 확인했다.
- 반응형: 1280px 데스크톱 및 375px 모바일에서 확인했다. 모바일 문서 너비가 뷰포트 너비와 같아 페이지 수준 가로 overflow가 없었다.
- 백엔드/API 동작 및 DB 변경은 작업 범위에 포함되지 않는다.

## 스크린샷

- 데스크톱: [f1-grid-detail-search-desktop.png](./screenshots/f1-grid-detail-search-desktop.png)
- 모바일: [f1-grid-detail-search-mobile.png](./screenshots/f1-grid-detail-search-mobile.png)
