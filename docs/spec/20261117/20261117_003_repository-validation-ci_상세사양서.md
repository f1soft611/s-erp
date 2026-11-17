# 저장소 검증 환경 정합성 및 CI 상세사양서

## 근거

- [작업지시서](../../directions/20261117/20261117_003_repository-validation-ci_작업지시서.md)
- [계획서](../../plan/20261117/20261117_003_repository-validation-ci_계획서.md)
- 기준 커밋: `45c5669d`. 동시 진행 중인 미커밋 견적 작업은 범위에서 제외한다.

## 설치 계약

- 기존 잠금 파일의 Vite `8.3.8`, Vitest `4.1.12`를 설치하고 잠금 파일은 바꾸지 않는다.
- 공유 4173 서버가 사용 중이면 원본 `node_modules`를 변경하지 않는다. 격리 검증은 원본 설치 교체와 별개의 결과로 기록한다.
- 테스트 옵션은 npm의 PowerShell 인수 전달에 의존하지 않고 직접 Vitest 실행 또는 npm 스크립트 본문에 지정한다.

## 구매 담당자 전달용 제안 계약

후속 사용자 지시에 따라 아래 구매 저장키는 이번 커밋에 적용하지 않는다. 표는 담당자에게 요청할 내용이며 운영 소스·구매 테스트와 공통 그리드의 적용 안내는 변경하지 않는다. 기존 검증 자료는 임시 적용 후 철회한 상태의 참고 근거다.

| 파일 | 변경 및 기대 동작 |
|---|---|
| `frontend/src/pages/materials/order/create/components/PurchaseOrderConfirmPicker.tsx` | `purchase-order-confirm-picker` 키로 열 설정 저장 |
| `frontend/src/pages/materials/request/confirm/components/PurchaseConfirmPicker.tsx` | `purchase-confirm-picker` 키로 열 설정 저장 |
| `frontend/src/pages/materials/request/confirm/components/PurchaseRequestSourcePicker.tsx` | `purchase-request-source-picker` 키로 열 설정 저장 |

## 이번 발행에 포함하는 회귀 수정

| 파일 | 변경 및 기대 동작 |
|---|---|
| `frontend/tests/theme-settings.test.tsx` | 테스트 로그인과 유효한 하위 메뉴를 준비한 뒤 실제 DashboardPage·설정 공급자를 직접 렌더링한다. 업무 본문만 격리하고 테마·화면배율·접근성 단언을 보존한다. |

저장키는 세 선택기 간에 공유하지 않는다. API, 검색, 선택, 저장 요청, 권한, 화면 레이아웃과 기존 테마 동작은 변경하지 않는다.

## 문서작성 조사 계약

- `document-write-page.test.tsx`를 잠금 파일 설치와 단일 워커에서 단독 실행한다.
- 전체 병렬 실행의 미완료가 제품 버그임을 가정하지 않는다. 단독 실행의 실패·지연·무한 갱신을 로그와 최소 재현으로 구분한다.
- 이번 범위에서 확정되지 않은 원인은 결과에 남기고 임의의 시간 제한 상향이나 테스트 제외로 숨기지 않는다.
- Windows의 Vitest 4.1.12 기본 fork 워커가 시작 응답 시간 초과를 보이면 로컬 진단에 `--pool=threads`를 사용해 시작 실패와 테스트 실패를 분리한다. 테스트 본문의 시간 제한은 변경하지 않는다.

## CI 계약

- workflow: `Frontend CI`.
- 공개 PR 및 `main`, `socra710` push와 수동 실행을 지원한다.
- `frontend-lint`: 잠금 설치 후 `npm run lint`.
- `frontend-build`: 잠금 설치 후 `npm run typecheck`, `npm run build`.
- `frontend-tests`: 잠금 설치 후 `npm run test:ci`. 기본 테스트 include 전체를 유지하고 threads 풀의 최대 워커 수는 2다.
- `frontend-required`: 세 검사 결과를 집계한다. 실패·취소·건너뜀은 성공으로 처리하지 않는다.
- matrix job의 실행 상한은 40분, 집계 job은 1분이며 테스트·lint·타입·빌드 실패를 그대로 실패로 반환한다. 잠금 설치의 전체 테스트가 공유 Windows 환경에서 20분을 초과한 측정에 맞춘 job 상한이며 개별 테스트 시간 제한은 변경하지 않는다.
- 최상위 권한은 `contents: read`이며 비밀 값과 실 DB에 의존하지 않는다.
- CI 파일의 로컬 추가만으로 원격 필수 검사가 활성화됐다고 표현하지 않는다. push와 성공한 check 등록, 원격 브랜치 보호 설정은 별도 적용 단계다.

## 검증 및 완료 판단

- 기존 두 회귀 테스트의 실패를 먼저 확인한다. 최종 범위에서는 테마 수정의 통과와 구매 저장키 미반영에 따른 실패를 구별해 기록한다.
- 전체 테스트는 집중 테스트와 분리해 집계한다. 기존 실패가 남으면 수와 대표 원인을 기록하며 전체 통과를 주장하지 않는다.
- 공유 서버와 사용자 세션은 유지하고 원본의 동시 작업을 덮어쓰지 않는다.
- 결과는 `docs/result/20261117/repository-validation-ci`에 저장한다.
- 최종 커밋에는 구매 운영 소스·구매 테스트·F1-Grid 적용 안내를 포함하지 않는다. 구매 저장키 검사 실패는 담당자 미반영 상태로 남기고 skip하지 않는다.
- 초기 전체 실행 수치는 구매 임시 변경 철회 전의 기록이다. 철회 후에는 영향받는 저장키·테마 검사를 다시 실행하며 과거 전체 수치를 최종 발행 상태의 통과 결과로 표현하지 않는다.
- 이번 비구매 변경만 커밋·푸시하고 현재 브랜치/upstream 일치를 동기화 완료 기준으로 삼는다. `main` merge나 원격 보호 정책 변경은 포함하지 않는다.
