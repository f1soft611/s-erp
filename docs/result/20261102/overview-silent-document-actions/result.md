# 종합현황 문서 액션 조용한 갱신 결과

## 구현

- 종합현황에서 문서 상세를 여는 기존 오버레이 경로는 유지했다.
- 승인, 반려, 보완요청, 참조확인, 최종확인 성공 뒤 overview summary와 상세를 quiet 모드로 재조회한다. 요청 중 기존 화면과 상세 내용을 유지하며 액션 버튼의 중복 처리 방지/성공 알림/실패 오류는 그대로 둔다.
- quiet summary 갱신 중 권한과 선택 월이 유지되면 수주 데이터를 재조회하지 않아 무관한 수주 위젯의 skeleton 전환을 막는다.
- 상세 panel은 quiet reload에서 댓글과 상세를 한 번씩 갱신한다. feed 모드에는 기존 부모 refresh 흐름을 유지한다.
- API 및 DB 계약 변경은 없다.

## 재현 조건과 원인

- 종합현황에서 결재/확인 문서 액션을 완료한다.
- 부모의 일반 overview refresh가 overview 데이터를 일시적으로 비워 전체 skeleton을 표시했고, 상세도 일반 재조회로 loading overlay를 표시했다.
- 성공 핸들러에는 quiet 옵션이 적용되지 않았고, panel의 quiet 상세 효과와 성공 핸들러 양쪽에서 댓글을 조회할 수 있었다.

## 검증

- `npx vitest run tests/overview-page.test.tsx`: 20개 통과. 조용한 summary 재조회 중 기존 패널/상세 유지 및 완료 후 새 summary 반영을 검증.
- `npx vitest run tests/document-status-page.test.tsx`: 29개 통과.
- `npx vitest run tests/document-write-page.test.tsx -t 'submits a detail approval directly|processes a detail REJECTED|processes a detail RETURNED|confirms the drafter final line|confirms only the authenticated employee reference|shows reference-confirmation failures|keeps an approval successful when refreshing comments fails'`: 8개 통과.
- `npm run build`: 통과.
- 변경 파일 대상 `npx oxlint ...`: 오류 없이 종료. `DocumentApprovalDetailFeed.tsx`에 기존 effect state 설정 경고가 있다.
- 저장소 전체 `npm run lint`는 기존 `tests/common-code-management-page.test.tsx:53`의 조건부 `useImperativeHandle` 규칙 오류로 실패했다. 이 작업 범위 밖 파일은 수정하지 않았다.
- `git diff --check`: 통과.

## 브라우저 확인

- `127.0.0.1:4173` 서버는 응답했지만 브라우저가 `/login`으로 이동해 인증된 종합현황에 접근할 수 없었다.
- 인증 정보를 사용하거나 다른 계정으로 로그인하지 않았으며, 375px/768px/1280px 실제 종합현황 검증과 스크린샷 저장은 수행하지 못했다. UI 레이아웃 변경은 없다.
