# 메뉴 관리 트리 필터/정렬 우클릭 정합 결과

## 변경 내용

- `F1Tree`가 공용 `F1Grid`의 필터 및 정렬 활성화 정책을 그대로 사용하도록 변경했다.
- 메뉴 관리 트리 우클릭 메뉴에서 필터 및 정렬 상태를 각각 해제할 수 있게 했다.
- 공용 F1-Grid 문서의 F1Tree 컨텍스트 메뉴 설명을 현재 동작에 맞게 갱신했다.

## 검증

- `npx vitest run tests/f1-grid-context-menu.test.tsx -t "clears tree sorting|clears tree filters"`
- 결과: 2 passed, 0 failed
- `npm run build`
- 결과: 실패. 이번 변경과 무관하게 기존 `src/shared/components/f1-grid/core/GridCell.tsx`의 `isActiveMergeGroup` 미사용 변수(`TS6133`)로 TypeScript 컴파일이 중단됐다.
- `node scripts/capture-menu-tree-filter-sort-context-menu.js`
- 결과: 실패. 메뉴 관리 화면 진입과 모듈/권한 선택은 완료했으나, 필터 입력 조회에 사용한 Playwright `getByLabelText` 메서드가 존재하지 않아 캡처 전에 중단됐다.

## 공용 컨텍스트 메뉴 회귀 검증

```text
npx vitest run tests/f1-grid-context-menu.test.tsx
```

- 결과: 18 passed, 0 failed
- 기존 경고: jsdom의 문서 이동 미구현 경고가 1건 발생했다.

## 스크린샷

- 브라우저 캡처는 Playwright locator 오류로 생성되지 않았다.
- `scripts/capture-menu-tree-filter-sort-context-menu.js`의 `getByLabelText`를 `getByLabel`로 바꾼 뒤 재실행하면 아래 두 파일을 생성하도록 준비되어 있다.
  - `screenshots/sort-clear.png`: 메뉴 관리 트리의 정렬 적용 후 우클릭 `정렬 해제` 메뉴
  - `screenshots/filter-clear.png`: 메뉴 관리 트리의 필터 적용 후 우클릭 `필터 해제` 메뉴
