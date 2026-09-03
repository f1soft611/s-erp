# F1-Grid 체크박스 dirty 마커 미표시 수정 결과 문서

## 1. 문제

메뉴 관리 화면에서 권한 체크박스(읽기/쓰기/삭제/엑셀)를 토글해도 dirty 빨간 삼각형 마커가 표시되지 않았다. 이전 검증(전용 F1Grid 테스트)은 통과했으나, 실제 화면(F1Tree 기반 MenuManagementPanel)에서는 재현되지 않았다.

## 2. 근본 원인

권한 체크박스 컬럼은 실제 데이터 필드가 아니라 파생 필드다.

```ts
{
  field: 'readPermission', // 컬럼 자체의 필드명 (실제 row에는 없음)
  type: 'checkbox',
  getValue: (row) => hasPermissionGroup(row.permissionCodes, ['READ']),
  onValueChange: (row, checked) => ({
    permissionCodes: togglePermissionGroup(row.permissionCodes, ['READ'], checked),
  }),
}
```

체크박스를 토글하면 실제로 갱신되는 데이터 필드는 `permissionCodes`이고, [frontend/src/shared/components/f1-grid/state/GridState.ts](../../../../frontend/src/shared/components/f1-grid/state/GridState.ts)의 `updateGridRow`도 `dirtyFieldsById[stateKey]['permissionCodes'] = true`로 표시한다.

그러나 [frontend/src/shared/components/f1-grid/core/F1Grid.tsx](../../../../frontend/src/shared/components/f1-grid/core/F1Grid.tsx)의 `dirtyCellMap`은 `dirtyFieldsById`를 그대로 `stateKey:field` 형태로 펼쳐서 만들었고, `GridCell`은 `dirtyCellMap[stateKey:column.field]`(예: `stateKey:readPermission`)를 조회한다. `permissionCodes`와 `readPermission`은 서로 다른 키이므로 실제로는 값이 바뀌었어도 해당 체크박스 컬럼의 dirty 조회는 항상 `undefined`(=false)였다.

읽기/쓰기/삭제/엑셀 4개 체크박스 컬럼이 모두 같은 `permissionCodes` 필드를 공유하기 때문에, 이 구조를 쓰는 모든 체크박스 컬럼에서 동일하게 발생하는 문제였다.

## 3. 수정 내용

`F1Grid.tsx`의 `dirtyCellMap` 계산 방식을 `dirtyFieldsById` 단순 펼치기에서, 각 행×컬럼을 순회하며 계산하는 방식으로 변경했다.

- `column.getValue`가 있는 컬럼: `column.getValue(row)`와 `column.getValue(originalRow)`를 비교해 dirty 여부를 계산한다. 실제로 갱신되는 하위 필드명이 컬럼 필드명과 달라도 파생 값 자체의 변화로 판정하므로 정확하다.
- `column.getValue`가 없는 일반 컬럼: 기존과 동일하게 `dirtyFieldsById[stateKey][field]`를 사용한다.
- 원본 스냅샷이 없는 신규 삽입 행은 항상 dirty로 처리한다(기존 정책 유지).

## 4. 회귀 테스트

[frontend/tests/menu-management-f1-grid.test.tsx](../../../../frontend/tests/menu-management-f1-grid.test.tsx)에 실제 프로덕션 시나리오를 재현하는 테스트를 추가했다.

- `shows a red marker on a permission checkbox cell after a toggle`: `MenuManagementPanel`의 실제 권한 체크박스(`getValue`/`onValueChange` 기반)를 토글해 dirty 마커 확인.

수정 전 코드로 되돌려 실행한 결과 이 테스트가 실패(RED)함을 확인했고, 수정 후 통과(GREEN)함을 확인했다.

## 5. 검증 결과

### 5.1 단위 테스트

```
cd frontend
npx vitest run tests/menu-management-f1-grid.test.tsx -t "permission checkbox cell after a toggle"
```

- 통과. 수정 전 임시 되돌리기(`git stash`)로 동일 테스트가 실패함을 확인해 회귀 재현을 검증했다.

```
npx vitest run tests/menu-management-f1-grid.test.tsx tests/f1-grid.test.tsx --reporter=json
```

- 137 passed / 22 failed. 실패 목록은 이번 수정 이전부터 존재하던 사전 실패(에디터 플러그인 게이팅 관련, 메뉴 재로드 관련)와 동일. 신규 회귀 없음.

### 5.2 실제 브라우저 검증 (Playwright)

- 로그인 → 환경설정 → 메뉴관리 → 모듈 "환경설정" 선택 → "읽기" 권한 체크박스 토글
- 토글 직후 `data-dirty-cell` 속성이 `"false"` → 수정 후 `"true"`로 변경됨을 실제 DOM에서 확인
- 해당 셀을 클리핑한 스크린샷에서 좌측 상단에 빨간 삼각형 마커가 실제로 렌더링됨을 육안으로 확인

## 6. 관련 파일

- [frontend/src/shared/components/f1-grid/core/F1Grid.tsx](../../../../frontend/src/shared/components/f1-grid/core/F1Grid.tsx)
- [frontend/tests/menu-management-f1-grid.test.tsx](../../../../frontend/tests/menu-management-f1-grid.test.tsx)
- [docs/guide/F1-GRID.md](../../../guide/F1-GRID.md) (getValue 기반 파생 컬럼의 dirty 판정 방식 반영)

## 7. 결론

파생 값(`getValue`)을 사용하는 체크박스 컬럼은 실제로 갱신되는 하위 필드명이 컬럼 필드명과 다를 수 있어, dirty 판정을 필드명 매칭이 아니라 파생 값 비교로 전환해 해결했다. 실제 브라우저 환경에서 시각적으로도 정상 표시됨을 확인했다.
