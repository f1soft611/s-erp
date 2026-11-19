# 공지 서버 댓글 동기화 의존성 상세사양서

[작업지시서](../../directions/20261118/20261118_051_comment-sync-deps_작업지시서.md)와 [계획서](../../plan/20261118/20261118_051_comment-sync-deps_계획서.md)에 따른 의존성 완전 선언이다.

| 조건 | 결과 |
| --- | --- |
| 같은 revision·같은 서버 댓글 snapshot | no-op 복사를 생략해 local cache 변경으로 반복되지 않음 |
| 같은 revision·바뀐 서버 댓글 snapshot | 기존 이전 댓글 ID 보존·서버 최신 댓글 병합을 그대로 실행 |
| 바뀐 revision | snapshot 동일 여부와 무관하게 기존 effect 본문/ref 초기화 수행 |
| 로컬 추가·이전 댓글 로드 | 서버 payload가 그대로면 local cache·cursor·loaded·exhausted를 건드리지 않음 |
| 첫 interaction | 044의 미초기화 서버 cursor fallback과 명시적 undefined 초기화 구분 유지 |
| metadata만 변경 | 기존처럼 댓글 snapshot이 같으면 커서/로드 상태 초기화 없음 |

기존 모든 setter/updater와 ref 읽기/쓰기, 실행 순서를 바꾸지 않고 guard만 앞에 둔다. ref 접근을 render로 이동하지 않는다. 공개 props, 요청/응답, callback, JSX/CSS, 댓글 이미지 lifecycle, API/백엔드/DB 계약을 변경하지 않는다.

기존 effect의 no-op 경로는 값이 같은 map 복사 4개 및 같은 snapshot/revision ref 재대입뿐임을 소스로 확인한다. local cache dependency가 추가되어 생기는 추가 확인 pass는 이 guard에서 setter 없이 종료해야 한다. 기존 관련 회귀 5파일은 기준선/수정 후 모두 통과하고 actual lint RED는 누락 진단 1건이어야 한다.
