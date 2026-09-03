# F1-Grid dirty cell indicator 결과 문서 (수정 반영)

## 1. 문제 재확인

사용자가 실제 화면에서 셀을 수정했는데도 dirty 표시(빨간 모서리 마크)가 보이지 않는다고 보고했다. 이전 검증에서는 `data-dirty-cell="true"` 속성 존재 여부만 확인했고, 실제 시각적 위치(포지셔닝)는 검증하지 않아 문제를 놓쳤다.

## 2. 근본 원인

[frontend/src/shared/components/f1-grid/core/GridCell.tsx](../../../../frontend/src/shared/components/f1-grid/core/GridCell.tsx)의 셀 루트 `Box`의 `sx` 객체에 `position` 키가 두 번 선언되어 있었다.

```tsx
sx={{
  // ...
  position: 'relative',
  // ...
  position: pinOffset ? 'sticky' : undefined, // 이 값이 위의 'relative'를 덮어씀
  // ...
}}
```

JavaScript 객체 리터럴은 동일 키가 중복되면 마지막 값만 유지한다. 따라서 `pinned` 옵션이 없는 일반 컬럼(예: 경로, 메뉴설명, 정렬 등)은 `position`이 `undefined`가 되어 브라우저 기본값인 `static`으로 렌더링되었다.

dirty marker는 `position: 'absolute'`로 셀 내부에 배치되는데, 부모 셀이 `position: static`이면 가장 가까운 positioned 조상(그리드 컨테이너 등) 기준으로 배치되어 실제 셀 위치에 나타나지 않거나 잘려서 보이지 않았다. `pinned: 'left'`가 지정된 컬럼(`메뉴명` 등)은 `position: 'sticky'`가 적용되어 우연히 정상적으로 표시되었기 때문에, 이전 회귀 테스트("메뉴명" 컬럼 수정)는 통과했지만 실제 문제 컬럼(경로 등 비고정 컬럼)은 재현하지 못했다.

## 3. 수정 내용

- `position: 'relative'` 중복 선언을 제거하고, `position: pinOffset ? 'sticky' : 'relative'`로 단일화했다.
- 이제 고정 컬럼과 일반 컬럼 모두 셀 자신이 positioned 컨테이너가 되어, dirty marker가 항상 셀 내부 좌측 상단에 정확히 표시된다.

## 4. 테스트 보강

기존 테스트는 속성 존재만 확인해 시각적 포지셔닝 결함을 잡지 못했다. 아래 테스트를 [frontend/tests/menu-management-f1-grid.test.tsx](../../../../frontend/tests/menu-management-f1-grid.test.tsx)에 추가했다.

- `shows a red marker on a non-tree text column after an edit`: 고정되지 않은 "경로" 컬럼을 Enter로 커밋 편집 후 dirty 속성 확인
- `shows a red marker on a non-tree text column after editing and clicking away (blur)`: blur로 커밋했을 때도 동일하게 확인
- 위 테스트에 `getComputedStyle(pathCell).position !== 'static'` 검증을 추가해, dirty marker가 실제로 위치를 잡을 수 있는 positioned 컨테이너인지 확인한다. 이 검증이 이번 회귀의 핵심이며, 속성 존재만 확인하는 방식으로는 재현되지 않았다.

## 5. 검증 결과

### 5.1 수정 전/후 비교 (`frontend/tests/f1-grid.test.tsx` 단독 실행)

```
cd frontend
npx vitest run tests/f1-grid.test.tsx --reporter=json --outputFile=<report>.json
```

- 수정 전(baseline): 85 passed / 22 failed
- 수정 후: 86 passed / 21 failed
- 유일하게 상태가 바뀐 테스트: `F1-GRID interaction keeps merged values working on pinned left columns` (실패 → 통과)
- 새로 발생한 실패 없음 (diff 결과 `new failures introduced: []`)

### 5.2 신규 dirty 회귀 테스트 (`frontend/tests/menu-management-f1-grid.test.tsx`)

```
npx vitest run tests/menu-management-f1-grid.test.tsx -t "non-tree text column"
```

- 두 신규 테스트 모두 통과.

### 5.3 남아있는 사전 실패 (본 작업과 무관, out-of-scope)

아래 실패는 수정 전/후 동일하게 존재하는 기존(pre-existing) 실패이며, 이번 dirty indicator 수정과 무관하다. 별도 이슈로 다뤄야 한다.

- `F1-GRID extended editors` 그룹 다수 (코드피커, 오토컴플리트, 시간 편집기 등)
- `F1-GRID interaction` 그룹 중 셀 편집기 크기/포커스/날짜 편집 관련 다수
- `MenuManagementPanel F1Tree integration resets dirty cell state and removes unsaved rows when the module is reloaded`
- `MenuManagementPage module selection shows a menu reload error while retaining local visible changes`

## 6. 관련 파일

- [frontend/src/shared/components/f1-grid/core/GridCell.tsx](../../../../frontend/src/shared/components/f1-grid/core/GridCell.tsx)
- [frontend/tests/menu-management-f1-grid.test.tsx](../../../../frontend/tests/menu-management-f1-grid.test.tsx)
- [docs/guide/F1-GRID.md](../../../guide/F1-GRID.md) (dirty 표시 동작 요약 추가)

## 7. 결론

dirty cell indicator는 고정 컬럼에서만 우연히 정상 동작했고, 일반(비고정) 컬럼에서는 CSS `position` 중복 선언 버그로 인해 표시되지 않았다. 근본 원인을 제거하고, 시각적 포지셔닝을 검증하는 회귀 테스트를 추가해 재발을 방지했다.
