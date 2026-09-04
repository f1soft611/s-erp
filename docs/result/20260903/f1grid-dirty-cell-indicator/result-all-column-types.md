# F1-Grid dirty cell indicator 결과 문서 (모든 컬럼 타입 검증)

## 1. 요청 사항

dirty 표시를 텍스트, 숫자, 체크박스, 날짜, 시간 등 모든 컬럼 타입에 동일하게 적용해달라는 요청.

## 2. 확인 결과

[frontend/src/shared/components/f1-grid/core/GridCell.tsx](../../../../frontend/src/shared/components/f1-grid/core/GridCell.tsx)의 dirty 마커는 컬럼 타입별 렌더링 분기(`checkbox`/`editing`/기본 표시) 이전, 셀 루트에서 `dirtyCell && !editing` 조건만으로 공통 렌더링된다. 따라서 컬럼 타입과 무관하게 이미 동일하게 동작하고 있었다.

체크박스는 편집 모드(`editing`)로 전환되지 않고 `onChange` 즉시 커밋되므로 별도 분기 없이도 동일한 마커 조건이 적용된다.

## 3. 회귀 테스트 추가

컬럼 타입별 실제 동작을 고정하기 위해 [frontend/tests/f1-grid.test.tsx](../../../../frontend/tests/f1-grid.test.tsx)에 `F1-GRID dirty indicator across column types` 그룹을 추가했다.

- 텍스트 컬럼 편집 후 dirty 확인
- 숫자 컬럼 편집 후 dirty 확인
- 체크박스 토글 후 dirty 확인
- 날짜 컬럼 편집 후 dirty 확인
- 시간 컬럼 편집 후 dirty 확인

각 테스트는 `editorPlugins={[{ canEdit: () => true }]}`를 사용해 편집을 명시적으로 허용한다(F1-Grid는 editorPlugin이 없으면 더블클릭 편집이 시작되지 않는 기존 정책을 따른다).

## 4. 검증 결과

```
cd frontend
npx vitest run tests/f1-grid.test.tsx -t "dirty indicator across column types" --reporter=json --outputFile=<report>.json
```

- 5개 테스트 모두 통과 (텍스트/숫자/체크박스/날짜/시간).

```
npx vitest run tests/f1-grid.test.tsx tests/menu-management-f1-grid.test.tsx --reporter=json --outputFile=<report>.json
```

- 136 passed / 22 failed.
- 실패 목록은 이번 작업 이전부터 존재하던 사전(pre-existing) 실패와 동일하다. 근본 원인은 F1-Grid의 `canStartEditor`가 `activeEditorPlugins.length === 0`일 때 편집 시작 자체를 차단하도록 변경된 별도 작업(`20260903_004_f1grid_editor_plugin`)에서 비롯된 것으로, `editorPlugins`를 전달하지 않는 구형 테스트들이 편집을 시작하지 못해 실패한다. 이는 이번 dirty indicator 작업과 무관한 별도 이슈이며 범위 밖이다.

## 5. 관련 파일

- [frontend/src/shared/components/f1-grid/core/GridCell.tsx](../../../../frontend/src/shared/components/f1-grid/core/GridCell.tsx)
- [frontend/tests/f1-grid.test.tsx](../../../../frontend/tests/f1-grid.test.tsx)
- [frontend/src/pages/f1-grid-docs/F1-GRID.md](../../../frontend/src/pages/f1-grid-docs/F1-GRID.md) (컬럼 타입 무관 동일 적용 명시)

## 6. 결론

dirty 표시는 이미 모든 컬럼 타입에 동일하게 적용되고 있었으며, 이를 검증하는 회귀 테스트를 추가해 향후 컬럼 타입별 렌더링 변경 시 회귀를 방지한다. 코드 변경은 없었다.

