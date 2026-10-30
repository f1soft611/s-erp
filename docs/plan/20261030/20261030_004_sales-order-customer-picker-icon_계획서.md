# 수주등록 거래처 돋보기 도움폼 계획서

## 목표

수주등록 기본정보의 거래처 선택 버튼을 필드 내부 돋보기 아이콘으로 바꾸고
기존 거래처 도움폼 및 선택 동작을 유지한다.

## 구현 방안

`MasterPicker`에 선택적 `triggerMode`를 추가하고 기본값은 기존 버튼 방식으로
유지한다. `CustomerPicker` 경유로 수주등록 페이지에서만 `icon`을 전달한다.
검색 다이얼로그, 검색 서비스, 선택된 거래처 타입/검증 및 주문 저장 흐름은
변경하지 않는다.

## 파일 범위

- 수정: `frontend/src/shared/components/master-picker/masterPicker.types.ts`
  - 공통 피커의 선택 트리거 모드 타입/속성을 추가한다.
- 수정: `frontend/src/shared/components/master-picker/MasterPicker.tsx`
  - `icon` 모드에서 읽기 전용 입력 필드 끝에 접근성 이름이 있는 돋보기 버튼을
    표시하고 기존 `button` 모드는 유지한다.
- 수정: `frontend/src/pages/sales/order/create/SalesOrderCreatePage.tsx`
  - 거래처 `CustomerPicker`에만 아이콘 모드를 지정한다.
- 수정: `frontend/tests/master-picker.test.tsx`
  - 기본 버튼 동작 회귀와 아이콘 모드의 다이얼로그 열기/비활성 동작을 확인한다.
- 수정: `frontend/tests/sales-order-create-page.test.tsx`
  - 기본정보 거래처가 별도 텍스트 선택 버튼 없이 돋보기로 도움폼을 열고,
    선택값을 표시하는지 확인한다.
- 생성: `docs/result/20261030/sales-order-customer-picker/`
  - 검증 결과 및 375px/768px/1280px 스크린샷을 기록한다.

## 검증 순서

1. 기존 변경 사항을 보존하고 대상 파일의 현재 구현 및 테스트를 확인한다.
2. 실패 회귀 테스트를 먼저 추가한다.
3. 다음 명령으로 대상 테스트 실패를 확인한 후 구현한다.
   `cd frontend; npm run test -- tests/master-picker.test.tsx tests/sales-order-create-page.test.tsx`
4. 대상 테스트, `npm run build`, `npm run lint`를 실행한다.
5. 기존 S-ERP 서버 `http://127.0.0.1:4173`이 있으면 식별 후 재사용한다.
   새 서버가 필요하면 `npm run dev -- --strictPort`로 시작하고 테스트 후
   직접 시작한 서버만 종료한다.
6. 세 viewport에서 돋보기 위치, 비활성 상태, 도움폼 열기/검색/선택을 확인하고
   합성 거래처 데이터만으로 스크린샷을 저장한다.

## 제외

- 다른 페이지/피커의 트리거 방식 변경
- 거래처 API, 선택 데이터, 주문 저장 계약 또는 권한 변경
- 백엔드 및 DB 변경
