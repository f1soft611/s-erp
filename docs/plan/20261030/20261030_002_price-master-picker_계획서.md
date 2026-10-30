# 단가등록 도움창 상태 분리 Implementation Plan

> **For agentic workers:** 이 세션에서 직접 순서대로 실행한다. 기존 작업트리 변경은 보존하고 커밋은 요청되지 않았으므로 생성하지 않는다.

**Goal:** 단가등록에서 도움창을 전환할 때 이전 품목/거래처 검색 상태가 노출되지 않도록 한다.

**Architecture:** `ItemPartnerPriceGrid`가 하나의 `MasterPickerDialog`에 종류별 label/search만 교체하면서 React 내부 검색 상태를 재사용한다. 호출부에 종류 기반 key를 지정해 닫힘/종류 전환 시 도움창을 새 인스턴스로 분리하고 공통 컴포넌트는 그대로 유지한다.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Playwright.

## 작업

- [x] `frontend/tests/item-partner-price-page.test.tsx`에 실제 단가 그리드와 행 폼을 사용한 회귀 테스트를 추가한다. 품목 검색/선택 후 거래처를 열 때 빈 검색어와 안내만 보이는지, 거래처 선택 후 품목을 열어도 동일한지 확인한다.
- [x] 같은 테스트 파일에서 품목 검색 중 닫기 → 거래처 검색 → 이전 품목 응답 도착 순서를 검증한다.
- [x] `cd frontend; npm run test -- tests/item-partner-price-page.test.tsx`로 기존 결과가 남는 실패를 확인한다.
- [x] `frontend/src/pages/co/master/item-partner-prices/components/ItemPartnerPriceGrid.tsx`의 `MasterPickerDialog`에 `key={picker?.kind ?? 'closed'}`를 지정한다.
- [x] 단가 관련 테스트와 `tests/master-picker.test.tsx`, `npm run lint`, `npm run build`를 실행한다. 전체 lint의 기존 오류와 대상 파일 lint 통과는 결과에 구분했다.
- [x] 기존 S-ERP 서버 `http://127.0.0.1:4173`에서 합성 검색 응답으로 실제 행 폼 전환/선택을 375/768/1280px에서 확인하고 스크린샷을 보관한다. 기존 서버는 종료하지 않는다.
- [x] `frontend/src/pages/f1-grid-docs/F1-GRID.md`와 `docs/result/20261030/price-master-picker/` 결과 보고서에 상태 분리, 재현 조건, 회귀 결과를 기록한다.

## 자체 검토

- 품목/거래처 검색 API와 데이터 계약은 변경하지 않는다. DB MCP/SQL 변경 대상이 아니다.
- 수정은 단가 도움창 호출부로 한정하며 F1-Grid 자체의 상태나 검증 방식은 바꾸지 않는다.
- 다른 작업의 전자결재 현황 변경 및 로그는 건드리지 않는다.
