# Hook dependency boundary remediation 상세사양

## 범위와 고정 조건

수정은 다음 네 운영 파일의 여덟 `react-hooks(exhaustive-deps)` 경고에 한정한다. 시작 기준 lint는 진단 127개이며 exhaustive-deps 22개다. 목표는 각각 119개와 14개이며, set-state-in-effect 97개와 refs 8개를 포함한 나머지 진단은 동일해야 한다.

화면 레이아웃, props/API, 서비스/API 호출, callback 본문(아래 CommonCode의 불사용 매개변수 제거는 예외), F1-Grid 포인터·키보드·범위·드래그·고정 컬럼 동작, 권한, CSV 데이터, imperative handle 의미를 변경하지 않는다. lint 비활성화, 억제 주석 및 설정 변경은 금지한다.

## 파일별 계약

### CommonCodeManagementPanel

- `filteredGroups`의 값은 `savedGroupBaseline?.source === groups`일 때 baseline의 rows, 아니면 현재 `groups`다.
- 계산은 `searchQuery`를 참조하지 않는다. 의존 배열에서 이를 제거하고 이 배열 외에 사용되지 않는 컴포넌트 지역 `searchQuery` destructuring/default만 제거한다.
- `CommonCodeManagementPanelProps.searchQuery` 타입과 컴포넌트 호출자 및 다른 props는 유지한다.

### PurchaseRequestConfirmPage

- 취소 확인 문구는 활성 행의 수 `activeRows.length`를 표시한다.
- `requestCount`는 `new Set(activeRows.map(row => row.purchaseRequestId)).size`로 계산되는 고유 요청 수이며 행 수와 동등하지 않다. 문구를 바꾸지 않는다.
- callback dependency array에서 `requestCount`를 빼고 `activeRows`를 추가한다. callback guard, 문구, 비동기 취소 동작은 그대로 둔다.

### GridRow

- `handleCellMouseDown`의 본문은 props의 `latestPropsRef`나 `selectedCellRange`를 직접 읽지 않는다. 이 둘만 해당 dependency array에서 제거한다.
- `handleCellMouseEnter`는 최신 drag/range 값을 `latestPropsRef.current`에서 읽는다. 해당 ref는 유지한다. 직접 읽지 않는 `selectedCellRange`와 `isCellSelectionDragging`만 dependency array에서 제거한다.
- `isCellSelectionDragging`는 callback에서 직접 읽지 않으므로, dependency 제거 뒤 unused가 되는 local destructuring/default도 제거한다. `GridRowProps`의 optional field와 caller는 유지한다.
- 콜백 본문, stable refs 및 다른 실제 dependencies는 수정하지 않는다. 별도 `useEffect`의 range 초기화, 렌더링, 포커스·편집 처리도 수정하지 않는다.

### RoleManagementPanel

- `roleColumns`는 `editable: isUncommittedNewRole`을 사용하며 이 predicate는 `committedCreateRowIds`를 참조한다. 상태 set은 실패 저장/성공 저장 경로에서 새 `Set`으로 갱신된다.
- predicate를 `useCallback`으로 `[committedCreateRowIds]`에 묶고, 기존 정의 그대로인 컬럼 배열을 `useMemo`로 감싸 predicate를 dependency로 둔다.
- 모든 컬럼 값, 순서, permissions, `roleEditorPlugin`, CSV escaping·헤더·필드 선택, export handle을 유지한다.

## F1-Grid 문서

`frontend/src/pages/f1-grid-docs/F1-GRID.md`의 셀 범위 선택 설명에 내부 callback이 최신 드래그/범위 상태를 ref로 읽고 불필요한 렌더 dependency만 제거한다는 점을 명시한다. 이미 문서에 있는 포인터, 키보드, 범위, pinned-column 동작 계약은 변경하지 않는다.

## 검증 기준

1. 변경 전 JSON lint에서 대상 네 파일 진단이 정확히 8개인 RED 확인을 보존한다.
2. common-code management page, purchase request confirm, role management notification, F1-Grid keyboard/interaction 및 pinned range 기존 회귀를 UTC, Vitest threads, 최대 worker 2로 실행한다.
3. TypeScript project check가 exit 0이다.
4. 전체 Oxlint의 exhaustive-deps는 22→14, 전체 진단은 127→119다. 대상 8개 외 진단의 severity, filename, message, 위치 의미는 baseline과 일치해야 한다.
5. 검증 전용 workspace는 초기 Git 상태를 유지하고, 변경된 frontend source/doc만 기존 경로로 복사한다. 변경 파일의 byte 비교와 작업 범위 확인을 수행한다.
6. Root `git diff --check`가 통과한다. UI 및 시각 출력이 바뀌지 않으므로 새로운 브라우저 스크린샷은 요구하지 않으며, 결과 문서에서 그 이유를 설명한다.
