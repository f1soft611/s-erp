# Hook dependency boundary 정리 작업지시서

## 목표

요청된 네 파일의 `react-hooks(exhaustive-deps)` 경고 8개만 정확히 해소한다. 콜백 본문, public props/API, 화면 동작과 기존 그리드 이벤트 동작은 보존하고, lint 규칙·설정이나 다른 진단은 변경하지 않는다.

## 대상과 원칙

1. `CommonCodeManagementPanel.tsx`: 필터 그룹 memo에서 사용하지 않는 `searchQuery` 의존성을 제거한다. memo 외에 쓰이지 않는 destructured 지역 변수만 없애며 props 계약은 유지한다.
2. `PurchaseRequestConfirmPage.tsx`: 취소 콜백은 행 개수 `activeRows.length`를 표시한다. `requestCount`는 고유 요청 ID 개수이므로 동등값으로 대체하지 않는다. 콜백이 읽는 `activeRows`를 의존성으로 지정하고 불필요한 `requestCount` 의존성을 제거한다.
3. `GridRow.tsx`: 두 callback의 lint가 지목한 불필요 의존성만 제거한다. 그 결과 사용하지 않게 된 지역 prop destructuring도 정리하되 public prop 타입/호출자와 콜백의 최신 props ref 읽기, 드래그 상태, 키보드·포인터 이벤트 및 고정/범위 동작은 수정하지 않는다.
4. `RoleManagementPanel.tsx`: `roleColumns`의 편집 가능 여부가 `committedCreateRowIds`를 사용하므로 이를 반영해 컬럼 참조를 안정화한다. CSV 내용, 권한, 편집 및 imperative handle은 보존한다.

## 필수 순서와 검증

작업지시서 → 계획서 → 상세사양서 → 정적 경고 재현 → 최소 수정 → 검증 → 결과 문서 순서로 진행한다.

- 검증 전용 workspace의 현재 frontend 소스를 기준으로 JSON lint를 실행하고, 대상 8개 경고를 RED로 확인한다.
- 기존 common-code, purchase-request-confirm, role-management, F1-Grid 포인터/범위/키보드 관련 회귀 테스트와 TypeScript project check를 수행한다.
- 완전 lint에서 exhaustive-deps 22→14, 전체 127→119가 되는지 확인하고 다른 경고 범주·진단은 바뀌지 않아야 한다.
- 정확히 허용된 frontend 소스 및 F1-Grid 문서만 검증 workspace에 반영해 root와 비교한다. `git diff --check`도 통과해야 한다.
- 화면 동작·레이아웃은 바꾸지 않는 memo/callback dependency 정리다. 시각 결과 변화가 없으므로 새 스크린샷을 만들거나 과거 스크린샷을 현재 검증 증거로 제시하지 않는다.
- 이 단위에서 commit, stage, push는 수행하지 않는다.
