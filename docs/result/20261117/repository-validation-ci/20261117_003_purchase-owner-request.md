# 구매 담당자 변경 요청

## 요청 범위와 현재 상태

구매 코드는 이번 커밋에서 변경하지 않았다. 검증 중 임시 추가했던 저장키 세 개와 공통 그리드 문서의 적용 안내는 사용자 지시에 따라 철회했다. 아래 항목은 구매 담당자의 검토·구현 요청이며 적용 완료 목록이 아니다.

## 1. 선택기 열 설정 저장키

`F1Grid`는 `storageKey`가 없으면 열 설정을 저장하지 않는다. 아래 세 선택기에 키가 누락되어 기존 `tests/f1-grid-storage-keys.test.ts`의 필수 키 검사도 실패한다.

| 대상 파일 (`frontend/src/pages/materials` 기준) | 제안 키 |
|---|---|
| `order/create/components/PurchaseOrderConfirmPicker.tsx` | `purchase-order-confirm-picker` |
| `request/confirm/components/PurchaseConfirmPicker.tsx` | `purchase-confirm-picker` |
| `request/confirm/components/PurchaseRequestSourcePicker.tsx` | `purchase-request-source-picker` |

기존 키와 중복되지 않는 값을 해당 `F1Grid`에 지정해 달라. 열 순서·너비·숨김·고정 설정이 선택기를 다시 열어도 복원되고 다른 선택기에 영향을 주지 않아야 한다. API, 검색, 선택, 저장 요청, 권한은 이번 요구사항으로 변경할 필요가 없다.

재현·회귀 명령 (`frontend`에서 실행):

```powershell
node .\node_modules\vitest\vitest.mjs run tests\f1-grid-storage-keys.test.ts --pool=threads --maxWorkers=1 --reporter=default --no-color
```

참고 근거는 `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`의 저장키 없는 경우 저장을 생략하는 효과와 기존 저장키 검사다. 키 지정 후 F1-Grid 사용 문서와 구매 담당 작업 결과도 함께 갱신해 달라.

## 2. 구매 관련 잔여 테스트

아래 수치는 임시 저장키가 존재했던 잠금 설치 전체 실행의 결과다. 키를 지정하는 것만으로 해결됐다고 볼 수 없으며 각각 단독 재현하여 원인을 확인해 달라.

| 테스트 (`frontend/tests` 기준) | 전체 실행의 실패 수 |
|---|---:|
| `purchase-order-status.test.tsx` | 4 |
| `purchase-order-create.test.tsx` | 2 |
| `purchase-request-confirm.test.tsx` | 1 |

구매요청확정의 `replaces the grid on every request load instead of accumulating rows`는 초기 리뷰와 별도 실행에서도 시간 초과가 관찰됐다. 요청 재조회 시 행 교체 동작과 테스트의 비동기 대기를 확인해 달라. 원인은 확정하지 않았으며 임의 시간 제한 상향이나 skip으로 숨기지 않는다.

```powershell
node .\node_modules\vitest\vitest.mjs run tests\purchase-order-status.test.tsx tests\purchase-order-create.test.tsx tests\purchase-request-confirm.test.tsx --pool=threads --maxWorkers=1 --reporter=verbose --no-color
```

## 완료 기준

- 세 선택기의 필수 저장키 및 중복 검사가 모두 통과한다.
- 각 선택기를 열고 열 설정을 변경·재진입하여 복원과 선택기 간 독립성을 확인한다.
- 375/768/1280px에서 문서 수준의 불필요한 가로 넘침 없이 기존 선택 흐름을 유지한다.
- 구매 관련 잔여 실패는 원인·수정·검증 결과를 별도로 기록한다.
- 구매 기능을 수정한다면 관련 F1-Grid 문서와 결과 문서도 함께 갱신한다.

[전체 조사 결과 및 임시 적용 스크린샷](20261117_003_repository-validation-ci_결과.md)은 제안 검증 참고 자료다. 최종 소스에 적용됐다는 증거로 사용하면 안 된다.
