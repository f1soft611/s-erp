# F1-Grid 셀 범위 초기화 및 드래그 성능 결과

## 근거와 범위

- [작업지시서](../../../directions/20261027/20261027_019_f1grid-range-reset-and-drag-performance_작업지시서.md)
- [계획서](../../../plan/20261027/20261027_019_f1grid-range-reset-and-drag-performance_계획서.md)
- [상세 사양서](../../../spec/20261027/20261027_019_f1grid-range-reset-and-drag-performance_상세사양서.md)
- F1-Grid의 조회 로딩 상태, 셀 범위/복사 표시 및 드래그 포인터 행 탐색만 수정했다. 백엔드/API/DB/업무 데이터 변경은 없다.

## 재현과 원인

- 셀 범위를 드래그한 뒤 조회를 시작해도 범위·복사 표시와 포인터 드래그 참조가 초기화되지 않아 오버레이가 남을 수 있었다. 조회 직전 예약된 pointer RAF가 다음 드래그 상태에 반영될 가능성도 있었다.
- 포인터 위치에서 행을 찾을 때 `visibleRows.find`를 반복하고, 선택 오버레이 위치 계산도 `findIndex` 두 번을 수행했다. 수정 전 10,000행 가상화 테스트에서 포인터 한 번 이동 시 행 ID를 **30,020회** 읽어 행 수에 비례하는 비용을 확인했다.

## 수정

- 외부 `loading`, 내부 query, data-source loading을 합친 상태가 비활성에서 활성으로 전환될 때 셀 범위, 복사 범위, 진행 중 드래그 참조와 오버레이를 해제하고 예약된 pointer RAF를 취소한다. 행 checkbox 선택, 행 데이터와 편집 변경은 유지한다.
- 포인터 hit 테스트, fallback 셀 탐색, 경계 이동 및 오버레이 행 좌표는 기존 `rowIndexById`를 사용한다. DOM hit 테스트, 경계 이동 규칙, 가상화와 좌표 계산 방식은 유지한다.
- [F1-GRID.md](../../../../frontend/src/pages/f1-grid-docs/F1-GRID.md)에 조회 초기화와 행 인덱스 재사용 동작을 추가했다.

## 검증

| 항목 | 결과 |
|---|---|
| 새 회귀 테스트 | 조회 시 범위·복사 해제, 행 선택/변경 보존, pending pointer frame 취소, 10,000행 드래그 인덱스 조회 4건 통과 |
| 기존 범위/드래그 회귀 | 오버레이 좌표, 스크롤 중 드래그, 경계 이동, 인접/병합/pinned 셀 선택 7건 통과 |
| Chromium 375/768/1280px | 3건 통과. 조회 중/완료 후 범위 오버레이 없음, 브라우저 오류 및 페이지 가로 넘침 없음 |
| TypeScript/Vite `npm run build` | 통과 |
| 전체 `f1-grid.test.tsx` | 175건 중 129건 통과, 46건 실패. 실패는 깨진 한글 접근성 이름, 행 window 기대값 불일치, 포맷/병합/스타일 테스트 등에 걸쳐 있으며, 변경 범위와 무관한 케이스가 포함된다. 작업 전 전체 실행 기준선은 확보하지 못해 사전 실패 여부를 단정하지 않는다. |
| oxlint | 오류 없음. 기존 hooks 경고와 loading 전환에서 범위 상태를 동기화하는 effect 경고가 출력된다. |
| DB 변경 | 없음 |

전체 테스트의 실패 사례 중 가상 행 window 테스트는 `row-92`를 기대하지만 현재 DOM은 `row-96`부터 시작한다. 이 테스트는 범위/드래그 코드 경로를 사용하지 않으며, 넓은 테스트 파일의 다른 실패와 함께 별도 기준선 확인이 필요하다.

브라우저 검증은 이미 실행 중인 S-ERP Vite 개발 서버 `http://127.0.0.1:4173`에서 합성 10,000행으로 수행했다.

## 스크린샷

| 뷰포트 | 조회 완료 후 |
|---|---|
| 375px | [range-reset-375.png](screenshots/range-reset-375.png) |
| 768px | [range-reset-768.png](screenshots/range-reset-768.png) |
| 1280px | [range-reset-1280.png](screenshots/range-reset-1280.png) |
