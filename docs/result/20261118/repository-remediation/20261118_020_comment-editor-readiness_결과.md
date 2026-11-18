# 댓글 editor 입력 전제조건 안정화 결과

- [계획서](../../../plan/20261118/20261118_020_comment-editor-readiness_계획서.md)
- [상세사양](../../../spec/20261118/20261118_020_comment-editor-readiness_상세사양서.md)
- 상태: **관련 네 파일 로컬·원격 71/71 통과. 전체는 별도 문서 상세 준비 1개 실패로 결과 021에 이어진다**.

## 공통 원인과 최소 수정

`25c264c7`의 run `44250745339`는 2,640/2,641 통과·공지 로컬 댓글 갱신 한 사례 실패였다. lint/typecheck/build는 성공했고 앞선 router와 문서작성도 통과했다. 이전 전체 실패 수를 소급해 바꾸지 않는다.

일반 댓글을 찾은 직후 아직 없는 입력 textbox를 동기 조회했다. 운영 `TiptapCommentThread.tsx:190-210`은 `useEditor({ immediatelyRender: false })`를 사용한다. 기존 댓글 표시와 editor 준비는 독립이다. [결과 018](20261118_018_ci-contract-stability_결과.md)의 실패 초안 한 곳 수정만으로는 동일한 입력 전제조건을 가진 다른 사례가 남았다.

실패마다 한 곳씩 반복 수정하는 대신 **같은 파일에서 실제 일반 댓글을 입력하는 남은 여섯 동기 조회 모두** 기존 findByRole 준비 대기로 맞췄다. 추가·capped comments·pagination/cursor·첨부 실패 정리·기존 세 댓글 이후 추가가 대상이다. 이미 비동기인 사례와 기존 댓글·payload·목록 재조회·cursor·업로드 정리·초안 보존 단언은 그대로 유지했다.

제품의 즉시 렌더 설정이나 실제 Tiptap을 바꾸지 않았다. 운영 코드·API/DB·의존성·전역 setup·테스트 순서·timeout·source skip/retry 변경은 없다.

## 검증

| 실행 | 결과 |
| --- | --- |
| 수정 전 원격 전체 | 2,640/2,641 통과, editor 준비 1개 실패 |
| 수정 후 공지·summary·수주현황·router 네 파일 전체, UTC/2 workers | **71/71 통과**, 제외 0, 57.03초 |
| 수정 후 lint | exit 0 |
| 03ff2be3 원격 전체 run 44252242430 | **2,640/2,641 통과, 문서 상세 준비 1개 실패**, 555.78초. 공지·summary·수주현황·router 71개는 통과 |
| 같은 원격 코드 lint/typecheck/build | 모두 성공, tests/required는 실패 |

기존 다른 관련 다섯 파일 223개 KST 통과와 문서작성 160개 원격 통과는 [결과 017](20261118_017_document-test-stability_결과.md)에 남겼다. 선택·관련 파일 통과를 전체로 바꾸지 않는다. UI 변경이 없어 신규 스크린샷 대상이 아니며 기존 화면 증거 15개는 보존한다.

새 실패는 상세 wrapper의 제목만 기다린 뒤 아직 데이터가 없는 메뉴를 동기 조회한 것이다. 실제 상세/메뉴 준비 조건을 정정한 [후속 결과 021](20261118_021_document-detail-readiness_결과.md)을 최신 전체 상태로 따른다.

동기화된 03ff2be3의 frontend 865개 byte hash 불일치, 후속 다섯 테스트의 case/expect 개수 변경, 운영 파일 변경과 신규 우회 설정은 모두 0임을 별도 확인했다.

## 잔여와 범위

기존 backend 1,286개 중 private profile 직접 읽기 오류 2개·제외 3개, npm advisory 2개/영향 패키지 9개(high 7/moderate 2), 실제 Java 8 runtime·실DB·실storage 미검증은 별도 잔여다. 비공개 파일이나 실제 자격 증명을 사용해 통과시키지 않았다. PR #76은 별도 head의 미해결 충돌이며, 다른 작업이 수행한 #82 병합은 이 작업의 승인·수행으로 표시하지 않는다.

후속 변경은 socra710 branch에 동기화하며 main 반영이나 PR 병합을 임의 수행하지 않는다.

## 복사용 커밋 문구

```text
test(notice): await real comment editors before input

- 지연 생성되는 실제 editor 입력 전제조건을 일관되게 대기
- 기존 저장·cursor·첨부 정리·목록 재조회 단언과 제한 시간 유지
```
