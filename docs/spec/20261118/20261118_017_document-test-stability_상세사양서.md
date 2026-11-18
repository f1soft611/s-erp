# 문서작성 테스트 안정화 상세사양서

- [계획서](../../plan/20261118/20261118_017_document-test-stability_계획서.md)는 [작업지시서](../../directions/20261118/20261118_001_repository-remediation_작업지시서.md)의 다음 단계다.
- 수정 대상은 document-write-page.test.tsx와 문서다. 운영 소스·공개 API·DB·의존성 버전·전역 setup/timeout은 바꾸지 않는다.
- 결재 순서/선택 후보, 합의, 편집 잠금, 저장 payload, 업로드 대기·재시도·불명확 상태 처리 단언은 그대로 유지한다.
- 테스트가 Dashboard 동작을 검증하지 않을 때만 실제 DocumentComposerDialog 직접 렌더를 허용한다. 실제 composer hook과 editor, 사용자 선택 UI, 서비스 호출은 계속 검증한다.
- Dashboard 열기/닫기·성공 후 화면 갱신·필터/피드 통합 검증은 기존 경계를 보존한다.
- 비동기 교체될 수 있는 feed DOM은 대기 callback 안에서 현재 노드를 재조회한다. timeout 증가나 실패 단언 제거로 바꾸지 않는다.
- 계측을 통해 확인한 비용만 줄이고 추가 제품 기능·화면 성능 리팩터링을 하지 않는다.
- 새 전체 실행이 실패하면 해당 실패를 그대로 기록한다. 과거 전체 12개나 구 lock 실패를 소급해 통과로 바꾸지 않는다.
