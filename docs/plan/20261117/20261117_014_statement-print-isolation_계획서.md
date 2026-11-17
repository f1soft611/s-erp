# 거래명세표 인쇄 영향 범위 및 공용 금액 변환 계획서

- 작업번호: 20261117_014

| 단계 | 내용 |
| --- | --- |
| 1 | 거래명세표 인쇄 컴포넌트의 공용 금액 변환 결과와 인쇄 클래스 생명주기를 검증하는 테스트를 추가하고, 실패를 확인한다. |
| 2 | `StatementPrint`가 `shared/utils/amountInKorean`을 직접 사용하도록 바꾸고 데이터 유틸리티의 중복 함수를 제거한다. |
| 3 | 인쇄 호출 직전에 `statement-printing` 클래스를 추가하고 호출 종료 시 제거하며, CSS 전역 숨김 규칙을 해당 클래스 하위로 제한한다. |
| 4 | 관련 Vitest, TypeScript/Vite 빌드 및 브라우저 `page.pdf()` 출력으로 회귀를 확인한다. |
| 5 | 결과 문서와 PDF 산출물을 날짜별 결과 폴더에 기록한 뒤 Flow 게시물에 결과 댓글을 작성한다. |

## 대상 파일

- 수정: `frontend/src/pages/sales/shipment/statement/components/StatementPrint.tsx`
- 수정: `frontend/src/pages/sales/shipment/statement/data/statementPrint.ts`
- 수정: `frontend/src/pages/sales/shipment/statement/components/statement-print.css`
- 생성: `frontend/tests/statement-print.test.tsx`
- 수정: `frontend/tests/sales-statement-flow.browser.mjs`
- 결과: `docs/result/20261117/statement-print-isolation/`
