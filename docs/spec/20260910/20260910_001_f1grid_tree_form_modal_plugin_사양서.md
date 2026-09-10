# F1-Grid/F1-Tree 행 폼 모달 플러그인 상세 사양서

## 작업 근거

- 작업지시서: [20260910*001_f1grid_tree_form_modal_plugin*작업지시서.md](../../directions/20260910/20260910_001_f1grid_tree_form_modal_plugin_작업지시서.md)
- 계획서: [20260910*001_f1grid_tree_form_modal_plugin*계획서.md](../../plan/20260910/20260910_001_f1grid_tree_form_modal_plugin_계획서.md)

## 1. 기능 개요

행 폼 모달은 F1-Grid/F1-Tree의 선택적 프론트엔드 플러그인이다. `rowFormPlugin`이 활성화된 인스턴스만 자동 액션 열과 신규·수정 모달을 제공하며, 등록되지 않은 인스턴스는 기존 인라인 셀 편집과 행 추가 동작을 유지한다.

모달은 컬럼 정의를 폼 스키마의 단일 근거로 사용한다. `headerGroup`은 섹션, `headerName`은 라벨, `type`은 입력 종류로 변환하고 컬럼별 `form` 설정으로 필요한 항목만 재정의한다.

## 2. 공개 타입 계약

### 2.1 모달 모드와 컬럼 폼 옵션

```ts
export type F1GridFormMode = 'create' | 'edit';

export type F1GridColumnFormOptions<T extends object> = {
  hidden?: boolean;
  readOnly?: boolean | ((row: T, mode: F1GridFormMode) => boolean);
  label?: string;
  group?: string;
  order?: number;
  span?: 1 | 2 | 3;
};
```

- `hidden`: `true`이면 모달 폼에서 제외한다. `false`이면 `column.hidden`이 `true`여도 폼에 표시한다.
- `readOnly`: 입력을 잠그되 값과 라벨은 표시한다. 함수인 경우 현재 draft와 모드를 전달한다.
- `label`: 없으면 `headerName`을 사용한다.
- `group`: 없으면 `headerGroup`, 둘 다 없으면 `기본 정보`를 사용한다.
- `order`: 같은 모달 전체에서 작은 값부터 정렬한다. 없으면 컬럼 선언 인덱스를 사용한다.
- `span`: 데스크톱 3열 기준 점유 칸 수이며 기본값은 `1`이다. 태블릿·모바일에서는 가용 열 수를 넘지 않게 제한한다.

`F1GridColumn<T>`에 다음 속성을 추가한다.

```ts
form?: F1GridColumnFormOptions<T>;
```

### 2.2 플러그인 계약

```ts
export type F1GridRowFormContext<T extends object> = {
  mode: F1GridFormMode;
  row: T;
};

export type F1GridRowFormApplyContext<T extends object> = {
  mode: F1GridFormMode;
  originalRow?: T;
  draftRow: T;
};

export type F1GridRowFormPlugin<T extends object> = {
  id?: string;
  enabled?: boolean;
  getTitle?: (context: F1GridRowFormContext<T>) => string;
  getDescription?: (context: F1GridRowFormContext<T>) => string;
  onBeforeApply?: (context: F1GridRowFormApplyContext<T>) => boolean | void;
};
```

`F1GridProps<T>`에 다음 속성을 추가한다.

```ts
rowFormPlugin?: F1GridRowFormPlugin<T>;
```

- `enabled` 기본값은 `true`이다.
- prop이 없거나 `enabled === false`이면 액션 열과 모달 로직을 생성하지 않는다.
- `getTitle` 기본값은 신규 모드 `신규 등록`, 수정 모드 `정보 수정`이다.
- `getDescription`이 없으면 수정 모드에서 `rowKey` 값을 대상 식별 정보로 표시하고 신규 모드에서는 설명을 생략한다.
- `onBeforeApply`가 `false`를 반환하면 상태 반영을 중단하고 모달을 유지한다.
- 플러그인은 API 호출이나 서버 저장을 담당하지 않는다.

### 2.3 기존 Ref 계약

- `F1GridRef.addRow(partial?)`는 플러그인이 비활성일 때 기존처럼 즉시 행을 추가한다.
- 플러그인이 활성일 때는 `createRow()`와 `partial`을 합친 draft로 신규 모달을 연다.
- `F1TreeRef.addChildRow(parentId, partial?)`는 활성 플러그인에서 `parentKey: parentId`가 포함된 draft를 열고, 적용 시에만 자식 행을 추가한다.
- 기존 Ref 시그니처는 변경하지 않는다.

## 3. 자동 폼 모델 생성

### 3.1 포함 및 제외

다음 컬럼은 기본적으로 폼에 포함한다.

- `type`이 `text`, `number`, `decimal`, `currency`, `checkbox`, `date`, `datetime`, `time`, `select`, `autocomplete`, `code`이거나 생략된 일반 데이터 컬럼

다음 컬럼은 기본적으로 제외한다.

- `type === 'rownumber'`
- `column.hidden === true`
- `column.form.hidden === true`
- 그리드 선택 체크박스 및 합성 액션 열

`column.form.hidden === false`는 선언 시 숨김 컬럼을 폼에 명시적으로 포함한다. 사용자가 컬럼 메뉴에서 변경한 런타임 표시 상태와 `storageKey` 저장 상태는 폼 스키마를 바꾸지 않는다.

### 3.2 그룹과 순서

그룹명 우선순위는 다음과 같다.

1. `column.form.group`
2. `column.headerGroup`
3. `기본 정보`

필드는 `form.order`가 있으면 해당 값, 없으면 컬럼 선언 인덱스로 안정 정렬한다. 섹션은 정렬된 필드에서 처음 등장한 순서로 렌더링한다. 같은 이름의 그룹은 컬럼이 떨어져 있어도 하나의 폼 섹션으로 합친다.

### 3.3 읽기 전용

우선순위는 다음과 같다.

1. `form.readOnly`가 있으면 해당 값 또는 함수 결과
2. `editable` 함수가 있으면 그 반대값
3. `editable` boolean이 있으면 그 반대값
4. 나머지 일반 컬럼은 읽기 전용

체크박스 컬럼도 명시적 `form.readOnly`가 없으면 기존 `isCellEditable` 규칙을 따른다.

## 4. 타입별 입력 계약

| 컬럼 타입          | 모달 입력                  | draft 값                                    |
| ------------------ | -------------------------- | ------------------------------------------- |
| `text` 또는 미지정 | MUI `TextField`            | 문자열                                      |
| `number`           | 숫자 입력                  | 유효한 숫자는 `number`, 빈 값은 빈 문자열   |
| `decimal`          | 소수 입력                  | 유효한 숫자는 `number`, 빈 값은 빈 문자열   |
| `currency`         | 금액 입력                  | 유효한 숫자는 `number`, 빈 값은 빈 문자열   |
| `checkbox`         | MUI `Checkbox`             | `boolean`                                   |
| `date`             | 날짜 입력                  | 기존 값 표현과 호환되는 `YYYY-MM-DD` 문자열 |
| `datetime`         | 일시 입력                  | 기존 값 표현과 호환되는 문자열              |
| `time`             | 시간 입력                  | 기존 값 표현과 호환되는 문자열              |
| `select`           | MUI `Select`               | 선택 옵션의 원래 `value` 타입               |
| `autocomplete`     | MUI `Autocomplete`         | 선택 옵션의 원래 `value` 타입               |
| `code`             | 읽기 입력 + 코드 선택 버튼 | `onOpenCodePicker`가 반환한 patch           |

- 모든 `TextField` 계열 입력은 전역 테마의 `margin: normal` 영향을 피하도록 `margin="none"`을 명시한다.
- `getValue`가 있으면 초기 표시값에 사용한다.
- 일반 필드는 `draftRow[column.field]`를 갱신한다.
- `onValueChange`가 있으면 반환된 `Partial<T>`를 draft에 병합한다.
- `onOpenCodePicker`는 draft와 patch 적용 함수를 전달받아 연관 필드를 함께 변경할 수 있다.

## 5. 모달 상태와 데이터 흐름

### 5.1 수정

1. 사용자가 행 우측의 `정보 수정` 아이콘 버튼을 누른다.
2. 원본 행의 얕은 복사본을 `draftRow`로 저장하고 `originalRow`를 별도로 보관한다.
3. 입력 중에는 그리드 `data`와 `onChangesChange` 결과를 변경하지 않는다.
4. `적용` 시 폼 포함 컬럼으로 `validateGridRow`를 실행한다.
5. 오류가 없고 `onBeforeApply`가 중단하지 않으면 원본과 달라진 필드를 patch로 계산한다.
6. patch가 비어 있으면 변경 없이 모달만 닫는다.
7. patch가 있으면 기존 `updateGridRow`를 한 번 사용해 행과 dirty field를 반영한다.

### 5.2 신규 등록

1. `addRow(partial?)` 실행 시 `createRow()` 결과와 `partial`을 병합해 draft를 만든다.
2. `createRow`가 없고 `partial`만으로 유효한 `rowKey`를 만들 수 없으면 기존처럼 추가 동작을 수행하지 않는다.
3. 입력 중과 취소 시에는 행과 변경 이력을 생성하지 않는다.
4. 적용 시 검증과 `onBeforeApply`를 통과한 draft를 기존 `addGridRow`에 전달한다.
5. 중복 `rowKey`이면 행을 추가하지 않고 모달을 유지하며 식별자 오류를 표시한다.

### 5.3 닫기와 취소

- `취소`, 닫기 아이콘, `Escape`, backdrop 닫기는 동일하게 draft를 폐기한다.
- 모달 자체에서 서버 저장 또는 화면 이탈 확인을 수행하지 않는다.
- 모달 적용 후 최종 저장은 호출 화면의 기존 `getChanges()` 및 저장 버튼 흐름을 사용한다.

## 6. 액션 열

- 플러그인이 활성일 때만 마지막에 폭 48px의 합성 액션 열을 추가한다.
- 합성 열은 `F1GridColumn<T>` 배열과 행 데이터에 삽입하지 않는다.
- 헤더 라벨은 `상세`이며 정렬, 필터, 이동, 숨김, 크기 조절 대상이 아니다.
- 각 행은 MUI 편집 아이콘 버튼을 제공하고 `aria-label`은 `${rowId} 행 정보 수정`으로 지정한다.
- 액션 열은 우측에 고정한다. 기존 우측 pinned 컬럼의 offset에는 액션 열 폭 48px을 추가해 겹침을 방지한다.
- Excel 내보내기, 복사·붙여넣기, 셀 선택, 검증 컬럼 목록에는 포함하지 않는다.

## 7. F1-Tree 연동

- 트리 노드 펼침 상태 `expandedIds`와 행 폼 모달 open 상태는 별도로 관리한다.
- 행 액션 버튼은 트리 펼치기 버튼 이벤트와 독립적으로 동작하고 행 선택·셀 편집 이벤트로 전파되지 않는다.
- 루트 추가는 부모 값을 `null` 또는 `createRow()` 기본값으로 유지한다.
- 하위 추가는 기존 `addChildRow` 및 `treeContextMenu.onAddChild`가 전달하는 `[parentKey]: parentId` patch를 draft에 유지한다.
- 적용 후 기존 `addExpanded(parentId)` 동작으로 부모가 펼쳐지고 신규 자식이 투영 결과에 표시된다.

## 8. 화면 및 반응형 사양

### 8.1 데스크톱 1280px 이상

- MUI `Dialog`의 콘텐츠 최대 폭은 960px이다.
- 전체 최대 높이는 `85vh`이며 Dialog header와 actions는 고정하고 content만 `overflow-y: auto`로 스크롤한다.
- 기본 폼 grid는 3열이다. `form.span`으로 1~3열을 점유한다.

### 8.2 태블릿 768px 이상 1280px 미만

- Dialog는 좌우 안전 여백을 유지하며 최대 가용 폭을 사용한다.
- 폼 grid는 2열이다. `span: 3`은 2열 전체를 사용한다.

### 8.3 모바일 375px 이상 768px 미만

- Dialog는 `fullScreen`으로 전환한다.
- 폼 grid는 1열이며 모든 span은 1열 전체로 제한한다.
- 헤더 제목, 설명, 닫기 버튼과 하단 액션이 겹치지 않아야 한다.
- 페이지 전체의 가로 스크롤을 만들지 않는다.

## 9. 테마 및 시각 상태

- 배경은 `background.paper`와 `background.default`, 텍스트는 `text.primary`와 `text.secondary`, 경계는 `divider`, 강조는 `primary.main`, hover는 `action.hover`를 사용한다.
- 별도 라이트·다크 색상 하드코딩을 추가하지 않는다.
- 섹션 컨테이너의 border radius는 현재 테마의 6px을 사용한다.
- 필수 필드는 라벨과 오류 메시지로 표시하고 색상만으로 의미를 전달하지 않는다.
- 읽기 전용 필드는 disabled가 아닌 `readOnly` 표현을 우선해 값 가독성을 유지한다.
- 모달 헤더는 신규·수정 모드와 대상 식별 정보를 표시한다.
- 하단 왼쪽에는 `적용 후 화면의 저장 버튼으로 최종 저장됩니다.` 안내를 표시하고 오른쪽에 `취소`, `적용` 버튼을 배치한다.

## 10. 검증과 오류 처리

- 적용 시 `required`, `min`, `max`, `validate`를 폼에 포함된 컬럼 기준으로 검증한다.
- 오류 필드는 `aria-invalid="true"`, 오류 메시지는 해당 입력과 연결된 `aria-describedby`를 가진다.
- 첫 오류 입력으로 포커스를 이동하고 모달을 닫지 않는다.
- `onBeforeApply` 예외는 삼키지 않으며 기존 React 오류 처리 경로를 따른다.
- 취소는 검증을 실행하지 않는다.

## 11. API·권한·DB 계약

- 신규 HTTP 엔드포인트: 없음
- Request/Response 변경: 없음
- HTTP 상태 코드 변경: 없음
- 권한 정책 변경: 없음. 플러그인 등록 여부와 기존 화면의 버튼 노출 정책은 호출 화면이 결정한다.
- DB 스키마 및 데이터 변경: 없음
- DB 스크립트: 해당 없음, 영향 검토 완료

## 12. 접근성

- Dialog는 제목 요소와 `aria-labelledby`로 연결한다.
- 닫기·수정 버튼은 텍스트가 없는 아이콘 버튼이므로 명확한 `aria-label`과 Tooltip을 제공한다.
- Tab 포커스는 MUI Dialog의 focus trap을 사용한다.
- `Escape`와 취소 버튼은 동일한 폐기 동작을 수행한다.
- 섹션 제목과 입력 라벨의 의미 관계를 유지한다.

## 13. 회귀 검증 기준

1. `rowFormPlugin`이 없거나 비활성이면 액션 열과 모달이 렌더링되지 않는다.
2. 비활성 상태의 `addRow`, 인라인 편집, 정렬, 필터, pinned 컬럼, Excel 내보내기 동작이 기존과 같다.
3. 수정 모달에서 입력 후 취소하면 `getRows()`와 `getChanges()`가 열기 전과 같다.
4. 수정 적용 시 변경 필드만 dirty가 되고 행은 `updatedRows`에 포함된다.
5. 신규 모달 취소 시 `insertedRows`가 증가하지 않고 적용 시에만 증가한다.
6. `headerGroup` 및 `form.group` 우선순위와 `기본 정보` fallback이 일치한다.
7. 각 컬럼 타입의 값 타입과 옵션 값 타입이 적용 후 보존된다.
8. F1-Tree 하위 등록 시 부모 ID가 유지되며 트리 노드 펼침과 모달 상태가 충돌하지 않는다.
9. 라이트·다크 테마에서 텍스트, 경계, 포커스, 오류 상태가 식별된다.
10. 375px, 768px, 1280px에서 겹침·잘림·페이지 가로 스크롤이 없다.

## 14. 문서 동기화

- `frontend/src/pages/f1-grid-docs/F1-GRID.md`에 공개 타입, 자동 변환, 멀티헤더, 신규·수정, F1-Tree 예제를 추가한다.
- 문서 포털에 실제 동작하는 Playground와 API Reference를 추가한다.
- `docs/result/20260910/f1grid-tree-form-modal-plugin/`에 진행 원장, 결과 문서, 라이트·다크 및 반응형 스크린샷을 보관한다.
