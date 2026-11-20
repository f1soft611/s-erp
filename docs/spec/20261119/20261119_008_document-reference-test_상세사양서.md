# 문서 작성 참조자 테스트 안정화

[문서 작성 테스트 안정화 결과](../../result/20261118/repository-remediation/20261118_017_document-test-stability_결과.md)의 실제 다이얼로그 직접 렌더링 패턴을 후속 적용한다.

- 작업 범위는 `frontend/tests/document-write-page.test.tsx`의 `keeps reference users separate from approval stages` 한 케이스다. exact-lock 전체 실행에서 5초 시간 초과가 재현됐고, 단독 실행은 3.46초에 통과했다.
- 대시보드 렌더링과 문서 작성 열기 클릭을 실제 `DocumentComposerDialog`의 `open` 렌더링으로 대체한다. 준비 대기, 두 참조자 선택, 기존 참조자 표시 및 결재선 격리 단언은 그대로 유지한다.
- 기존 5초 제한, mock, 운영 코드, 구매 관련 파일, lint 설정 및 의존성은 변경하지 않는다. 다른 대시보드 통합 테스트는 그대로 둔다.
- 같은 lock으로 대상 테스트와 인접 참조자·결재선 사례를 실행한다. 전후 소요 시간은 관측값으로 기록하고 집중 테스트 통과를 전체 검증 통과로 해석하지 않는다. UI 변경이 없어 스크린샷 대상이 아니다.
