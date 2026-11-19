# 자료실 파일 편집 초안 동기화 상세사양서

[작업지시서](../../directions/20261118/20261118_039_archive-draft-sync_작업지시서.md)와 [계획](../../plan/20261118/20261118_039_archive-draft-sync_계획서.md)의 UI state phase 변경이다. 기준은 기존 ArchiveFileEditDialog 자체이며 셸/레이아웃/이벤트는 그대로다. API 데이터 계약/DB는 변경하지 않아 DB MCP·SQL 대상이 아니다.

| 입력/행위 | 기대 동작 |
|---|---|
| 첫 file가 non-null | fileName과 categoryCode/null-fallback부터 state 초기화 |
| file 객체 참조 변경 | 이름/폴더를 현재 file로 초기화하고 오류 제거; 열린 교체의 첫 commit부터 반영 |
| 필드가 같은 새 file 객체 | 원래 `[file]`와 동일하게 초기화 |
| file가 null | 이름/폴더/오류를 비우고 모달 닫힘 |
| 동일 file의 categories/saving/콜백 변경 | 편집/오류 보존; saving은 기존 입력/버튼 비활성화와 닫기 guard에만 반영 |
| 재개방 | 현재 file의 이름/폴더, 오류 없음; 추가 저장 호출 없음 |

파일명은 기존처럼 trim 후 1~200자를 검증한다. 활성 폴더만 선택하며 빈 선택은 root의 null이다. onSave의 기존 file 객체·payload 구성, truthy 결과 후 닫기/null 결과 오류/예외 메시지 보존은 변경하지 않는다. 서버 정규화/경로 검증/권한/요청 취소는 이 모달 변경 범위가 아니다.

첫 commit은 Profiler로 확인하며 실제 브라우저는 합성 파일과 실제 공통 셸/저장 버튼/폼을 사용한다. 3폭의 가로 넘침·입력·선택·검증·실패 후 초안·saving 차단·저장·취소를 검증하되 서버 저장 전체 회귀라고 표현하지 않는다.
