# 저장소 순차 개선 최종 후속 결과

- [작업지시서](../../../directions/20261118/20261118_001_repository-remediation_작업지시서.md)
- 상태: **조사·안전 범위 수정 종료, 전체 복구와 병합 승인은 미완료**. 문서작성 테스트 안정성, 기존 백엔드 설정 의존 오류, advisory, PR 충돌이 남아 있다. 추가 운영 변경이나 실패 은폐로 완료 처리하지 않았다.
- [이전 종합 결과 009](20261118_009_repository-remediation-validation_결과.md)는 당시 실패와 보류를 기록한 이력이다. 그 실행을 소급해 통과로 바꾸지 않는다.

## 검증 입력과 공유 환경

- 격리 worktree의 Git HEAD는 최초 9a9b0729를 유지하고 bf6cf0bb tracked 프론트/백엔드 소스를 오버레이했다. 프론트의 22bd60b8 이후 변경은 PageSearchArea Portal 변경이며 이번 소스에 포함했다.
- 프론트엔드 소유 입력 28개의 SHA-256을 세션 증거로 고정했다. 별도 작업의 OverviewPage·salesOrderStatusColumns·종합현황 문서는 복사하거나 되돌리지 않았다. 공유 공간의 모든 미커밋 수정에 대한 검증이 아니다.
- 새 package-lock은 소유 worktree에서만 설치했다. 공유 서버·node_modules·비공개 properties·원격 브랜치는 보존했다. 공유 서버의 기존 설치를 새 lock의 증거로 쓰지 않는다.
- 커밋·푸시·merge/rebase·원격 보호 정책 변경은 하지 않았다.

## 기존 화면 영향 범위

| 운영 파일 | 최소 변경과 증거 |
| --- | --- |
| MenuManagementPage | 검색 지우기를 기존 페이지 세션에도 반영. [결과 001](20261118_001_menu-test-recovery_결과.md) |
| DashboardPage | 수동 logout 시 메뉴 페이지 세션도 정리. [결과 004](20261118_004_app-integration-tests_결과.md) |
| useNoticeInteractions | 구 상세 응답이 완료된 로컬 댓글·첨부 변경을 되돌리지 않도록 보존. [결과 002](20261118_002_notice-feed-test-recovery_결과.md) |
| DraftFormGrid | 기존 수정 권한·저장 잠금에 맞춰 PUT soft-disable 허용. [결과 008](20261118_008_draft-form-tests_결과.md) |
| PageSearchArea | 필드별 요청 토큰과 최신 draft 병합으로 지연 날짜 응답 무효화. [결과 012](20261118_012_quick-date-race_결과.md) |

위 다섯 파일 외 새 화면 기능을 구현하지 않았다. F1Tree/F1Grid 운영 코드는 그대로이며 최신 10월 사양의 정렬·필터 비활성화 계약으로 구형 테스트만 정정했다. [결과 010](20261118_010_tree-policy-alignment_결과.md)의 관련 63개가 통과했다.

문서작성 표시 전용 검증은 실제 승인 필드 컴포넌트로 이동하되 원래 표시 단언을 보존했다. 중복 준비 비용과 과도한 전역 DOM 조회를 줄였고 사용자 선택·추가·삭제 통합 케이스는 유지했다. [결과 011](20261118_011_document-presentation-test_결과.md)의 두 파일 전체 160개가 통과했다.

공개 props signature·endpoint·DTO·SQL/스키마·권한 정책·물리 DELETE는 변경하지 않았다. 모든 화면의 무영향을 보증하는 의미는 아니며 실제 동작 변경 다섯 묶음과 검사 범위를 명시한 것이다.

## 검증 결과

| 검사 | 확정 결과 |
| --- | --- |
| 새 exact-lock typecheck | exit 0. src와 Vite 설정 대상, tests 제외 |
| 새 exact-lock lint | exit 0, 경고 206·오류 0 |
| 새 exact-lock build | exit 0, 기존 대형 chunk 경고 유지 |
| 새 exact-lock 전체 frontend, CI와 같은 worker 2 | 226파일 중 225 통과·1 실패, 2,641개 중 2,629 통과·12 실패·제외 0, 1,422.69초 |
| 새 lock 문서 두 파일, worker 1 진단 | 160개 중 151 통과·9 실패. 전체 결과의 대체 근거가 아님 |
| 기존 lock 동일 소스·두 파일·worker 1 통제 비교 | 160개 중 155 통과·5 timeout. 새 설치는 비교 후 복원 |
| 날짜 경합 집중 회귀 | 수정 전 10개 실패 → 수정 후 관련 네 파일 54/54 통과 |
| backend 전체 전후 비교 | 양쪽 1,286개, 실패 0·기존 오류 2·기존 제외 3 |
| 전체 운영 Java `--release 8 clean compile` | exit 0 |
| 업데이트/전이 jar 9개 기본 bytecode | 모두 major 52 이하, versioned/module class 별도 |
| 실제 선택 FileUpload/Commons IO 조합 | 합성 multipart 메모리·디스크·byte 접근·쓰기 통과 |

백엔드 오류 둘은 비공개 profile 파일을 직접 읽는 기존 테스트다. 전체 backend가 초록색이라고 표현하지 않는다. 실제 Java 8 runtime·신규 JDBC의 실 DB 연결·실 업로드 저장소 연결은 시험하지 않았다. [의존성 결과 013](20261118_013_compatible-dependencies_결과.md)에 상세 전후 비교가 있다.

### 남은 문서작성 실패와 중단 근거

최종 전체의 12개 실패는 전부 document-write-page.test.tsx의 timeout이다. 승인·합의 4개, 템플릿 로딩 1개, 닫기/재열기·저장 2개, 이미지·첨부 5개다. 기존 제한 5초 10개, 10초/15초 각 1개를 그대로 유지했다. 다른 225개 파일은 이번 전체 실행에서 통과했다.

별도 새 lock 문서 진단은 timeout 8개와 분리된 DOM 노드에 대한 단언 1개로 실패했다. 기존 lock 통제 비교도 timeout 5개가 남는다. 기존 불안정성이 재현됐지만 새 dependency의 성능 영향 유무까지 확정한 것은 아니다. 앞선 결과 011의 160 통과는 당시 증거로 보존하며 현재 전체 안정성을 뜻하지 않는다.

중복 표시 준비 제거와 준비/첨부 조회 범위 축소만으로 집중 실행은 통과했으나 최종 실행에서는 충분하지 않았다. 실행 범위·시간에 따라 실패 집합이 바뀌므로 근거 없이 다른 화면 로직을 바꾸거나 timeout을 늘리는 추가 시도는 중단했다. **문서작성 fixture의 대기/분리 노드·전역 접근 비용을 계측하고 안전한 테스트 경계를 정하는 후속 작업이 차단 해제 조건**이다. 새 lock 후보도 그때까지 통합 보류다.

## 남은 위험과 다음 조치

1. **문서작성 안정화 우선:** 위 12개 전체 실패와 별도 DOM 분리 단언 원인을 계측해 정리한다. 기존 lock에서도 실패하므로 단순 버전 되돌리기나 timeout 상향을 해결로 간주하지 않는다. 이후 정확한 소스·lock으로 전체 검사를 다시 수행한다.
2. **통합 차단:** PR #76은 충돌 중이고 tests/required 실패다. 로컬 미커밋 복구와 원격 PR은 별개다. 승인된 통합 브랜치에서 충돌 해결 후 정확한 커밋으로 CI를 다시 실행해야 한다.
3. **advisory 잔존:** 독립 advisory 2개, 영향 package 9개(high 7/moderate 2)가 남는다. picomatch는 확인 시 패치가 없고 uuid는 ExcelJS 간접 경로다. 강제 다운그레이드/major override 대신 upstream 호환 갱신과 도달성 검토가 필요하다.
4. **백엔드 CI 공백:** Java 8 API compile gate를 먼저 제안하며, 비공개 설정 직접 의존 테스트를 안전한 fixture 계약으로 정리한 뒤 전체 test gate를 추가한다. 현재 workflow나 원격 정책을 변경하지 않았다.
5. **기존 별도 UI 모드:** 빠른 검색 슬롯 없는 합성 호스트의 375px 가로 넘침은 미해결이다. 표준 searchField 호스트의 경합·반응형 증거를 모든 모드의 검증으로 일반화하지 않는다.
6. **검증 한계:** lint 경고, tests 타입 검사 공백, 실제 Java 8/DB/저장소와 native 입력 미검증은 남는다. 브라우저는 합성 데이터·격리 profile의 DOM 이벤트 검증이며 각 결과의 한계를 유지한다.

[PR·CI 결과 014](20261118_014_pr-ci-readiness_결과.md)에 관측 상태와 후속 gate 제안을 정리했다. 보호 API 404를 보호 부재로 단정하지 않았다.

## 화면 증거와 정리

다섯 동작 변경의 375/768/1280px 스크린샷 15개는 같은 결과 폴더의 `screenshots`에 보관했다. 날짜 경합의 세 이미지는 [결과 012](20261118_012_quick-date-race_결과.md)에 직접 연결했다. native 입력 보호로 DOM 이벤트를 사용한 범위, 빈 슬롯 모드의 넘침을 숨기지 않는다.

임시 harness HTML·소유 브라우저 탭/profile을 정리했다. 공유 서버 HTTP 200과 임시 HTML 부재를 재확인했다. DB는 read-only MCP metadata만 확인했고 데이터·스키마 변경이 없으므로 SQL 생성 대상이 아니다.

마지막 영속성 검사에서 소유 frontend 입력 28개의 root/검증 worktree hash 불일치 0, 날짜별 문서 42개의 상대 링크 오류 0, diff 공백 오류 0을 확인했다. 추가된 skip/todo·전역 timeout/retry 설정은 0이다. 새 lock의 네 package 설치 버전을 재확인했고 HEAD bf6cf0bb와 공유 서버를 보존했다. 테스트 복구 및 의존성 통합 승인은 차단 상태로 남기며 완료로 표시하지 않았다.

## 복사용 커밋 문구

```text
fix: 저장소 회귀와 빠른 날짜 요청 경합 복구

- 현행 문서에 맞춘 테스트 계약과 준비 비용 정리
- 다섯 운영 회귀 최소 수정 및 호환 의존성 갱신
- 전체 검증 결과와 잔여 advisory·PR·CI 제약 기록
```

커밋은 생성하지 않았다.
