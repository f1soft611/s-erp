# 상세 사양서

## 기능 요구사항

### 1. 기본 동작

- `F1Grid`와 `F1Tree`는 기본적으로 셀 편집을 수행하지 않는다.
- 에디터 플러그인이 등록되어 있을 때만 편집을 시작할 수 있다.
- 기존 기본 문자열/숫자/날짜 에디터는 별도 플러그인으로 분리하여 공통 그리드 엔진과 분리한다.
- 메뉴 관리 페이지는 `editorPlugins` 기반으로 `name`, `code`, `path`, `description`에 에디터를 연결한다.

### 2. 플러그인 모델

- `F1GridEditorPlugin` 같은 인터페이스를 정의한다.
- 플러그인은 `canEdit`, `createEditor`, `startEdit`, `endEdit` 등 최소 동작을 제공한다.
- 플러그인은 행/컬럼/값 정보를 받아 편집 가능 여부를 판단한다.
- 메뉴 관리 페이지의 플러그인은 `row.id`가 기존 저장 row인지 여부를 확인해 `code` 편집 여부를 분기한다.

### 3. 이벤트 훅

- 에디터 시작 전 이벤트: `onBeforeEdit` / `beforeEdit`
- 에디터 시작 후 이벤트: `onAfterEdit` / `afterEdit`
- 이벤트는 개발자가 커스텀 로직을 연결할 수 있도록 콜백 배열 또는 단일 콜백으로 제공한다.
- 이벤트는 물리적 편집 실제 시작 직전에/직후 호출되며, `cancel` 또는 `preventDefault` 패턴을 지원해 편집 차단을 허용한다.
- 메뉴 관리 페이지에서는 `beforeEdit`에서 기존 저장 row의 `code` 필드 수정 시 `false`를 반환해 편집을 차단한다.

### 4. 공통 계약

- `F1GridProps`와 `F1TreeProps`에 `editors` 또는 `editorPlugins` 옵션을 추가한다.
- 플러그인이 없으면 무조건 편집을 막는다.
- 플러그인 기반 에디터는 기존 `CellEditor` 호출 구조를 대체한다.
- `beforeEdit`는 `{ row, rowId, column, field, value, defaultValue }` 컨텍스트를 전달하며, 메뉴 관리 row의 `field === 'code'`와 기존 row 여부를 기준으로 접근을 제한한다.

### 5. 메뉴 관리 페이지 적용 규칙

- 저장된 row는 `menuCode`/`code` 필드를 읽기 전용으로 처리한다.
- 신규 생성 row는 `code`를 입력 가능하도록 허용한다.
- `name`, `path`, `description`은 저장 여부와 무관하게 편집 가능하다.
- `beforeEdit` 제약 조건은 `code`와 `row.id` 패턴(`new-*` 또는 `null` 등)으로 기존/신규 row를 구분해 적용한다.

## 구현 규칙

- 기존 inline editor 로직은 `CellEditor`의 분기보다 바깥 범위에서 플러그인으로 관리한다.
- 트리와 그리드 모두 동일한 공통 이벤트/플러그인 인터페이스를 사용한다.
- 옵션이 없으면 기본 동작은 읽기 전용이며, 편집 이벤트는 호출하지 않는다.
- 메뉴 관리 페이지는 `beforeEdit`를 통해 저장된 row의 `code` 변경을 막고, 그 외 필드는 일반 플러그인으로 편집 가능하게 한다.

## 검증 기준

- 플러그인 없을 때는 셀 편집이 시작되지 않는다.
- 플러그인 추가 시 편집이 가능하다.
- `onBeforeEdit` / `onAfterEdit` 콜백이 호출된다.
- 기존 저장 row의 `code` 수정 시도는 `beforeEdit`에서 차단된다.
- 신규 row의 `code`는 편집 가능하다.
- F1Grid 테스트와 메뉴 관리 테스트, 문서 테스트가 모두 통과한다.
