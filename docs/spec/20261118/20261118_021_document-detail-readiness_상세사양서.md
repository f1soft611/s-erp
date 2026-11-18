# 문서 상세 메뉴 준비 조건 상세사양서

- [계획서](../../plan/20261118/20261118_021_document-detail-readiness_계획서.md)는 [작업지시서](../../directions/20261118/20261118_001_repository-remediation_작업지시서.md)의 전체 CI 후속이다.
- wrapper의 문서 상세 heading은 데이터 로딩 중에도 존재할 수 있어 메뉴 준비의 증거로 사용하지 않는다.
- 참조 추가 성공·서버 실패·이미 참여한 사용자 세 기존 사례에서 실제 문서 더보기 button과 참조자 추가 menuitem을 비동기 조회 후 클릭한다.
- 실제 detail fetch·갱신 지연 응답·선택 후보·저장 payload·시스템 timeline·오류·중복 통지·refresh 횟수 단언은 그대로 유지한다.
- mock 추가나 운영 코드·API/DB·의존성·전역 timeout·source skip/retry·순서 변경은 없다. 테스트 전용이므로 신규 스크린샷 대상이 아니다.
