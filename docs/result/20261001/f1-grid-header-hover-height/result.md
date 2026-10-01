# F1-Grid 좁은 헤더 hover 높이 보정 결과

## 변경 내용

- 공용 헤더의 제목 텍스트에 한 줄 말줄임 스타일을 적용해 좁은 너비 및 hover 메뉴 공간 확보 시 줄바꿈으로 인한 헤더 높이 증가를 방지했다.
- 기존 columnheader `aria-label`에는 전체 제목을 유지하고, 메뉴 hover/focus 동작은 변경하지 않았다.
- F1-Grid 문서에 좁은 헤더 표시 규칙을 추가했다.

## 검증

- `vitest run tests/f1-grid.test.tsx -t "truncates narrow header names without changing their accessible name"`: 통과
- `npm run build`: TypeScript 검사 및 Vite 프로덕션 빌드 통과
- 실제 브라우저에서 컬럼 폭을 57px로 줄이고 제목 overflow를 재현했다. 텍스트 폭은 75px, 표시 폭은 8px이었으며 hover 및 메뉴 오픈 전후 헤더 행 높이가 모두 29.5px로 유지됐다. 메뉴는 표시되고 opacity 1을 확인했다.
- Playwright 캡처 스크립트: `frontend/scripts/capture-f1-grid-header-hover-height.js`
- 스크린샷: [narrow-header-hover.png](screenshots/narrow-header-hover.png)
- 함께 실행한 기존 정렬/필터 테스트 2건은 현재 버튼 이름과 불일치하는 깨진 인코딩의 테스트 문자열로 메뉴 버튼 조회에서 실패했다. 신규 동작과는 별개이며 이번 작업에서 수정하지 않았다.

## 영향 범위

- 공용 F1-Grid 헤더 표시만 변경했다.
- 백엔드, API, DB 변경 없음.
