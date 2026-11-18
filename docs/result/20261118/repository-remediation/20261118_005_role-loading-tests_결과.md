# 권한관리 로딩 테스트 복구 결과

- [계획서](../../../plan/20261118/20261118_005_role-loading-tests_계획서.md), [상세사양서](../../../spec/20261118/20261118_005_role-loading-tests_상세사양서.md).
- 잠금 설치 기준 기존 실패 3개는 제거된 스켈레톤 식별자와 과거 검색 제목을 기대했다. `7cb277e8`의 공통 본문 변경에서 `GridLoadingSkeleton` import/렌더링이 제거된 이력과 현재 F1-Grid 사용 문서를 확인했다.
- 현재 전체 오버레이, busy 상태, 지정 높이, 직접 자식/inset 배치, 입력 차단, 스피너와 헤더를 검증한다. 실제 첫 조회 완료 후 정상 행과 로딩 해제를 기다린다.
- 저장 후 조용한 조회의 기존 부정 단언도 실제 `f1-grid-loading-overlay`를 확인하도록 바꿔, 삭제된 test id 때문에 자동 통과하던 검증을 강화했다.
- 검색은 실제 역할 검색 입력의 placeholder와 권한 그리드를 검증한다. 이전 제목을 운영 화면에 복원하지 않았다.

## 검증

`22bd60b8` 프론트 소스 오버레이 + 이번 복구 변경, 잠금 설치 Vitest 4.1.12 기준:

```powershell
node .\node_modules\vitest\vitest.mjs run tests\role-management-notification.test.tsx --pool=threads --maxWorkers=1 --reporter=default --no-color
.\node_modules\.bin\oxlint.cmd tests\role-management-notification.test.tsx
```

**53개 전부 통과**, 해당 파일 lint 종료 코드 0. 저장 잠금·실패 후 재시도·중복 요청 방지·stale 응답·사용자 매핑 단언도 함께 통과했다. 새 skip이나 시간 제한 상향은 없다.

F1-Grid 사용 문서에 현재 로딩 검증 기준을 보완했다. 운영 코드·UI·API·DB를 변경하지 않아 신규 스크린샷, DB MCP, SQL 스크립트는 해당 없음이다. 다른 테스트 실패는 별도 진행 중이며 전체 프론트 통과로 집계하지 않는다.

후속 전체 실행에서는 2개가 기본 5초 제한을 초과했고, 해당 2개를 포함한 선택 재검증은 통과했다. 이어 문서작성과 함께 실행한 두 파일 전체 210개 검사에서도 권한관리는 53개 전부 통과했다. 이 결과들과 [종합 검증 결과](20261118_009_repository-remediation-validation_결과.md)의 전체 실행 결과를 구분한다.

## 복사용 커밋 문구

```text
test(roles): 현재 공통 로딩 상태로 회귀 검증 갱신

- 첫 조회 헤더·busy·오버레이와 완료 후 행 검증
- 조용한 저장 재조회의 실제 오버레이 부재 검증
```

커밋은 생성하지 않았다.
