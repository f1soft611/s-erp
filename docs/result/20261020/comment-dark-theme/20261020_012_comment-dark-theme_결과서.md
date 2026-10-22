# 문서·공지 댓글 다크 테마 수정 결과

## 요구 및 근거

- [작업지시서](../../../directions/20261020/20261020_012_comment-dark-theme_작업지시서.md)
- [계획서](../../../plan/20261020/20261020_012_comment-dark-theme_계획서.md)
- [상세 사양서](../../../spec/20261020/20261020_012_comment-dark-theme_상세사양서.md)
- 사용자 승인: 공통 댓글에서 현재 테마 자동 적용.

## 재현 조건과 원인

문서 상세의 `DocumentApprovalDetailFeed`는 `CommentThread`에 `isDark`를 전달하지 않는다. 공통 컴포넌트는 생략된 값을 `false`로 고정해, 앱의 다크 텍스트와 라이트 첨부 카드·입력창·아바타가 섞였다. 공지 화면은 기존에 명시적으로 값을 전달하고 있다.

변경 전 새 회귀 테스트에서 다크 테마의 첨부 배경 및 테마 전환 테스트 두 건이 예상대로 실패했다.

## 수정 내용

- `TiptapCommentThread`에서 `useTheme()`로 앱 테마를 읽는다.
- `isDark` 생략 시 앱 테마를 사용하고, 명시적 `true`/`false`는 기존처럼 우선한다.
- 결정된 값을 기존 전달 경로로 첨부파일·다운로드 버튼·아바타·댓글·답글·수정 입력창 및 선택 첨부 행에 함께 적용한다.
- 기존 이미지 미리보기 순서 변경과 뷰어 변경은 보존했다.
- 합성 브라우저 fixture에서 테마 prop을 생략해 실제 누락 조건을 검증한다.
- 이미지 원본, 저장/삭제/다운로드 로직, 백엔드/API/DB는 변경하지 않았다.

## 검증 결과

| 검증 | 결과 |
| --- | --- |
| 변경 전 새 회귀 테스트 | 2건 실패, 라이트 및 명시값 호환 3건 통과 |
| `feed-components.test.tsx` 전체 | 43건 통과 |
| `npm run build` | 성공; 기존 크기 임계치를 넘는 번들 경고 출력 |
| 넓은 페이지 포함 4파일 테스트 실행 | 157건 통과, 60건 실패; 시간 초과, 중복 텍스트, 요소 조회 실패 등. 전체 통과 아님 |
| 병렬 부하 확인용 전체 직렬 재시도 | 장시간 실행으로 중단; 완료 근거로 사용하지 않음 |
| 동일 4파일에서 테마·댓글·이미지·첨부 관련 선택 직렬 실행 | 14건 통과, 2건 실패, 나머지 제외 |
| 최종 테마·문서/공지 댓글 이미지·댓글/답글 수정 선택 직렬 실행 | 4파일 모두 통과, 12건 통과, 205건 제외 |
| `git diff --check` | 통과 |

선택 실행 실패는 공지 테스트의 `keeps the comment draft and does not render a failed comment`(댓글 입력 textbox 조회 실패)와 `keeps a comment attachment and shows an error when deletion fails`(첨부 파일명 조회 실패)이다. 이번 수정으로 발생했는지는 수정 전 동일 실행과 비교하지 않아 단정하지 않는다. 무관한 페이지/테스트 수정으로 범위를 넓히지 않았다.

통과한 선택 테스트에는 새 테마 회귀 테스트 5건, 문서 댓글 이미지 표시/다운로드·미리보기 오류, 공지 댓글 이미지 표시·다운로드·미리보기 오류, 댓글·답글 수정 흐름이 포함된다.

최종 선택 실행 명령:

```powershell
node .\node_modules\vitest\vitest.mjs run tests\feed-components.test.tsx tests\document-write-page.test.tsx tests\notice-page.test.tsx tests\notice-page-local-updates.test.tsx --no-file-parallelism -t 'resolves comment surfaces|updates comment surfaces|comment image|adds a nested reply|edits and deletes a comment' --reporter=verbose
```

이 최종 선택 실행의 통과는 앞서 확인한 넓은 테스트 묶음의 실패가 해소되었다는 뜻은 아니다.

### 브라우저

기존 S-ERP 개발 서버 `http://127.0.0.1:4173`를 재사용했으며 종료하지 않았다. 합성 fixture에 대해 별도 headless Playwright 브라우저를 실행해 공유 브라우저 창의 크기 변경 간섭 없이 검사한 후 브라우저를 종료했다.

라이트/다크 × 375/768/1280px 여섯 조합 모두:

- 댓글/답글 첨부 행 3개의 배경색이 기대값과 일치했다.
- 댓글/답글 입력창 2개의 배경색이 기대값과 일치했다.
- 다크 첨부 배경 `rgba(30, 41, 59, 0.8)`, 입력창 배경 `rgba(15, 23, 42, 0.76)`, 라이트는 흰색이다.
- 페이지 `scrollWidth`는 뷰포트 너비와 일치했고, 버튼이 뷰포트 밖으로 잘리지 않았다.
- 선택 첨부 파일을 포함한 스크린샷을 보관했다. 테마 전환 중 선택 파일과 답글 입력 상태를 유지했다.
- 실제 인증된 문서/공지 전체 화면이 아닌 공유 컴포넌트 fixture를 검증했다.

| 너비 | 라이트 | 다크 |
| --- | --- | --- |
| 375px | [스크린샷](screenshots/light-375.png) | [스크린샷](screenshots/dark-375.png) |
| 768px | [스크린샷](screenshots/light-768.png) | [스크린샷](screenshots/dark-768.png) |
| 1280px | [스크린샷](screenshots/light-1280.png) | [스크린샷](screenshots/dark-1280.png) |

## 자체 검토 및 제한

- 선택적 prop 타입, 명시적 `false`, 재귀 답글 전달, 테마 전환과 기존 기본 MUI 라이트 테마 동작을 확인했다.
- 기존 작업 트리의 다른 변경은 되돌리지 않았다. 커밋은 생성하지 않았다.
- DB 작업이 없어 DB MCP 및 SQL 변경은 해당하지 않는다.
- 테마 수정 자체와 브라우저 기준은 검증했으나 페이지 전체 테스트는 실패가 남아 있다.
