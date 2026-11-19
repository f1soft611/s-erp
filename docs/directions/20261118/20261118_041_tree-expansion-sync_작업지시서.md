# F1Tree 펼침 상태 동기화 작업지시서

- 근거: 잔여 lint 순차 처리 요청, [트리 정책 사양](../../spec/20261118/20261118_010_tree-policy-alignment_상세사양서.md), [F1-GRID](../../../frontend/src/pages/f1-grid-docs/F1-GRID.md).
- 범위: F1Tree의 defaultExpandAll 동기식 state effect 1개와 onChangesChange callback dependency 1개다.
- allParentIds 참조/defaultExpandAll 변경 시 기존 펼침 집합에 부모를 합치는 의미를 유지한다. 같은 입력의 사용자 접기, 초기 defaultExpanded, 빈 부모 목록, 하위 행 폼 적용·취소, 변경 콜백을 보존한다.
- 계획 → 사양 → 첫 commit 회귀 RED → 최소 구현 → 관련 검사 → 실제 트리 3폭/이벤트 → F1-GRID·결과/이미지 → 별도 커밋·푸시 순서다.
- grid projection/cache/ref/JSX/공개 API·정렬/필터 보호·backend/DB/의존성은 변경하지 않는다. lint 우회나 부모 rows의 임의 복사는 금지한다.
