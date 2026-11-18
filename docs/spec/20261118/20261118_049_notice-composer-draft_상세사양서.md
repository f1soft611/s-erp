# 공지 작성 초안 초기화 상세사양서

[작업지시서](../../directions/20261118/20261118_049_notice-composer-draft_작업지시서.md)와 [계획서](../../plan/20261118/20261118_049_notice-composer-draft_계획서.md)에 따른 상태 소유권 정리다.

## 선택과 보존

기본값 다섯 개를 effect dependency에 단순 추가하면 기본값 metadata/배열 참조 갱신 때 입력 중 초안을 지울 수 있으므로 채택하지 않는다. 기존 open/debug 조건을 상태로 추적하고 동일 컴포넌트의 raw setter만 조건부 실행한다. ref mirror·lint disable·microtask/helper 우회를 만들지 않는다.

| 조건 | 유지할 동작 |
| --- | --- |
| 최초 open | 제목/구분/팝업/종료일/첨부와 오류/debug가 기존 initializer 값 |
| 열린 상태의 기본값 교체 | 사용자 제목/선택/첨부 삭제/본문 등 초안 유지 |
| 테마/무관한 렌더 | 입력과 첨부 유지 |
| 닫힘 | 필드 reset 없음; 기존 editor blur/임시 이미지 cleanup/닫기 이벤트 유지 |
| 재열기 | 그때 최신 기본값과 기존 오류/debug 초기값 적용 |
| 열려 있는 debug flag 변경 | 기존처럼 필드/debug 초기화 |

기존 본문 defaultBody 변경 정책은 별도이며 바꾸지 않는다. editor.commands/DOM query/이미지 URL·요청·ref는 render로 이동하지 않는다. 저장 payload/권한/API/DB/패키지 계약·공개 props·JSX/CSS도 변경하지 않는다. DB MCP·SQL 대상이 아니다.

## 집중 회귀

실제 NoticeComposerDialog에 기본 제목/구분/팝업/종료일/첨부를 제공하고 제목을 수정·기존 첨부를 삭제한다. 열린 채 다음 기본값을 전달해 초안 보존을 확인하고 닫기/재열기 후 최신 기본값을 확인한다. 별도 jsdom URL의 noticePasteDebug를 전환해 기존 초기화도 유지하며 테스트 뒤 URL을 복원한다. 이 회귀는 기본값을 dependency에 단순 추가하는 구현과 debug 조건을 제거하는 구현을 방지한다.
