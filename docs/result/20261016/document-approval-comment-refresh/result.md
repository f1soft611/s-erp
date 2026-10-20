# 문서 상세 액션 후 댓글 즉시 갱신 결과

## 재현 조건 및 원인

문서 상세에서 승인, 반려, 보완요청 또는 결재 취소를 성공적으로 처리한다.
액션 API가 시스템 메시지를 기록한 뒤에도 컴포넌트의 댓글 상태를 다시
조회하지 않았고, 일반 결재 액션은 상세를 닫아 생성된 메시지를 바로 볼 수
없었다.

## 변경 내용

- [DocumentApprovalDetailFeed.tsx](../../../../frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx):
  결재/반려/보완요청 및 두 취소 성공 후 기존 상세 새로고침 경로와 최신 통합
  댓글 페이지 재조회를 수행한다. 일반 결재 성공 후 상세를 열린 상태로 유지한다.
- [document-write-page.test.tsx](../../../../frontend/tests/document-write-page.test.tsx):
  서버 응답 시스템 메시지 표시, 상세 유지, 문서 재조회, 댓글 조회 오류와
  결재 액션 실패를 검증하는 회귀 테스트를 추가/보강했다.
- API, DB, 백엔드 및 공지사항 댓글 동작은 변경하지 않았다.

## 검증 결과

| 검증 | 결과 |
|---|---|
| 변경 전 집중 회귀 테스트 | 7개 중 새로 추가한 동작 관련 6개 실패, 기존 관련 1개 통과 |
| 변경 후 집중 회귀 테스트 | 통과: 7개, 실패 0개 (`vitest run tests/document-write-page.test.tsx -t 'detail approval\|detail .* cancellation\|refreshing comments fails\|reason dialog with retry'`) |
| 추가 격리 회귀 검증 | 통과: 액션/취소/사유 재시도 및 피드 댓글 페이지네이션 8개 |
| 전체 `document-write-page.test.tsx` | 1회 실행 결과 실패: 12개, 통과: 87개 |
| 기준 전체 `document-write-page.test.tsx` | 변경 전 실패: 11개, 통과: 87개 |
| Frontend production build | 통과 (`npm run build`; chunk 크기 경고 출력) |

전체 파일의 기준 실행에서도 11개가 실패했다. 변경 후 전체 실행에서 관찰된
실패 대부분은 기준에도 있던 결재 취소, 툴바, 취소 버튼 및 레이아웃 테스트다.
추가로 한 번 실패한 피드 댓글 페이지네이션 테스트는 단독 실행 및 액션 테스트와
함께한 격리 실행에서 통과했다. 전체 테스트 결과는 안정적으로 통과한다고
확정할 수 없으며, 이번 변경 경로는 집중 실행 7개와 추가 격리 실행 8개에서
통과했다.

## 브라우저 확인

공유 브라우저에서 `http://127.0.0.1:4173/groupware/doc/read` 접근 시
`/login`으로 이동했고, 로그인된 문서 상세를 열 수 없었다. 승인된 테스트 문서
또는 인증된 브라우저 세션도 제공되지 않아 결재 액션을 수행하지 않았다.
따라서 375px, 768px, 1280px 액션 후 브라우저 확인 및 스크린샷은 수행하지
못했다. 실제 브라우저 반응형 확인은 미완료다.

## 변경 범위 점검

- 소스 변경은 `DocumentApprovalDetailFeed.tsx`와 관련 테스트 한 파일에 한정했다.
- 상세 화면에 로그인된 안전한 테스트 문서가 준비되면 세 뷰포트 검증 및
  비민감 스크린샷을 추가해야 한다.
