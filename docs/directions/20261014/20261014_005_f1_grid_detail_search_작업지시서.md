# F1-Grid 상세검색 연동 문서 작업지시서

## 배경

F1-Grid의 컬럼 검색 메타데이터와 공통 `PageSearchArea`를 연결해 접이식 상세검색을 만드는 기능은 구현되어 있고 [F1-GRID.md](../../../frontend/src/pages/f1-grid-docs/F1-GRID.md)에 개별 참고 내용이 있지만, 문서 포털의 기능 가이드에서는 찾기 어렵다.

## 목표

- 포털의 기존 `필터와 정렬` 가이드에서 페이지 상세검색 연동 절차를 발견할 수 있게 한다.
- `F1GridColumn.search` → `toPageSearchFields(columns)` → `PageSearchArea.detailFields` 데이터 흐름을 예제로 설명한다.
- 검색 표시 메타데이터, 지원 입력 타입 및 기본 검색값/상세 조건 전달 책임을 정확히 구분한다.

## 범위 및 제약

- 변경 범위: F1-Grid 문서 포털 데이터, 관련 포털 테스트, `F1-GRID.md`, 날짜별 결과 문서 및 스크린샷.
- 기존 `필터와 정렬` 문서에 상세검색 섹션을 추가한다. 새 메뉴 그룹이나 별도 문서 페이지를 만들지 않는다.
- 기존 공개 API 참조의 `F1GridColumn.search` 및 `F1GridColumnSearchOptions` 항목을 유지한다.
- `PageSearchArea`, `toPageSearchFields`, Grid 런타임과 업무 페이지 코드는 수정하지 않는다.
- Grid 또는 변환 helper가 조회 API를 호출한다고 설명하지 않는다. 조회 조건 구성과 서버/API 호출은 업무 페이지가 소유한다.

## 완료 기준

- 포털 `필터와 정렬` 문서에 검색 metadata 설정, 필드 변환, 상세 폼 전달, 값/검색 callback 흐름이 표시된다.
- 날짜 범위와 select/options 사용을 설명하고 `hidden`, `label`, `group`, `order`, `span` 설정을 구분한다.
- 상세검색 입력 지원 타입과 미지원 Grid 타입의 text 변환 동작을 구현에 맞게 안내한다.
- 포털 회귀 테스트와 프론트엔드 빌드가 통과한다.
- 문서 포털 브라우저에서 상세검색 섹션과 API 검색 가능성을 확인하고 결과 문서를 저장한다.
