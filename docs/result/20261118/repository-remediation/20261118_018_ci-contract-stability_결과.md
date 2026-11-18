# CI 플랫폼·준비 계약 안정화 결과

- [계획서](../../../plan/20261118/20261118_018_ci-contract-stability_계획서.md)
- [상세사양](../../../spec/20261118/20261118_018_ci-contract-stability_상세사양서.md)
- 이 단계의 세 계약 파일은 통과했다. 아래 전체 수치는 **당시 d7e5e233 실행의 이력**이며, 이후 공통 editor 준비 정정과 **최신 전체 상태는 [결과 021](20261118_021_document-detail-readiness_결과.md)**을 따른다.

## 원격 RED와 최소 수정

code commit `61a70ef4`의 run `44243224117`은 lint/build 성공, 테스트 2,638/2,641 통과·3 실패였다. 이 실패를 문서작성 실패로 합치거나 전체 통과로 바꾸지 않는다.

| 실패 | 확인한 원인과 수정 |
| --- | --- |
| notice-summary 이번 주 기대 3/실제 1 | 운영 계산은 브라우저 로컬 달력이다. 고정 +09:00 fixture 두 개가 UTC에서는 전주 일요일이 됐다. fixture와 현재 시각을 로컬 numeric Date로 맞추고 기대 통계·정렬은 유지했다. 제품을 KST 고정으로 바꾸지 않았다. |
| notice 실패 댓글 초안 | 초기 댓글 표시만 대기한 뒤 editor를 동기 조회했다. 실제 textbox 준비를 findByRole로 기다리며 오류·API 호출·초안 보존 단언은 유지했다. |
| 수주현황 컬럼 순서 | 별도 사용자 커밋 0e6c9bdf가 진행상태를 행 뒤로 옮겼다. 확정 순서로 기대 배열을 맞췄다. 옮겨진 컬럼은 초기 가상화 범위 밖이므로 실제 grid body 가로 스크롤 후 표시를 확인한다. |

운영 소스·API/DTO·DB·의존성·전역 TZ·source skip/retry·시간 제한은 변경하지 않았다. 이번 단계는 테스트 전용이므로 신규 화면 스크린샷 대상이 아니다. 기존 15개 화면 증거를 보존했다.

## 검증

| 실행 | 결과 |
| --- | --- |
| 수정 전 UTC summary/수주현황 선택 | 기존 두 실패 재현 |
| 세 CI 파일 UTC 전체, worker 1 | **63/63 통과**, 76.05초 |
| 문서작성 두 파일 포함 관련 다섯 파일 KST/2 workers | **223/223 통과**, 347.07초, 제외 0 |
| 후속 테스트 lint | exit 0 |
| 최종 ISO 문자열 fixture UTC/KST | 각각 summary 2/2 통과 |
| 후속 d7e5e233 원격 전체 run 44248961094 | **2,640/2,641 통과, router 1개 실패**, 646.70초. 이번 세 파일 63개와 문서 두 파일 160개는 통과 |
| 같은 원격 코드의 lint/typecheck/build | 모두 성공, tests/required는 실패 |

직접 검토에서 기존 정상 문자열 파싱 검증도 보존하도록 createdAt fixture를 로컬 numeric Date의 ISO 문자열로 직렬화했다. 현재 시각 인수만 Date 객체로 유지한다. 위 223개 실행 후 이 마지막 직렬화 변경은 summary 두 사례를 UTC/KST에서 별도 확인했고 최종 원격 전체 입력에도 포함했다. tracked frontend 865개의 root/소유 worktree hash 불일치와 새 우회 설정은 모두 0이다.

문서작성 닫기/재열기 추가 RED와 controlled host의 책임 근거·단언 보존은 [결과 017](20261118_017_document-test-stability_결과.md)에 기록했다. 최종 관련 실행의 직접 it 127개·expect 982개는 원격 기준 문서작성 테스트와 동일하다.

기존 로컬 전체는 알려진 실패가 확인되어 중단했으며 완료 JSON이 없다. 해당 부분 실행을 전체 통과로 사용하지 않는다. 세션 증거에는 UTC RED, UTC 63개 GREEN, KST 223개 GREEN의 로그와 JSON을 별도 보관했다.

새 원격 전체에서 남은 app-router-not-found의 분리 DOM 단언과 후속 검증은 [결과 019](20261118_019_router-dom-stability_결과.md)로 이어진다.

## 동기화와 잔여 위험

검증 중 다른 작업이 원격에 `b8c7e836` merge 이력을 올리고 PR #82를 병합했다. 이 작업에서 수행한 병합이 아니다. local HEAD 61a70ef4와 원격 b8c7e836의 tree ID가 같고 전체 tree diff가 비어 있음을 확인한 뒤 **ff-only**로 이력만 동기화했다. 사용자 작업을 되돌리거나 force push하지 않았다.

기존 backend 1,286개 중 private profile 직접 읽기 오류 2개·제외 3개, npm advisory 2개/영향 패키지 9개(high 7/moderate 2), 실제 Java 8 runtime·실DB·실storage 미검증은 이번 테스트 수정으로 해소되지 않는다. private 설정을 읽거나 생성해 통과시키지 않았다. 과거 PR #76의 상태와 이미 병합된 #82 및 후속 branch CI는 구별한다.

## 복사용 커밋 문구

```text
test: align CI fixtures with local dates and current grid contract

- UTC/KST 공통 로컬 달력 fixture와 editor 준비 대기
- 확정 컬럼 순서와 실제 가로 가상화 스크롤 반영
- 운영 코드와 기존 검증 단언·시간 제한 유지
```
