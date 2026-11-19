# 공통코드 삭제 메뉴 파생 상태 상세사양서

[작업지시서](../../directions/20261118/20261118_055_common-code-delete-state_작업지시서.md) → [계획서](../../plan/20261118/20261118_055_common-code-delete-state_계획서.md)를 따른다.

| 조건/이벤트 | 계약 |
| --- | --- |
| render | ref 조회 없이 기존 순수 삭제 정책으로 메뉴 disabled 계산 |
| 기존 자식/상세 존재 | 삭제 예약되지 않은 자식 그룹 또는 상세가 있으면 차단 |
| 마지막 상세 삭제 예약 | 같은 dirty batch 안에서도 그룹 삭제 메뉴 활성 |
| 일부만 삭제 예약 | 남은 자식/상세로 계속 차단 |
| saving | 기존 삭제 메뉴/편집 잠금 유지 |
| 동일 삭제 ID payload | 같은 상태 반환, 불필요한 반복 렌더 방지 |
| 새 그리드/변경 초기화 | 기존 onChangesChange의 빈 삭제 목록으로 상태 초기화 |
| 실제 이벤트/저장 | 기존 ref 기반 최신 변경 조회와 guard/오류/미저장 보호 유지 |

기존 getGroupDeleteBlockedMessage와 normalizeRowId를 그대로 재사용한다. 삭제 정책을 새로 만들지 않고 render의 입력 소유권만 바꾼다. 실제 이벤트의 isGroupDeleteDisabled와 저장 검증은 상태 snapshot으로 대체하지 않는다. F1Tree/F1Grid 공통 소스·API/서비스/DB/SQL·의존성은 변경하지 않는다.

두 번째 상세 삭제 뒤 dirty=true가 같아 부모 render가 생략되는지 먼저 실제 회귀로 확인한다. 재현하지 못하면 원인을 재조사하고 런타임 결함 해결로 기록하지 않는다. 실패 회귀와 별개로 기존 render ref lint 진단의 실제 RED를 보관한다.
