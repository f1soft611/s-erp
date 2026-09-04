# F1Grid 컨텍스트 메뉴 행 액션 가시성 제어

## 재현 조건

- 권한별 사용자 매핑 그리드에서 우클릭 메뉴를 열면 `행 추가`, `행 복사`, `행 삭제` 항목이 노출됨.
- 해당 화면은 행 추가/복사/삭제 기능이 필요하지 않으므로, 메뉴를 숨기고 싶음.

## 원인

- 공통 F1Grid의 context menu 항목이 페이지별 로직 없이 하드코딩되어 있었음.
- `allowAddRowInContextMenu`만 존재했고, 복사/삭제 항목은 항상 렌더링되던 상태였음.

## 수정 내용

- `F1GridProps`에 다음 옵션 추가
  - `allowDuplicateRowInContextMenu?: boolean`
  - `allowDeleteRowInContextMenu?: boolean`
- 기본값은 모두 `true`로 유지해서 기존 동작을 그대로 보장.
- 권한별 사용자 매핑 그리드에서 세 옵션을 모두 `false`로 설정해 공통 제어로 숨김 처리.

## 검증

- `cd frontend && npm run test -- tests/role-management-notification.test.tsx`
- 결과: 1 파일, 20 테스트 통과.

## 회귀 검증 포인트

- 권한 관리 페이지는 기존 동작 유지.
- 사용자 매핑 그리드 우클릭 메뉴에서 행 추가/복사/삭제 숨김.
- 공유 F1Grid 옵션으로 비활성화 시 해당 메뉴 항목이 비노출됨.
