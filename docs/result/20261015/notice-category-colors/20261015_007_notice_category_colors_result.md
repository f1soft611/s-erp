# 공지 분류 색상 결과

## 적용 내용

- `noticeGubunCode`를 trim한 뒤 Unicode code point 기반 unsigned 32-bit rolling hash로 hue를 계산하는 프론트엔드 resolver를 추가했습니다.
- 라이트/다크 테마별 HSL 배경색과 글자색을 반환하고, 코드가 없거나 공백이면 기존 파란색 표시를 유지합니다.
- 공지 피드의 분류 칩에만 색상을 적용했습니다. 분류명, 필터, 중요도/상단고정 표시, API 및 DB 계약은 변경하지 않았습니다.
- 미등록 분류 코드도 별도 등록 없이 동일 규칙으로 색상을 받습니다.

## 검증 결과

| 항목 | 결과 |
|---|---|
| resolver 및 분류 칩 집중 테스트 | 통과: 10 tests |
| `npx vitest run tests/notice-category-presentation.test.ts tests/notice-page.test.tsx` | 38 통과, 기존 실패 1건 |
| 실패한 기존 테스트 | `keeps the initial skeleton loading state without showing a preloaded notice list`: `notice-feed-skeleton`을 찾지 못함. 구현 전 확인된 기존 실패이며 이번 변경 범위에서는 수정하지 않음 |
| Frontend Problems 검사 | resolver, 피드 컴포넌트, 관련 테스트 오류 없음 |
| `npm run build` | 통과. 기존 큰 번들 경고 출력 (index JS 1,052.87 kB) |
| `git diff --check` | 통과 |

브라우저에서 공지 목록을 열 때 공통코드 및 공지 목록 API가 `ERR_CONNECTION_REFUSED`로 실패했습니다. `mvn spring-boot:run`도 8080 포트 점유로 새 백엔드를 시작하지 못했고, 기존 포트 프로세스는 중단하지 않았습니다. 포트 루트는 HTTP 200을 반환했지만 현재 브라우저의 인증 갱신이 실패해 로그인 화면으로 이동했습니다. 그러므로 실제 데이터가 표시된 공지 분류 칩의 화면 캡처 및 브라우저 시각 검증은 수행하지 못했습니다. 단위/렌더링 테스트에서 라이트·다크 색상, 라벨 유지, 상단고정 상태의 독립성을 확인했습니다.

## 구현 파일

- [noticeCategoryPresentation.ts](../../../../frontend/src/pages/groupware/community/notice/data/noticeCategoryPresentation.ts)
- [NoticeFeedList.tsx](../../../../frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx)
- [notice-category-presentation.test.ts](../../../../frontend/tests/notice-category-presentation.test.ts)
- [notice-page.test.tsx](../../../../frontend/tests/notice-page.test.tsx)

## 후속 확인

백엔드/인증 API가 실행 가능한 환경에서 공지사항 페이지를 다시 열어 실제 분류 코드가 서로 다른 칩 색으로 표시되는지 확인해야 합니다.
