# 댓글 이미지 미리보기 순서 및 테마별 확대 뷰어 결과

## 요청 및 재현 조건

- 문서작성/공지작성 댓글에서 이미지 미리보기 영역을 첨부파일 목록보다 먼저 보여야 한다.
- 이미지 클릭 후 밝은 테마와 다크 테마에서 원본 색상/명암이 달라지거나 투명 영역이 배경과 섞여 보이지 않아야 한다.
- 이전 뷰어는 고정된 어두운 색상 배경을 사용했고, 투명 이미지의 배경 영역을 확인하기 어려웠다.

## 변경 내용

- 공통 댓글·답글 UI 순서를 본문 → 이미지 미리보기 → 첨부파일 목록으로 조정했다. 이미지와 파일 행 각각의 기존 순서는 유지한다.
- 공유 `ImageViewerDialog`의 표면/텍스트 색을 MUI 테마 palette에 맞췄다.
- 이미지 뒤에 테마별 명암의 체크무늬 캔버스를 추가해 투명 영역을 구별한다. 이미지 자체에는 CSS 필터나 블렌드 모드를 적용하지 않는다.
- 이미지의 기존 `src`/`alt`, 비율 유지, 뷰포트 내 표시, 닫기 동작은 보존했다.
- API, 데이터베이스, 인증 Blob 조회 및 object URL 수명 관리는 변경하지 않았다.

## 검증 결과

| 검증 | 결과 |
|---|---|
| RED 확인 | 새 순서 테스트 1개와 라이트/다크 뷰어 테스트 2개가 변경 전 기대대로 실패했다. |
| `npx vitest run tests/feed-components.test.tsx tests/image-viewer-dialog.test.tsx --reporter=verbose` | 통과: 40개 테스트 |
| `npx vitest run tests/document-write-page.test.tsx tests/notice-page-local-updates.test.tsx -t "comment image" --reporter=verbose` | 통과: 4개 관련 테스트 |
| `npm run build` | TypeScript 검사 및 Vite 빌드 통과. 기존 대형 번들 경고가 출력됨. |
| 브라우저 확인 | 합성 댓글/이미지로 375px, 768px, 1280px에서 확인. 모든 너비에서 미리보기 DOM이 첨부 목록보다 앞섰고 가로 overflow가 없었다. 라이트/다크 모두 이미지 원본 크기 240×160, `filter: none`, 체크무늬 캔버스 및 테마 surface 색을 확인했다. |

## 브라우저 스크린샷

댓글 영역:

- [375px](./screenshots/comments-375.png)
- [768px](./screenshots/comments-768.png)
- [1280px](./screenshots/comments-1280.png)

라이트 테마 확대 뷰어:

- [375px](./screenshots/viewer-light-375.png)
- [768px](./screenshots/viewer-light-768.png)
- [1280px](./screenshots/viewer-light-1280.png)

다크 테마 확대 뷰어:

- [375px](./screenshots/viewer-dark-375.png)
- [768px](./screenshots/viewer-dark-768.png)
- [1280px](./screenshots/viewer-dark-1280.png)

## 범위 및 데이터 안전성

브라우저 검증은 로컬 합성 SVG와 합성 댓글 데이터만 사용했다. 실제 댓글, tenant 데이터 또는 개인정보는 사용하지 않았다. API/DB 변경은 없다.
