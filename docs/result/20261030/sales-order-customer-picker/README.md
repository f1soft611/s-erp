# 수주등록 거래처 돋보기 도움폼 결과

## 변경 내용

- 수주등록 기본정보의 거래처 선택 컨트롤을 별도 `선택` 버튼에서 필드 끝의
  돋보기 아이콘으로 변경했다.
- 공통 `MasterPicker`에 선택적 `triggerMode`를 추가했다. 기본값은 기존 버튼
  방식이며 수주등록 거래처에만 `icon` 모드를 적용했다.
- 거래처 도움폼, 검색 서비스, 선택 데이터, 필수/오류 표시, 비활성 상태,
  저장 흐름은 유지했다.

## 검증

| 확인 | 결과 |
|---|---|
| `npm run build` | 통과 |
| 변경 파일 `npm run lint -- src/shared/components/master-picker/masterPicker.types.ts src/shared/components/master-picker/MasterPicker.tsx src/pages/sales/order/create/SalesOrderCreatePage.tsx tests/master-picker.test.tsx tests/sales-order-create-page.test.tsx` | 종료 코드 0. `SalesOrderCreatePage.tsx:256`에 기존 set-state-in-effect 경고 1건 |
| 관련 테스트 `npm run test -- tests/master-picker.test.tsx tests/sales-order-create-page.test.tsx` | 신규 아이콘 흐름과 공통 피커 테스트 포함 26개 통과. 기존 테스트 2개 실패 |
| 전체 `npm run lint` | 기존 `tests/common-code-management-page.test.tsx:53` 조건부 Hook 사용 오류로 실패 |
| 실제 브라우저 375px / 768px / 1280px | 각 폭에서 필드 내 돋보기, 도움폼 열기/검색/선택, 선택값 표시 및 페이지 가로 넘침 없음 확인 |

기존 테스트 실패는 이번 변경 전후로 재현됐다. `sales-order-create-page.test.tsx:334`는
오늘 날짜가 `2026-10-30`인데 `2026-10-27`을 기대하고, `:488`은 삭제 후 신규
상태에서 삭제 버튼이 비활성일 것을 기대하지만 현재 구현은 버튼을 활성 상태로
표시한다. 둘 다 이번 선택 트리거 변경 범위 밖이라 수정하지 않았다.

브라우저 확인은 기존 S-ERP Vite 서버(`127.0.0.1:4173`)를 재사용했고, 검색 결과는
합성 거래처 `C-TEST · 검증 거래처`만 사용했다. 전체 viewport에서 도움폼의
열기/닫기와 선택값 갱신을 확인했으며 애플리케이션 page error는 없었다.

## 스크린샷

| 뷰포트 | 기본 필드 | 도움폼 | 선택 후 |
|---|---|---|---|
| 375px | [필드](screenshots/customer-field-375px.png) | [도움폼](screenshots/customer-dialog-375px.png) | [선택값](screenshots/customer-selected-375px.png) |
| 768px | [필드](screenshots/customer-field-768px.png) | [도움폼](screenshots/customer-dialog-768px.png) | [선택값](screenshots/customer-selected-768px.png) |
| 1280px | [필드](screenshots/customer-field-1280px.png) | [도움폼](screenshots/customer-dialog-1280px.png) | [선택값](screenshots/customer-selected-1280px.png) |

백엔드 및 DB 변경은 없다.
