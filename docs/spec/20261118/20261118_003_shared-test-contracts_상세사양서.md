# 공통 테스트 계약 정합성 상세사양서

## 근거와 범위

- [계획서](../../plan/20261118/20261118_003_shared-test-contracts_계획서.md)
- [Excel 구조 보존 사양](../20261002/20261002_012_공지사항_엑셀붙여넣기_구조보존_사양서.md)
- `notice-clipboard.test.ts`의 기존 `preserves plain clipboard tabs and normalizes only line endings` 검증을 기준으로 한다.
- 현황 훅의 콜백은 기존 `ea020e60` 변경에서 제거됐으며 현재 공개 인자는 `appliedFilters, enabled` 두 개다.

## 검증 계약

- `normalizeClipboardTextForEditor('가\t나\r\n다\t라')`는 `가\t나\n다\t라`다. 셀 경계인 탭을 표시용 파이프로 바꾸지 않는다.
- HTML 안전 정규화와 표 감지 검증은 유지한다.
- 비활성 현황 훅은 요청하지 않는다. 활성화·필터 변경 시 요청하고 로딩 상태를 표시한다.
- 필터가 바뀌면 이전 요청을 취소하고 늦게 도착한 응답은 무시한다. 최신 응답의 건수만 적용하고 unmount 시 최신 요청도 취소한다.
- 제거된 콜백의 호출 횟수 대신 실제 로딩 상태를 검증하며 오류·retry·상세 상태 테스트를 삭제하지 않는다.
- 대상은 `frontend/tests/document-status-hooks.test.tsx`, `frontend/tests/rich-text-editor-clipboard.test.ts`뿐이다. 운영 코드·데이터 계약·권한은 변경하지 않는다.
