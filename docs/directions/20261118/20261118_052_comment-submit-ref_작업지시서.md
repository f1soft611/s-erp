# 댓글 키보드 등록 callback ref 작업지시서

- 근거: 잔여 lint 순차 처리 요청과 TiptapCommentThread의 render 중 submitRef 대입 1건.
- [기존 댓글 입력 사양](../../spec/20260917/20260917_002_공지사항_댓글_피드형입력_개선_사양서.md)의 Enter 등록, Shift+Enter/IME 처리, 첨부·멘션, 성공 초기화/실패 초안 유지 계약을 보존한다.
- render 중 ref 대입이 Suspense로 commit되지 않은 등록 callback을 기존 DOM에 노출하는지 집중 회귀로 먼저 확인한다. 일반 commit 뒤에는 최신 callback/입력 상태를 사용해야 한다.
- 등록 함수·키보드 분기·UI는 그대로 두고 ref 게시 시점만 매 commit의 layout effect로 이동한다. pending render의 callback을 미리 게시하거나 editor/DOM/ref 동작을 render에 추가하지 않는다.
- 브라우저 검증에서 반복 첨부 선택의 같은 등록 payload 경합을 추가 확인했다. input을 비운 뒤 지연 state updater가 live FileList를 읽어 첨부가 유실된다. 이 handler는 기준 SHA와 같음을 대조했다. 등록 인자의 최신 파일 상태 보존과 직접 연관되어, 선택 시점의 파일 배열만 먼저 복사하는 최소 변경을 같은 단위에 포함한다.
- 계획 → 사양 → 기존 기준선/집중 runtime RED·lint RED → 최소 구현/회귀·정적 비교 → 실제 격리 댓글 입력/결과 → 선행 CI 완료 후 별도 커밋·푸시 순서다.
