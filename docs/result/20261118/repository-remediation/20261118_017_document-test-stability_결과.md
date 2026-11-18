# 문서작성 테스트 경계·비동기 대기 안정화 결과

- [계획서](../../../plan/20261118/20261118_017_document-test-stability_계획서.md)
- [상세사양](../../../spec/20261118/20261118_017_document-test-stability_상세사양서.md)
- 현재 상태: **집중·두 파일 전체 통과, 최종 전체 frontend 검증 중**. 선택 실행이나 두 파일 결과를 전체 통과로 바꾸어 표현하지 않는다.

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
- Dashboard에서 열기·닫기·재열기, 저장 후 상신/닫기, 피드·refresh 등 통합 사례는 기존 host를 유지했다.
- 닫기/재열기 사례의 제목 조회는 동일 공개 label로 바꿨다. 기존 값·초기화 단언과 10초 제한은 그대로다.
- pagination 뒤 교체될 수 있는 firstCard에 고정된 대기 대신 callback마다 현재 feed를 재조회한다. 같은 댓글 표시와 API ID/호출 횟수 단언은 유지했다.
- AST 비교에서 직접 `it` 호출 127개와 `expect` 호출 982개는 전후 동일하다. parameterized case를 포함한 실제 두 파일 실행 모수는 160개다. 단언 삭제·skip·재시도·시간 제한 상향은 없다.

## 검증

| 실행 | 결과 |
| --- | --- |
| 기존 전체 timeout 12개 + detached feed 1개 선택 | 13/13 통과, 나머지 143개는 이름 선택으로 미실행 |
| 문서작성 156 + 승인필드 4 전체, worker 1 | **160/160 통과**, 제외 0, 322.97초 |
| 해당 입력의 lint/typecheck | exit 0, lint 기존 경고 206 |
| 최신 frontend 전체, worker 2 | 실행 중 |

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

최종 전체 상태와 원격 검사 결과는 후속 검증이 끝난 뒤 추가한다.
