# 프론트엔드 대용량 청크 경고 해소 결과

## 원인 및 해결

- 기준 production build에서 `index` JavaScript chunk는 1,192.30 kB로 설정된 1,000 kB warning limit를 초과했다.
- `AppRouter`가 로그인, 대시보드, 프로필, 보안, F1-Grid 문서, NotFound 화면을 모두 정적으로 import해 초기 chunk에 합쳤다.
- 라우트 페이지를 `React.lazy`로 분리하고 route-level `Suspense`에서 공통 `AppLoadingSpinner`를 표시하도록 했다.
- 전역 로그인 공지 팝업 host도 별도 lazy chunk로 분리했다. 인증 구독, 라우트/권한, 팝업 동작은 변경하지 않았다.
- 대시보드 내부 화면은 동기 렌더링을 보존했다. 비교 빌드에서 route-only 분리만으로 `DashboardPage`가 476.38 kB로 limit보다 작았고, 대시보드 화면 lazy 분리는 직접 렌더링 테스트 계약을 불필요하게 비동기화하므로 제외했다.
- `chunkSizeWarningLimit`는 1,000 kB로 유지했다.

## Production build

| 항목 | 기준 빌드 | 최종 빌드 |
|---|---:|---:|
| 초기 `index` JavaScript | 1,192.30 kB | 49.33 kB |
| 대시보드 페이지 chunk | 초기 chunk에 포함 | 476.24 kB |
| 최대 chunk | `index` 1,192.30 kB | `vendor-exceljs` 929.57 kB |
| 1,000 kB 초과 warning | 있음 | 없음 |

최종 빌드에서 출력된 모든 chunk는 1,000 kB 미만이다.

## 검증

| 검증 | 결과 |
|---|---|
| `npm run build` | 통과. Vite production build 성공, 대용량 chunk warning 없음 |
| `npm run test -- tests\app-router-not-found.test.tsx` | 통과: 3 tests |
| `npm run test -- tests\app-loading-spinner.test.tsx` | 통과: 3 tests |
| `npx vitest run tests\sales-order-create-page.test.tsx -t "renders the sales order form\|adds and removes draft detail rows"` | 통과: 2 tests, 계산 테스트 1개는 선택 실행에서 제외 |
| `npm run lint -- src\routes\AppRouter.tsx src\App.tsx tests\app-router-not-found.test.tsx` | 통과 |
| `git diff --check` | 통과 |
| 브라우저 `http://127.0.0.1:4173/sales/order/create` | 통과: `수주등록` 화면 표시 확인 |

별도로 전체 sales-order-create-page 테스트를 실행했을 때, 작업 중 추가된 합계 문자열 assertion 1개가 공백 차이(`공급가 합계200.00...`)로 실패했다. 다른 두 화면 테스트는 통과했고, 이 assertion 및 수주 계산 로직은 코드 분할 변경 범위가 아니므로 수정하지 않았다.

## 브라우저 캡처

- [수주등록 화면](./screenshots/sales-order-create.png)

브라우저 화면에서 업무 데이터를 저장하거나 수정하지 않았다.

## 변경 범위

- 라우트 코드 분할 설정 및 suspense fallback
- 로그인 공지 팝업 host 별도 chunk 로딩
- lazy route 비동기 테스트 대기
- 작업지시서, 계획서, 상세사양서 및 본 결과 문서

`DashboardContent`와 `DashboardPage`의 기존 업무 화면 선택/렌더링 로직, 백엔드, API, DB, 의존성, 경고 임계값은 변경하지 않았다.
