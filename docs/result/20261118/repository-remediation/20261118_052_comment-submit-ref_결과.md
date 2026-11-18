# 댓글 등록 payload 소유권 결과

## 범위와 원인

[작업지시서](../../../directions/20261118/20261118_052_comment-submit-ref_작업지시서.md) → [계획서](../../../plan/20261118/20261118_052_comment-submit-ref_계획서.md) → [상세사양](../../../spec/20261118/20261118_052_comment-submit-ref_상세사양서.md) 순서로 진행했다. 운영 변경은 TiptapCommentThread 한 파일의 두 경합으로 한정했다.

1. render에서 submitRef를 갱신하면 나중 렌더가 Suspense로 commit되지 않아도 기존 화면의 Enter가 새 callback을 호출한다. ref 초기값·소비자·submit 함수는 유지하고 매 commit의 useLayoutEffect에서만 최신 closure를 게시한다. deps 생략은 editor/파일/멘션/상위 callback의 매 commit 반영을 위한 것이며, 등록 실행이나 editor 재생성을 추가하지 않는다.
2. 실제 검증에서 성공 후 같은 editor에 파일을 다시 선택하면 첨부가 빠지는 경합을 발견했다. native change는 파일 1개를 관찰하지만 input clear 뒤 지연된 state updater가 live FileList 0개를 읽었다. 기준 SHA와 같은 기존 handler임을 확인하고, 구현 전에 문서 범위를 갱신한 뒤 두 번째 RED를 추가했다. 선택 시점 배열만 먼저 복사하고 기존 누적·input clear·등록 payload 계약은 유지한다.

기존 submit 본문·passive effect·멘션/IME/키보드/버튼 분기·기타 JSX/CSS·공개 props·API/백엔드/DB·의존성은 바꾸지 않았다. 직접 관련된 파일 payload 경합 외 다른 기능은 확장하지 않았다.

## 검증

| 항목 | 결과 |
| --- | --- |
| 기준선 | 기존 관련 3파일·89개 통과 |
| callback RED | commit되지 않은 callback 호출 1회로 새 집중 회귀 실패 |
| 파일 RED | 같은 act의 파일 2개 선택 후 Enter에서 1개 누락으로 새 집중 회귀 실패 |
| 수정 후 같은 범위 | **3파일·91개 통과**, 기존 테스트 선언 모두 보존 |
| 정적 검증 | typecheck/build exit 0, 기존 chunk 경고 유지 |
| 전체 lint | **90→89**, 제거 1/새 진단 0; exhaustive-deps 0 |
| source/AST | import/layout wrapper/선택 파일 snapshot 외 운영 코드 동일, frontend 890파일 byte 차이 0 |

파일 테스트는 native input clear가 live FileList를 비우는 동작을 모델링한다. 기본 jsdom 배열 주입만으로는 이 브라우저 경합이 재현되지 않는다. 실제 등록 callback의 두 File payload를 검증하며 운영 setter나 submit을 mock하지 않는다.

[범위 근거](screenshots/comment-submit-ref/scope-audit.json) · [실제 브라우저 검증](screenshots/comment-submit-ref/verification.json)

## 실제 브라우저

공유 4173 서버를 재사용하고 소유 탭의 실제 CommentThread/Tiptap editor에서 native 키 입력과 파일 선택을 실행했다. 모든 fetch를 차단하고 탭 한정 메모리 저장소·합성 callback만 사용했다. 운영 API·실제 저장소·공유 서버를 변경하지 않았다.

**375/768/1280px 각각 동일 editor 인스턴스에서** 아래를 확인했다.

- Shift+Enter 줄바꿈/등록 없음, callback revision·테마 변경 뒤 본문/첨부 유지.
- 일반 Enter는 최신 commit callback에 현재 본문과 파일 1개를 전달하고 성공 후 초기화.
- 성공 뒤 같은 파일을 다시 선택해도 첨부 유지. 합성 실패는 본문/파일을 보존하고 재시도 성공은 모두 초기화.
- 총 등록 시도 9회(성공 6/합성 실패 3), 알 수 없는 요청 0, 문서 가로 넘침 0.

Suspense 시점은 집중 Vitest에서 검증했으며 native 브라우저 coverage로 확대하지 않는다. IME/멘션은 기존 소스 분기와 관련 회귀를 유지했으며 이번 브라우저가 native 입력기/멘션 선택을 모두 실행했다는 의미가 아니다. 진단용 이전 탭은 닫은 뒤 새 realm에서 전체 3폭 시나리오를 재실행했다.

| 폭 | 이미지 |
| --- | --- |
| 375 | [본문·첨부 보존](screenshots/comment-submit-ref/draft-375.png) · [실패 후 보존](screenshots/comment-submit-ref/failed-375.png) |
| 768 | [본문·첨부 보존](screenshots/comment-submit-ref/draft-768.png) · [실패 후 보존](screenshots/comment-submit-ref/failed-768.png) |
| 1280 | [본문·첨부 보존](screenshots/comment-submit-ref/draft-1280.png) · [실패 후 보존](screenshots/comment-submit-ref/failed-1280.png) |

## CI와 잔여

[051의 정확한 SHA 전체 CI](20261118_051_comment-sync-deps_결과.md) **226파일·2,680개**와 네 job success를 원본 집계로 확인했다. 그 실행 완료 뒤에만 이번 변경을 별도 커밋·비강제 푸시한다. 이번 052의 정확한 SHA 전체 CI는 별도로 확인하며 선행 결과를 재사용하지 않는다.

052 커밋 `6b1ddea406921c9d00f5608da930c0a9f4b87a7b`의 [정확한 SHA CI](https://github.com/f1soft611/s-erp/actions/runs/44344493963)를 별도로 확인했다. 원본 마지막 집계 **226파일·2,682개**, tests/build/lint/required 네 job 모두 success이며 [확인 근거](screenshots/comment-submit-ref/remote-ci.json)를 보관했다. 원격 SHA 일치와 소유 탭 정리도 확인했다.

최초 206개 중 117개를 제거했고 **89개 경고는 순차 처리 중**이다. exhaustive-deps 0/state-in-effect 82/ref 7이다. 공식 호환 경로 없는 권고 2건은 [027](20261118_027_dependency-remediation-boundary_결과.md)의 BLOCKED를 유지한다. 기존 TreeProjection 3단계 및 자료실 모바일 관찰은 이 단위에서 수정하지 않았다.

```text
fix(frontend): 댓글 등록 callback과 첨부 payload 경합 보완

- 키보드 submit ref는 commit된 closure만 게시
- input clear 전 선택 파일 snapshot으로 지연 updater의 첨부 유실 방지
- 두 runtime RED/관련 91개·실제 3폭 검증, lint 90→89
```
