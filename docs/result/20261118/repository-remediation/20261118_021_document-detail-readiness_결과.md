# 문서 상세 메뉴 준비 조건 안정화 결과

- [계획서](../../../plan/20261118/20261118_021_document-detail-readiness_계획서.md)
- [상세사양](../../../spec/20261118/20261118_021_document-detail-readiness_상세사양서.md)
- 상태: **해당 참조 추가 세 사례 3/3 통과, 새 code commit 전체 원격 검증 대기**.

## 원격 RED와 공통 전제조건

`03ff2be3`의 run `44252242430`은 2,640/2,641 통과·문서 상세에서 참조자를 추가하는 한 사례 실패였다. lint/typecheck/build는 성공했고 앞선 공지·router 71개는 통과했다.

테스트는 `문서 상세` heading을 찾은 직후 아직 없는 `문서 더보기` button을 동기 조회했다. 운영 `DocumentApprovalDetailFeed.tsx:2219-2231`의 PostDetailPanel 제목은 데이터와 별개이고, 실제 toolbar는 `1262`행의 status/kind 및 `1367`행의 detail 조건 이후 나타난다. wrapper 제목이 실제 메뉴 준비를 보장하지 않는다.

같은 전제조건을 가진 **참조 추가 성공·실패·중복 세 사례**에서 실제 button과 menuitem을 각각 findByRole로 기다리도록 맞췄다. 기존 heading 대기, detail API·갱신 지연 응답·선택 후보·저장 payload·시스템 timeline·오류·중복 처리·refresh 횟수 단언은 그대로다. 이미 실제 card를 기다리는 다른 상세 사례는 변경하지 않았다.

## 검증

| 실행 | 결과 |
| --- | --- |
| 수정 전 정확한 원격 전체 | 2,640/2,641 통과, 상세 메뉴 준비 1개 실패 |
| 수정 후 같은 세 사례, UTC/2 workers | **3/3 통과**, 2,307/892/828ms. 다른 153개는 이름 선택으로 미실행 |
| 수정 후 lint | exit 0 |
| 정확한 새 코드 원격 전체 | push 후 별도 기록 |

운영 코드·공개 props/API·DB·의존성·전역 setup·테스트 순서·제한 시간·source skip/retry는 바꾸지 않았다. UI 변경이 없어 신규 스크린샷 대상이 아니며 기존 15개를 보존한다. 이전 실패·중단과 각각의 로컬 JSON·원격 로그는 별도 증거로 유지한다.

## 잔여와 동기화 범위

기존 backend 1,286개 중 비공개 profile 직접 읽기 오류 2개·제외 3개, npm advisory 2개/영향 패키지 9개(high 7/moderate 2), 실제 Java 8 runtime·실DB·실storage 미검증은 남는다. 비공개 파일이나 실제 자격 증명을 사용하지 않았다. 미해결 PR #76은 별도 head이며, 다른 작업의 #82 병합은 이 작업이 수행·승인한 것으로 표시하지 않는다.

작업별 커밋을 socra710 branch에 non-force push하며 main 반영·PR 병합·원격 보호 변경은 임의 수행하지 않는다.

## 복사용 커밋 문구

```text
test(documents): wait for loaded reference-action controls

- 상세 wrapper가 아닌 실제 button·menuitem 준비 대기
- 기존 참조 추가 성공·실패·중복 단언과 제한 시간 유지
```
