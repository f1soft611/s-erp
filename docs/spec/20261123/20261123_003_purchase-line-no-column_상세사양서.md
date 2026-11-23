# 20261123_003 구매자재·수입검사 "행" 열 이름·정수 표시 상세사양서

기준: [계획서](../../plan/20261123/20261123_003_purchase-line-no-column_계획서.md)

## 1. "행" → "순번" (머리글)
| 화면 | 위치 |
|---|---|
| 구매요청 등록 | 상세 그리드 `rowId` rownumber 열 |
| 구매요청 현황 | 상세 열 `lineNo`, 상세 패널 머리글 |
| 구매 확정 | 확정 그리드 `lineNo`, 요청 선택 창(`PurchaseRequestSourcePicker`) `lineNo` |
| 발주 현황 | 상세 열 `lineNo`, 상세 패널 머리글 |
| 가입고 현황 | 상세 열 `lineNo`, 상세 패널 머리글 |
| 입고 현황 | 상세 열 `lineNo`, 상세 패널 머리글 |
| 수입검사 현황(품질관리) | 상세 열 `lineNo`, 상세 패널 머리글 |

발주·가입고·입고·수입검사 **등록** 화면의 표에는 "행" 열이 없다(확인함). 영업 화면은 대상이 아니다.

## 2. 정수 표시
`lineNo` 열은 `type: 'number'`에 `decimalPlaces: 0`을 준다. F1Grid의 소수점 우선순위는 컬럼 `decimal` > 컬럼 `decimalPlaces` > 정책 모듈 규칙이므로, 정책이 소수 2자리여도 `1`, `2`로 보인다(Excel 내보내기도 같다). 정수만 담는 값이라 편집 불가(`editable: false`)이며 저장 값은 바뀌지 않는다. 상세 패널(MUI 표)은 이미 값을 그대로 출력하므로 정수다.

## 3. 매입마감 구매처 요약 No 열
`createClosingSupplierColumns`의 맨 앞에 `{ field: 'supplierId', headerName: 'No', type: 'rownumber', width: 56, align: 'center', pinned: 'left' }`를 추가한다(구매처 열은 No 다음에 고정). 오른쪽 입고 행 표의 No 열과 같은 설정이다. 행 선택·요약 합계 동작은 그대로이고 `storageKey`를 `materials-purchase-closing-supplier-grid-v3`로 올린다.

## 4. 검증
- 단위: 각 열 정의의 `lineNo` 머리글이 "순번"이고 `decimalPlaces`가 0, 등록 화면 rownumber 머리글 "순번", 구매처 요약 첫 열이 No(rownumber).
- 화면: 정책이 소수 2자리인 환경에서 현황 상세·확정·요청 선택 창이 정수로 보임, 매입마감 왼쪽 표 No 열.
