# 작업지시서

## 제목

메뉴 관리 dirty 상태와 저장 버튼 비활성화 동기화 수정

## 배경

메뉴 관리 화면에서 셀 값이 원래 값으로 되돌아가면 dirty 표시 마크가 사라지는 것은 확인되었지만, 상단의 저장 버튼이 계속 활성화된 상태로 남아 있는 문제를 재현하고 있다. dirty 표시와 저장 버튼은 같은 변경 상태를 기준으로 동작해야 하므로, 사용자 입장에서는 실제 저장 가능 여부와 UI 표시가 일관되게 유지되어야 한다.

## 요구사항

- 메뉴 관리 화면에서 값이 원래 값으로 복원되면 dirty 표시와 변경 집계가 함께 초기화되어야 한다.
- 값이 원래 값으로 되돌아간 뒤에는 저장 버튼이 비활성화되어야 한다.
- dirty 상태가 아직 남아 있는 경우에만 저장 버튼이 활성화되어야 한다.
- 기존 메뉴 추가/수정/삭제 동작과 dirty 확인 흐름은 유지해야 한다.
- 관련 테스트를 보강하거나 기존 테스트를 정리해 재회귀를 검증한다.

## 변경 범위

- 프론트엔드: `frontend/src/pages/settings/system/menus/MenuManagementPage.tsx`
- 프론트엔드: `frontend/src/pages/settings/system/menus/components/MenuManagementPanel.tsx`
- 프론트엔드 필요 시: `frontend/src/shared/components/f1-grid/**`
- 테스트: `frontend/tests/menu-management-f1-grid.test.tsx`

## 제외 범위

- 메뉴 관리 외 다른 화면의 로직 개편
- 백엔드 API 구조 변경
- 비관련 F1-Grid 기능 전반 리팩터링

## 완료 기준

- dirty 상태가 원래 값 복원 시 해제되면 저장 버튼이 비활성화된다.
- dirty 마크와 저장 버튼의 상태가 일관성을 유지한다.
- 회귀 테스트가 통과한다.
- 관련 검증 로그와 스크린샷 증거를 확보한다.
