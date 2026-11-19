# 공지 작성 초안 초기화 작업지시서

- 근거: 잔여 lint 순차 처리 요청과 NoticeComposerDialog 순수 필드 초기화 effect의 state/dependency 경고.
- [기존 작성창 사양](../../spec/20261002/20261002_007_공지사항_작성모달_다크_필드배경_사양서.md)의 입력/검증/첨부/에디터/저장 계약을 보존한다.
- 기존 초기화 조건은 open과 pasteDebugEnabled다. 기본값 props만 바뀌거나 테마가 바뀌어도 열린 초안을 초기화하지 않는다. 다음 열기나 기존 debug 모드 전환 때 최신 기본값을 적용한다.
- 순수 필드 setter만 guarded render state 동기화로 이동한다. editor/DOM/이미지 요청·URL/cleanup/ref·파일/저장·close lifecycle은 기존 commit/event/async 경로에 유지한다.
- 계획 → 사양 → 기존 동작 회귀 추가/기준선·대상 lint RED → 구현/동일 회귀/정적 비교 → 실제 격리 작성창/결과 → 별도 커밋·푸시 순서다.
