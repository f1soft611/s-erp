# 상세 사양서

## 1. 기능 요약

메뉴 관리 화면에서 dirty 상태는 공통 grid 상태 관리 기준과 동기화되어야 한다. 사용자가 값을 수정한 뒤 원래 값으로 되돌리면, 셀 dirty 마커와 상위 저장 버튼 상태가 모두 함께 초기화되어야 한다.

## 2. 사용자 시나리오

### 시나리오 A: 수정 후 원복

1. 사용자가 메뉴 이름을 수정한다.
2. dirty 마커가 표시된다.
3. 사용자가 같은 값을 원래 값으로 다시 입력한다.
4. dirty 마커가 사라진다.
5. 상단 저장 버튼도 비활성화된다.

### 시나리오 B: 신규 행 추가

1. 사용자가 새 메뉴를 추가한다.
2. 신규 row는 dirty 상태로 간주된다.
3. 저장 버튼이 활성화된다.
4. 저장 완료 후 dirty 상태가 초기화된다.

### 시나리오 C: 삭제 처리

1. 사용자가 행을 삭제한다.
2. 상위 dirty 상태가 true가 된다.
3. 저장 버튼이 활성화된다.
4. 저장 완료 후 dirty 상태 초기화된다.

## 3. 동작 규칙

### 3.1 Core 규칙

- `F1Grid`는 `originalRowsById`와 현재 값의 일치를 기준으로 dirty를 판정한다.
- 필드 값이 원본과 동일해지면 해당 field dirty 플래그를 제거한다.
- row의 모든 field가 원본과 동일해지면 row state는 `normal` 상태로 복귀한다.
- `onChangesChange`는 실제 변경이 없으면 빈 `insertedRows/updatedRows/deletedRows`를 전달한다.

### 3.2 Page 규칙

- `MenuManagementPage`는 `MenuManagementPanel`의 `onDirtyChange`에서 전달된 boolean만 사용한다.
- 저장 버튼 `disabled`는 `!dirty || saving`으로 통일한다.
- dirty 상태가 false이면 저장 버튼이 비활성화되고, 모듈 전환/새로고침 판별에서도 dirty 체크가 정상 동작한다.

## 4. UI/UX 기준

- dirty 마커는 기존 UX를 유지한다.
- 저장 버튼은 dirty 상태가 해제된 시점에 즉시 비활성화되어야 한다.
- 사용자 경험상 변경 취소와 저장 가능 상태의 전환이 즉시 반영되어야 한다.

## 5. 검증 기준

- 수정 후 원복 시 dirty 마커가 사라진다.
- 수정 후 원복 시 저장 버튼이 비활성화된다.
- dirty 상태가 있는 경우에만 저장 버튼이 활성화된다.
- 관련 회귀 테스트를 통과한다.

## 6. 구현 힌트

- 핵심 수정은 page에서 별도 dirty 계산을 추가하는 대신, grid core에서 dirty 상태를 일관되게 유지하는 방향으로 설계한다.
- page는 해당 boolean 상태를 그대로 반영하는 역할만 수행한다.
- 테스트는 원복 후 enabled/disabled 전환을 포함해 회귀를 검증한다.
