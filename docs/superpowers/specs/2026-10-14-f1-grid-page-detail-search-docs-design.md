# F1-Grid 페이지 상세검색 연동 문서 설계

## 목표

F1-Grid 문서 포털에서 컬럼 정의를 재사용해 페이지의 접이식 상세검색을 구성하는 방법을 개발자가 발견하고 적용할 수 있게 설명한다. 기존 기능/API를 문서화하는 작업이며 검색 기능 자체는 변경하지 않는다.

## 확인된 계약

- `F1GridColumn.search`는 `hidden`, `label`, `group`, `order`, `span` 메타데이터를 제공한다.
- `toPageSearchFields(columns)`는 `column.hidden` 또는 `search.hidden`인 컬럼을 제외하고, 검색 필드 레이블/유형/폭/그룹/선택 옵션을 변환한다.
- 지원 상세검색 입력 유형은 `text`, `number`, `decimal`, `currency`, `date`, `select`, `checkbox`다. 변환 대상 타입이 상세검색에서 지원되지 않으면 `text`로 처리한다.
- `PageSearchArea`는 접이식 상세검색 오버레이, 초안 값 변경, 날짜 from/to 값, 초기화 및 검색/닫기 callback을 제공한다.
- 필드 정의와 입력값으로 실제 조회 조건을 만들고 서버/API를 호출하는 것은 각 페이지의 책임이다. Grid 및 `toPageSearchFields`가 조회를 직접 수행하지 않는다.

## 문서 배치와 내용

- 기존 `필터와 정렬` 문서에 `페이지 상세검색 연동` 섹션을 추가한다. 메뉴 그룹과 문서 수는 변경하지 않는다.
- 컬럼 선언에서 `search` 메타데이터를 설정하고 `toPageSearchFields(columns)`를 `PageSearchArea.detailFields`로 전달하는 최소한의 예제를 제공한다.
- `search.label/group/order/span/hidden`, 컬럼 `type/options`, `column.hidden`의 역할을 표로 구분한다.
- 날짜 범위, select 옵션 등 실제 지원 입력 유형 예제를 포함한다.
- `onDetailValuesChange`, `onDetailSearch`, `detailValues`의 상태 흐름과 페이지 소유의 조회 조건 변환/서버 호출을 설명한다.
- 문서 검색 및 API 행 링크를 통해 `F1GridColumn.search`, `F1GridColumnSearchOptions`, `toPageSearchFields`, `PageSearchArea`에 도달할 수 있게 한다.

## 검증과 범위

- 관련 Vitest에서 포털의 `필터와 정렬` 문서가 필드 변환 연결, metadata 옵션, callback 책임 경계를 설명하는지 확인한다.
- 기존 공개 API 완전성 및 검색/필터 문서 동작 회귀를 유지하고 프론트엔드 빌드를 실행한다.
- 수정 범위는 포털 문서 데이터, 포털 테스트, `F1-GRID.md`, 날짜별 결과 문서 및 스크린샷이다. 검색 컴포넌트/유틸리티, 페이지 조회 흐름, Grid 런타임, 백엔드 및 DB는 수정하지 않는다.
