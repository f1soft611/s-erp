# 문서작성 피드 답글 기본 접힘 결과

## 요청 및 반영

- 최종 정정 요청에 따라 댓글 전체가 아니라 **답글만** 기본 접힘으로 변경했다.
- 후속 요청으로 문서 상세에도 기본 접힘을 적용했다. `DocumentApprovalDetailFeed.tsx`의 `expandReplies` 전달을 제거해 공통 기본값 false를 사용한다.
- 피드 댓글 본문·입력창은 그대로 표시하고, 기존 `답글 N개` 버튼으로 답글을 열고 닫는다.
- 리스트형 상세 패널에서도 댓글·입력창은 표시하고 답글만 기본 접힘으로 시작한다.
- 공통 댓글 컴포넌트, 공지사항, 백엔드, API, DB는 변경하지 않았다. DB MCP 확인 및 스키마 스크립트는 적용 대상이 아니다.

## 원인 및 회귀 검증

- 기존에는 피드/패널 모두 `expandReplies`를 true로 전달하여 답글이 항상 열린 상태로 시작했다.
- 기존 `CommentThread` 옵션만 분기하므로 댓글 등록, 답글 작성 후 자동 펼침, 페이징 및 권한 로직을 변경하지 않는다.
- 피드/패널 회귀 테스트 2개를 추가했다. 최초 피드 변경 전 피드 테스트 실패를 확인했고, 상세 추가 적용 전에는 패널 테스트가 `aria-expanded=true`로 실패하는 것을 확인했다. 최종적으로 두 화면 모두 false 기대값으로 통과했다.
- 테스트 실행에 필요한 기존 서비스 mock의 누락된 `getExternalLinkPreview`를 추가했다.

## 검증 결과

- `npx vitest run tests\document-write-page.test.tsx tests\document-feed-item.test.tsx -t 'keeps comments visible with replies initially collapsed|keeps the notice-style owner menu|mounts its complete detail card' --reporter=dot`: 4개 통과.
- 변경 컴포넌트·테스트·브라우저 스크립트 대상 `npx oxlint`: 오류 없음. 기존 effect 내부 setState 경고 5개는 변경하지 않았다.
- `npm run build`: 성공.
- `node tests\document-feed-replies.browser.mjs`: 375/768/1280px 모두 피드와 문서 상세에서 댓글 및 입력창 표시, 답글 최초 접힘, 펼침/다시 접힘, 가로 넘침 없음, pageerror 없음 확인.
- 이미 실행 중인 S-ERP `http://127.0.0.1:4173` 서버를 재사용했으며 해당 서버를 종료하지 않았다. API는 가상 데이터로 대체했다.
- 추가로 실행한 기존 `renders every filtered document as a complete feed card` 테스트는 현재 페이지 계약과 달리 배열을 반환하는 기존 mock 때문에 피드가 표시되지 않아 실패했다. 이 작업의 답글 표시 옵션과 무관한 목록 mock 변경은 하지 않았다. 전체 테스트 통과로 보고하지 않는다.
- 변경 diff를 확인했으며 실제 제품 코드는 표시 옵션 1줄만 변경했다. 기존 다른 작업의 변경사항은 유지했다.

## 스크린샷

| 너비 | 기본 접힘 | 펼침 |
|---|---|---|
| 375px | [접힘](screenshots/replies-collapsed-375.png) | [펼침](screenshots/replies-expanded-375.png) |
| 768px | [접힘](screenshots/replies-collapsed-768.png) | [펼침](screenshots/replies-expanded-768.png) |
| 1280px | [접힘](screenshots/replies-collapsed-1280.png) | [펼침](screenshots/replies-expanded-1280.png) |

문서 상세 추가 확인:

| 너비 | 기본 접힘 | 펼침 |
|---|---|---|
| 375px | [접힘](screenshots/detail-replies-collapsed-375.png) | [펼침](screenshots/detail-replies-expanded-375.png) |
| 768px | [접힘](screenshots/detail-replies-collapsed-768.png) | [펼침](screenshots/detail-replies-expanded-768.png) |
| 1280px | [접힘](screenshots/detail-replies-collapsed-1280.png) | [펼침](screenshots/detail-replies-expanded-1280.png) |

기준: [작업지시서](../../../directions/20261029/20261029_009_document-feed-replies_작업지시서.md), [계획서](../../../plan/20261029/20261029_009_document-feed-replies_계획서.md), [상세 사양서](../../../spec/20261029/20261029_009_document-feed-replies_상세사양서.md).
