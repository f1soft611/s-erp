# 공지 피드 표 서식 및 가로 스크롤 결과

## 변경 내용

- 공통 `sanitizeHtml` 기본 동작은 유지하고, opt-in `preserveTextStyles`에서만 `span`과 안전한 글꼴/크기/색상/강조 스타일을 보존한다.
- 공지 저장은 notice 전용 sanitizer를 사용해 편집기 서식을 기존 HTML body 필드에 보존한다. API 필드, JSON 계약, DB는 변경하지 않았다.
- 피드 표시에서는 안전하게 정리된 HTML의 표를 `.tableWrapper`로 감싸고, 작성기와 같은 `noticeContentStyles`의 내부 가로 스크롤을 사용한다. 저장 HTML에는 layout wrapper를 추가하지 않는다.
- 댓글과 다른 공통 sanitizer 소비자는 변경하지 않았다.

## 검증

- `npm --prefix frontend run test -- tests/sanitize-html.test.ts`: 통과, 7개.
- `npm --prefix frontend run test -- tests/notice-html.test.ts`: 통과, 3개.
- `npm --prefix frontend run test -- tests/sanitize-html.test.ts tests/notice-html.test.ts tests/notice-clipboard.test.ts tests/notice-composer-payload.test.ts`: 통과, 4개 파일 38개.
- Vitest `--testNamePattern="preserves notice typography and wraps wide tables"`로 피드 접힘/펼침 회귀 테스트 단독 실행: 통과, 1개.
- `npm --prefix frontend run build`: TypeScript 및 Vite production build 통과.
- `git diff --check`: 통과.

## 브라우저 확인

| 뷰포트 | 본문 폭 | 표 wrapper client/scroll 폭 | 문서 scroll 폭 |
| ------ | ------: | --------------------------: | -------------: |
| 1280px |   651px |               651px / 889px |         1280px |
| 768px  |   571px |               571px / 889px |          768px |
| 375px  |   194px |               194px / 889px |          375px |

각 폭에서 `overflow-x: auto`가 표 wrapper에 적용되고 문서 전체 가로 넘침은 발생하지 않았다. 실제 Excel clipboard를 작성기에 붙여넣은 뒤 `font-family: "맑은 고딕"`과 8–22pt 선언 및 404개의 font-style 적용 노드를 확인했고, 제목 셀은 22pt(29.33px)로 계산됐다. 현재 피드에서 확인한 기존 저장본은 이 변경 전 저장되어 inline 폰트 서식이 이미 제거된 데이터다. 새로 붙여넣은 본문을 저장하면 이를 복구할 수 있으나, 이번 확인에서는 저장을 수행하지 않았다. 저장/피드 sanitizer의 실제 Excel 값(`"맑은 고딕", monospace`, `22pt`) 보존은 focused 회귀 테스트로 검증했다.

## 캡처

- [1280px](screenshots/notice-feed-table-1280.png)
- [768px](screenshots/notice-feed-table-768.png)

375px 측정은 수행했으나, 공유 페이지의 작성기 오버레이가 캡처에 포함되어 모바일 캡처 파일은 결과물에 포함하지 않았다. 측정값은 위 표에 기록했다.
