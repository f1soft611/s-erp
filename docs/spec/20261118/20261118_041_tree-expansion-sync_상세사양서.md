# F1Tree 펼침 상태 동기화 상세사양서

[작업지시서](../../directions/20261118/20261118_041_tree-expansion-sync_작업지시서.md)와 [계획서](../../plan/20261118/20261118_041_tree-expansion-sync_계획서.md)에 따른 내부 동기화 변경이다.

| 조건 | 기대 동작 |
| --- | --- |
| 초기 defaultExpandAll/defaultExpanded | 기존 초기 Set 계산 유지 |
| allParentIds 참조/defaultExpandAll 변경 + true + 부모 있음 | 기존 expandedIds에 현재 모든 부모를 합침; 기존 행 펼침은 첫 commit부터 반영 |
| 동일 rows 참조/rowKey/parentKey/flag에서 metadata 변경 | 사용자가 접은 상태 유지 |
| 필드가 같은 새 rows 배열 + true | 기존 allParentIds 참조 변경 의미대로 재펼침; 값 비교로 축소하지 않음 |
| flag false/undefined 또는 부모 없음 | 기존 expandedIds를 비우거나 재초기화하지 않음 |
| defaultExpanded만 변경 | 초기값 옵션이며 현재 사용자 펼침을 reset하지 않음 |
| 콜백 교체/셀 수정 | 현재 onChangesChange에 기존 payload 전달; 같은 콜백 metadata 변경은 callback identity 유지 |
| 하위 폼 | 취소는 부모 접기 유지; 적용한 새 하위 행만 pending insert를 소비하고 부모를 펼침 |

사용자 Set을 props-only 파생값으로 바꾸지 않는다. pendingChildInsertRef, treeIndexCacheRef, currentProjectionRef와 DOM 작업은 render guard로 옮기지 않는다. 공개 props/ref API, 정렬·필터 강제 비활성화, projection/checkbox/삭제 보호/JSX·CSS를 유지한다. onChangesChange는 기존 함수형 callback 계약이며 새 인수나 receiver 계약을 만들지 않는다.

첫 commit 회귀와 기존 최종 DOM 회귀를 구분한다. rows 교체 자체에 대한 F1Grid의 데이터 동기화는 이번 범위가 아니며, 새 데이터가 모두 첫 commit에 표시된다고 주장하지 않는다. backend/API/DB/의존성 변경이 없어 DB MCP·SQL 대상이 아니다.
