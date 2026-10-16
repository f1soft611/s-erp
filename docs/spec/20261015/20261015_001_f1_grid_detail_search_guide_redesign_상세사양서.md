# F1-Grid 상세검색 연동 가이드 개편 상세 사양서

## 포털 정보 구조

`필터와 정렬` 문서의 기존 `PageSearchArea 상세검색 연동` 설명과 일반화된 예제를 다음 순서의 명확한 섹션으로 바꾼다.

1. `상세검색은 이렇게 연결됩니다`
2. `1단계: 검색할 컬럼 고르기`
3. `2단계: 검색 필드 만들기`
4. `3단계: 검색 영역에 연결하기`
5. `4단계: 조회 조건으로 바꾸기`
6. `전체 예제: 기안양식 검색`
7. `날짜 범위 조건이 필요한 경우`
8. `빠른 참조: 설정과 주의점`

기존 `prose`, `code`, `api` 섹션 유형만 사용한다. 상세검색 폼 가이드와 Grid 헤더 필터 동작은 서로 다른 기능임을 첫 단계에서 설명한다.

## 검색 컬럼 및 필드 변환 계약

- 기안양식 상세검색 필드는 분류 `categoryItemId`, 등록주기 `regTermId`, 사용여부 `useAt`이다.
- 분류/등록주기 옵션은 코드 항목으로부터 숫자 `value`와 항목명 `label`을 만든다. 사용여부 옵션 값은 `'Y'`와 `'N'`이다.
- 양식코드 `cataTypeCode`와 양식명 `codeName`은 `search.hidden: true`로 상세검색에서 제외한다. 양식코드·양식명 검색은 기본 검색 입력이 담당한다.
- `toPageSearchFields(columns)`는 UI 설정(`field`, `label`, `type`, `searchSpan`, 선택적 `group`/`options`)을 만든다. `column.hidden` 또는 `search.hidden`은 제외되며, 레이블은 `search.label` 또는 `headerName`, 지원하지 않는 타입은 `text` fallback을 쓴다.
- `search.order`는 검색 순서를 정한다. `search.span`은 `searchSpan`으로 전달되고 기본값은 1, 지원 범위는 1~5이다. `form.span`과 무관하다.
- 지원 검색 타입은 `text`, `number`, `decimal`, `currency`, `date`, `select`, `checkbox`이다.

## PageSearchArea 및 페이지 책임

- `detailFields`는 변환된 필드 정의, `detailValues`는 페이지가 보관하는 입력값, `onDetailValuesChange`는 입력값 갱신 callback, `onDetailSearch`는 상세검색 실행 callback이다.
- 기본 검색 키워드는 별도 입력/상태를 사용하고 상세조건과 함께 적용하려면 페이지가 직접 합친다.
- 상세검색 시 분류와 등록주기 값은 `Number(...)`로 변환한다. `useAt`은 `'Y' | 'N'`에 해당하는 경우에만 적용한다.
- 실제 페이지 흐름은 미저장 Grid 변경이 있으면 확인을 거쳐 변경을 버리고 조회조건을 적용한다. 페이지/management hook/service가 목록 API, 로딩, 오류 표시를 담당하며 F1-Grid 및 `toPageSearchFields`는 API 요청을 수행하지 않는다.

## 날짜 범위 확장 예제

일반 페이지에서 사용할 수 있는 `type: 'date'` 및 `search.span` 예제로 `detailValues.createdAt` 형태 `{ from: '2026-01-01', to: '2026-01-31' }`를 보여준다. 이는 현재 기안양식 화면의 검색 필드가 아니다. 서버로 전달할 파라미터명이나 기간 검색 의미는 문서에서 지정하지 않는다.

## 테스트 및 수용 기준

- 위 8개 제목과 순서가 테스트된다.
- 전체 예제에 실제 3개 상세검색 키와 기본 키워드, 값 변환, 미저장 변경 확인 흐름이 드러난다.
- 문서가 검색 입력 state/callback, 변환 helper, 조회 요청 및 오류/로딩 책임을 혼동하지 않는다.
- 날짜 범위는 실제 기안양식 계약과 구분된다.
- 빠른 참조는 숨김 규칙, 옵션, 타입, 기본값, `searchSpan`과 `form.span` 구분, Grid 헤더 필터와 상세검색 구분을 명시한다.
- 기존 API 이름 검색이 `F1GridColumn.search` API 행을 계속 표시한다.
- 포털 집중 테스트 및 빌드가 통과하고, 데스크톱/태블릿/모바일 브라우저 검증과 결과 스크린샷이 기록된다.

## 제외 범위

런타임 코드, 공통 검색 컴포넌트, 실제 기안양식 화면, API/서버/DB 계약은 변경하지 않는다. 기안양식 화면에 날짜 조건을 추가하지 않는다.

## 관련 문서

- [작업지시서](../../directions/20261015/20261015_001_f1_grid_detail_search_guide_redesign_작업지시서.md)
- [계획서](../../plan/20261015/20261015_001_f1_grid_detail_search_guide_redesign_계획서.md)
- [승인 설계](../../superpowers/specs/2026-10-15-f1-grid-detailed-search-guide-redesign.md)
