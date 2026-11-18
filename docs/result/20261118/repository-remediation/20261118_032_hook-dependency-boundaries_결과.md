# Hook dependency boundary remediation 결과

## 결과

unit 032에서 요청된 8개의 `react-hooks(exhaustive-deps)` 경고만 제거했다. 모든 수정은 callback/memo 의존성 소유를 명확히 하며, 화면·서비스/API·public prop 계약과 F1-Grid 상호작용 동작은 변경하지 않았다.

## 대상별 변경

- `CommonCodeManagementPanel.tsx`: `filteredGroups`의 계산은 `searchQuery`를 사용하지 않아 의존성에서 제거했다. 해당 컴포넌트 지역 destructuring/default도 다른 곳에서 쓰이지 않아 함께 제거했다. `searchQuery` public prop 타입 및 전달 경로는 그대로다.
- `PurchaseRequestConfirmPage.tsx`: 취소 prompt의 `activeRows.length`는 행 개수이고 `requestCount`는 고유 `purchaseRequestId` 수라 서로 대체할 수 없다. prompt 본문은 유지하고 callback dependency를 `activeRows`로 바꾸었다.
- `GridRow.tsx`: lint가 지목한 mouse-down의 `latestPropsRef`, `selectedCellRange` 및 mouse-enter의 `selectedCellRange`, `isCellSelectionDragging`만 dependency array에서 제거했다. mouse-enter의 최신 상태 ref 읽기, 콜백 본문, 다른 dependencies와 `GridRowProps.isCellSelectionDragging` 타입은 유지했다. 지역 destructuring은 제거 이후 unused여서 함께 정리했다.
- `RoleManagementPanel.tsx`: `isUncommittedNewRole`를 `[committedCreateRowIds]`에 의존하는 `useCallback`으로 안정화하고, 기존 `roleColumns` 배열을 해당 predicate를 의존하는 `useMemo`로 감쌌다. predicate 입력인 Set은 저장 경로에서 새 Set으로 교체되므로 편집 가능 여부가 갱신되며, 컬럼 정의·순서, 권한, CSV 데이터/escaping 및 imperative handle은 변경하지 않았다.
- `F1-GRID.md`: 드래그 진행 핸들러가 최신 props ref에서 이벤트 시점의 범위/drag 상태를 읽는다는 내부 의존성 소유 설명을 추가했다. 외부 선택 동작 계약은 바꾸지 않았다.

## 검증

### 정적 경고 gate

검증 전용 workspace에서 변경 전 전체 JSON lint를 실행해 대상 8개 진단의 RED를 확인했다. 기준 127개는 `set-state-in-effect=97`, `exhaustive-deps=22`, `refs=8`이었다.

변경 후 전체 lint는 exit 0이며 119개로, `set-state-in-effect=97`, `exhaustive-deps=14`, `refs=8`이다. 대상 경고는 0개다. 대상 8개를 제외한 모든 lint 진단의 파일·rule·severity·message signature 차이는 0이다. 별도 경고 억제나 규칙 변경은 하지 않았다.

### 회귀 테스트 및 타입 검사

검증 workspace에서 `TZ=UTC`, Vitest threads, 최대 worker 2로 다음 기존 파일을 실행했다. 실제 JSON `testResults.length` 기준 5개 파일, 292개 테스트 통과, 실패 파일 0개다.

- `tests/common-code-management-page.test.tsx` — 30
- `tests/purchase-request-confirm.test.tsx` — 9
- `tests/role-management-notification.test.tsx` — 53
- `tests/f1-grid.test.tsx` — 199
- `tests/f1-grid-pinned-column-range.test.tsx` — 1

`tsc -b`는 exit 0이다. 전체 frontend tracked file 890개를 root와 검증 workspace에서 SHA-256 비교했고 누락/차이는 0개다. 변경된 네 운영 소스와 F1-Grid 문서의 개별 byte hash도 일치한다. root `git diff --check`는 exit 0이다.

### 증거 파일

- 세션 RED/GREEN lint JSON: `lint032-red.json`, `lint032-green.json`.
- 세션 Vitest stdout/report: `lint032-focused-vitest.log`, `lint032-vitest-report.json`.
- 세션 TypeScript 로그: `lint032-typecheck.log`.
- 부모의 독립 audit: `lint032-parent-audit.json`.
- 원본 report 위치: 기존 검증 workspace의 `frontend/.artifacts/vitest/report.json`.

부모 사양 검토에서 8개 진단 범위·public 계약 보존을 확인했다. 이어 품질 검토에서 TypeScript token 비교로 역할 컬럼/predicate 내용과 GridRow 두 callback 본문이 그대로임을 확인했다. 실제 report 5파일/292개·실패/대기 0과 frontend 890파일 byte 일치도 독립 확인했다. 테스트 파일·backend·manifest 변경은 없다.

## 화면 검증 및 미확인 사항

새 UI 동작이나 레이아웃은 포함하지 않는다. 변경은 memo/callback의 내부 dependency 경계에 한정되어 시각 차이가 없으므로 신규 브라우저 스크린샷은 만들지 않았다. 이전 전체 테스트 결과를 이번 변경의 검증으로 재사용하지 않았다. 이 결과는 unit 032 범위만 다루며, 저장소의 다른 lint 잔여 진단 해결 또는 전체 요청 완료를 뜻하지 않는다.

## 복사 가능한 커밋 메시지

```text
fix(frontend): clarify hook dependency boundaries

Remove eight exhaustive-deps diagnostics without changing screen behavior.
Keep current request-count semantics and stabilize role columns on their
committed-create state. Document unchanged F1-Grid drag behavior.
```

요청에 따라 이 단위에서는 stage, commit, push를 수행하지 않았다.
