# F1-Grid select 편집 취소 결과

## 근거와 범위

- [작업지시서](../../../directions/20261027/20261027_018_f1grid-select-edit-cancel_작업지시서.md)
- [계획서](../../../plan/20261027/20261027_018_f1grid-select-edit-cancel_계획서.md)
- [상세 사양서](../../../spec/20261027/20261027_018_f1grid-select-edit-cancel_상세사양서.md)
- F1-Grid select 편집 이벤트만 변경했다. 백엔드/API/DB/스키마 변경과 업무 데이터 저장은 없다.

## 재현과 원인

1. `select` 셀을 편집하고 목록을 연다.
2. 메뉴가 열린 동안 다른 셀을 클릭하면 MUI의 바깥 클릭으로 편집은 닫히지만, 그리드 셀의 `mousedown`이 셀 범위 드래그를 시작해 드래그 오버레이가 남는다.
3. 수정 전 Chromium 회귀 테스트는 375/768/1280px 모두에서 드래그 오버레이 1건을 확인해 실패했다.

## 수정

- 활성 편집이 `select`일 때 외부 클릭은 값을 확정하지 않고 `stopEdit`으로 취소한다.
- GridRow는 `select` 편집 중의 셀 `mousedown`을 범위 드래그 시작으로 처리하지 않는다.
- 옵션 선택 경로와 다른 에디터의 외부 클릭 확정 흐름은 변경하지 않는다.
- [F1-GRID.md](../../../../frontend/src/pages/f1-grid-docs/F1-GRID.md)에 재현 조건과 기대 동작을 반영했다.

## 검증

| 항목 | 결과 |
|---|---|
| 새 Chromium 회귀 테스트 수정 전 | 375/768/1280px 모두 드래그 오버레이가 남아 실패 |
| 새 Chromium 회귀 테스트 수정 후 | 375/768/1280px 통과, 에디터 종료·원본 값 유지·변경 행 없음·종료 콜백 1회 확인 |
| select 편집 닫기/옵션 선택 관련 Vitest | 7건 통과 |
| TypeScript/Vite `npm run build` | 통과 |
| 변경 파일 oxlint | 오류 없음; 기존 React/ref/hooks 경고만 출력 |
| DB 변경 | 없음 |

기존 `f1-grid.test.tsx`의 관련 범위 전체 실행에는 깨진 한글 접근성 이름을 사용하는 기존 테스트가 남아 있다. 이 테스트는 `?占쎌꽦占?` 레이블 조회 실패로 중단되며, 새 브라우저 회귀와 수정한 이벤트 흐름은 별도로 통과했다. 관련 없는 테스트 문자열은 변경하지 않았다.

실제 Chromium 검증은 기존 `http://127.0.0.1:4173` S-ERP 개발 서버와 합성 데이터만 사용했다.

주요 검증 명령(`frontend`):

```powershell
node --test tests/f1-grid-select-cancel.browser.mjs
npx vitest run tests/f1-grid.test.tsx -t 'dismisses an unselected|exits a select editor|keeps a selected numeric code'
npm run build
npx oxlint src/shared/components/f1-grid/core/F1Grid.tsx src/shared/components/f1-grid/core/GridRow.tsx tests/f1-grid-select-cancel.browser.mjs
```

## 스크린샷

| 뷰포트 | 다른 셀 클릭 후 |
|---|---|
| 375px | [select-cancel-375.png](screenshots/select-cancel-375.png) |
| 768px | [select-cancel-768.png](screenshots/select-cancel-768.png) |
| 1280px | [select-cancel-1280.png](screenshots/select-cancel-1280.png) |
