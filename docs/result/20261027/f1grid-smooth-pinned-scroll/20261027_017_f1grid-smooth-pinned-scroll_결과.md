# F1-Grid 고정 컬럼 스크롤 자연스러움 개선 결과

## 작업 내용

- 본문 네이티브 가로 스크롤과 기존 헤더/본문 `scrollLeft` 동기화, CSS sticky 고정은 유지했다.
- 비가상화 그리드에서는 가로 스크롤 위치만으로 viewport React state를 갱신하지 않도록 했다.
- 열 가상화가 켜져 있을 때는 pinned/protected 열을 포함해 계산한 가상 열 집합이 바뀌는 경우에만 수평 위치 state를 갱신한다. 같은 창 안의 이동은 불필요한 렌더를 생략한다.
- RAF 스케줄러는 실제 viewport 값이 이전 값과 같으면 `setState` 자체를 호출하지 않는다. 세로 위치, viewport 크기, 스크롤바 gutter 측정은 유지된다.
- F1-GRID 개발 문서에 스크롤 상태/가상화 계약을 추가했다.

## 원인 및 재현

컬럼 고정은 `position: sticky`로 처리되지만, 본문 `scroll` 이벤트가 매 프레임 `scrollLeft`를 포함한 viewport state를 예약하고 있었다. 가로 스크롤 중 가상 열 창이 동일한 상황에서도 F1Grid가 다시 렌더되어 헤더선/열 경계의 페인트가 스크롤을 뒤따르는 것처럼 보일 수 있었다.

재현은 열 고정 후 body scroll 영역의 `scrollLeft`를 바꾸며 스크롤하는 것이다. 수정 후 비가상화 표와 가상 창 내부의 이동은 React commit을 만들지 않으며, 가상 창 경계를 넘어가는 경우에만 다음 표시 열 집합으로 렌더한다.

## 검증

| 검증 | 결과 |
|---|---|
| 새 회귀 테스트: 비가상화 수평 이동 중 commit 없음 | 통과 |
| 새 회귀 테스트: 같은 가상 창 이동 중 commit 없음, 창 변경 시 열 갱신 및 pinned 열 유지 | 통과 |
| `npx vitest run tests/f1-grid.test.tsx -t 'does not rerender a non-virtualized grid for horizontal scrolling|updates virtualized columns only when the rendered column window changes|moves the virtual column window on horizontal scroll and selects the mounted cell|keeps the header scroll range aligned with the body'` | 4개 테스트 통과 |
| `npx vitest run tests/f1-grid-virtualization.test.ts tests/f1-grid-pinned-column-range.test.tsx tests/f1-grid-render-performance.test.tsx tests/f1-grid-row-selection.test.tsx` | 4개 파일, 41개 테스트 통과 |
| `node --test tests/f1-grid-smooth-scroll.browser.mjs` | Chromium 375px/768px/1280px 3개 테스트 통과 |
| `npm run build` | 통과 |
| `npx oxlint src/shared/components/f1-grid/core/F1Grid.tsx tests/f1-grid.test.tsx tests/f1-grid-smooth-scroll.browser.mjs` | 오류 없이 통과. F1Grid 기존 경고만 출력 |
| `npm run lint` | 실패. 기존 `tests/common-code-management-page.test.tsx:53`의 조건부 `useImperativeHandle` hook 규칙 오류. 이번 변경 파일 외부 |

브라우저 검증은 기존 S-ERP Vite 서버 `http://127.0.0.1:4173`에서 합성 행/열을 사용했다. 좌/우 고정 열 위치, 스크롤 중 헤더-본문 동기화, 본문과 헤더의 열 x 좌표 일치, 스크롤 끝의 정렬, 페이지 레벨 가로 넘침, 브라우저 오류를 확인했다.

스크린샷:

- [375px](screenshots/pinned-scroll-375.png)
- [768px](screenshots/pinned-scroll-768.png)
- [1280px](screenshots/pinned-scroll-1280.png)

## 변경 파일

- `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
- `frontend/tests/f1-grid.test.tsx`
- `frontend/tests/f1-grid-smooth-scroll.browser.mjs`
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- 작업지시서/계획서/상세사양서: `docs/directions/20261027`, `docs/plan/20261027`, `docs/spec/20261027`

DB/API/백엔드 변경 없음.
