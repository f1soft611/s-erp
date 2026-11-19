# 문서작성 테스트 경계·비동기 대기 안정화 결과

- [계획서](../../../plan/20261118/20261118_017_document-test-stability_계획서.md)
- [상세사양](../../../spec/20261118/20261118_017_document-test-stability_상세사양서.md)
- 이 단계의 경계·초기화 복구는 **관련 223개와 당시 원격 문서작성 160개 통과**로 확인했다. 이후 전체에서 발견된 별도 준비 경합과 **최신 전체 상태는 [결과 021](20261118_021_document-detail-readiness_결과.md)**을 따른다. 아래 당시 수치를 최신 저장소 전체 통과로 바꾸어 표현하지 않는다.

## 원인 계측과 최소 수정

앞선 새 lock 전체 12 timeout, 새 lock 두 파일 진단 9 실패, 구 lock 통제 비교 5 timeout은 [결과 013](20261118_013_compatible-dependencies_결과.md)의 RED 이력으로 보존했다. timeout만으로 dependency 회귀나 제품 오류를 확정하지 않았다.

실제 DocumentComposerDialog의 사용자 선택·첨부 처리만 검증하는 사례가 Dashboard 전체를 준비하고 열면서 비용을 중복 지불했다. 소유 격리 환경에서 동일한 두 사례를 단계 계측하고 실제 dialog 직접 렌더와 비교했다.

| 사례 | Dashboard 경계 | 실제 dialog 경계 |
| --- | --- | --- |
| 4번째 결재 wrapping 전체 본문 | 3,634ms | 2,620ms |
| 위 사례의 준비 완료 | 1,650ms | 950ms |
| 불명확 첨부 전체 본문 | 2,977ms | 1,394ms |
| 위 사례의 준비 완료 | 887ms | 384ms |

단일 계측값이지 통계적 성능 보장이나 제품 성능 수치는 아니다. 단언·API 경로를 유지하면서 불필요한 host 비용을 줄일 수 있음을 확인한 근거다.

- composer 전용 11개 사례만 실제 DocumentComposerDialog 직접 렌더로 바꿨다. hook/editor/picker/첨부·저장 서비스 호출은 계속 실제 경로이며 새 mock을 넣지 않았다.
- 초기에는 Dashboard의 닫기/재열기도 유지했다. 후속 전체 실패와 소유 책임 확인 후, 초기화만 단언하는 한 사례를 최소 controlled host로 정정했다. Dashboard 고유 열기·상신/닫기·피드·refresh 등 나머지 통합 사례는 유지한다.
- 닫기/재열기의 label·picker listbox 조회를 좁히고 실제 dialog instance를 유지하는 React open state로 제어한다. 실제 열기 버튼·닫기 callback·제거 대기·재열기와 기존 값·참여자 초기화 단언 및 10초 제한은 그대로다.
- pagination 뒤 교체될 수 있는 firstCard에 고정된 대기 대신 callback마다 현재 feed를 재조회한다. 같은 댓글 표시와 API ID/호출 횟수 단언은 유지했다.
- AST 비교에서 직접 `it` 호출 127개와 `expect` 호출 982개는 전후 동일하다. parameterized case를 포함한 실제 두 파일 실행 모수는 160개다. 단언 삭제·skip·재시도·시간 제한 상향은 없다.

## 검증

| 실행 | 결과 |
| --- | --- |
| 기존 전체 timeout 12개 + detached feed 1개 선택 | 13/13 통과, 나머지 143개는 이름 선택으로 미실행 |
| 문서작성 156 + 승인필드 4 전체, worker 1 | **160/160 통과**, 제외 0, 322.97초 |
| 해당 입력의 lint/typecheck | exit 0, lint 기존 경고 206 |
| 최초 수정 원격 전체 run 44243224117 | **2,638/2,641 통과, 3 실패**. 문서작성 156개는 모두 통과 |
| 같은 입력 로컬 전체, worker 2 | 알려진 실패 확인 후 186개 파일 보고 시점 중단. 완료 JSON·전체 통과 모수 없음 |
| 조회 축소만 적용한 관련 다섯 파일, KST/2 workers | 222/223 통과. 닫기/재열기 11,157ms timeout |
| controlled host 적용 후 해당 사례 선택 | 1/1 통과, 3,495ms. 나머지 155개는 이름 선택으로 미실행 |
| 최종 관련 다섯 파일, KST/2 workers | **223/223 통과**, 제외 0, 347.07초. 닫기/재열기 7,050ms |
| 후속 테스트의 lint | exit 0 |
| 후속 코드 d7e5e233 원격 전체 run 44248961094 | **2,640/2,641 통과, router 1개 실패**. 문서작성·승인필드 160개 모두 통과, lint/typecheck/build 성공 |

로컬 첫 전체에서는 같은 닫기/재열기가 10,850ms로 실패했다. 단독 실행과 파일 누적 실행의 차이를 메모리 누수나 제품 성능 문제로 확정하지 않는다. 다만 `useDocumentComposer.ts:715-754`가 제목·결재·참조 초기화를 직접 소유하며, `DocumentWritePage.tsx:424-429`의 부모 callback은 quiet refresh·detail 갱신까지 수행한다. 이 사례의 단언 대상에 불필요한 Dashboard 처리를 분리한 이유다. controlled host는 닫기 시 open만 false로 바꾸며 dialog의 key나 component type을 바꾸지 않아 재마운트로 초기화를 대신하지 않는다.

원격에서 남은 세 실패의 계약 수정과 UTC/KST 검증은 [후속 결과 018](20261118_018_ci-contract-stability_결과.md)에 분리한다.
새 전체에서 확인한 router의 분리 heading 단언은 [결과 019](20261118_019_router-dom-stability_결과.md)에 분리한다.

계측은 소유 worktree에서만 일시 적용한 뒤 원본에서 수정한 최종 테스트 파일로 교체해 모두 제거했다. 계측 로그와 원본 JSON은 세션 증거에 보관했다.

## 고정 입력과 동시 작업 보존

초기 11개 커밋 push 뒤 별도 작업이 `0e6c9bdf`로 기존 종합현황·수주현황 두 소스와 현황 문서를 커밋했다. 해당 커밋은 이 작업이 만들거나 되돌린 것이 아니다. 실행 중이던 두 파일 검사는 고정 입력을 바꾸지 않고 끝냈다.

최종 전체 검사 전에는 이제 tracked가 된 두 소스를 격리 worktree에 반영했다. **0e6c9bdf frontend + 이번 테스트 한 파일 수정**, tracked frontend **865개 전부의 byte hash 일치**를 확인해 고정했다. checkout의 CRLF/BOM 차이만 있던 22개도 원본을 복사해 정규화 추측 대신 실제 byte 일치로 확인했다. 검증 worktree의 Git HEAD 자체는 초기 기준이며 merge/reset하지 않았다.

운영 소스·API·DB·의존성 버전·공유 설치는 이번 단계에서 수정하지 않았다. UI 변경이 없는 테스트 전용 작업이므로 신규 화면 스크린샷 대상이 아니다. 기존 화면 증거 15개는 보존했다.

## 복사용 커밋 문구

```text
test(documents): bound composer scenarios and refresh feed queries

- 실제 dialog 경계로 중복 Dashboard 준비 비용 축소
- 비동기 교체되는 feed 노드 재조회
- 기존 단언·제한 시간·Dashboard 통합 검증 보존
```

후속 커밋 문구: `test(documents): isolate composer reset lifecycle without remounting`

최종 8937faec/run 44253972552는 226파일·2,641개 전체 및 lint/typecheck/build/required가 모두 통과했다. 원본 로그와 정확한 입력은 최신 결과 021에 기록했다. 위 표의 과거 실패·중단은 당시 이력으로 유지한다.
