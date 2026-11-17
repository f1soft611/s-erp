# 편집 가능 비고 배경색 수정 계획서

1. `readonly-form-fields.test.tsx`에 light/dark 편집 가능 multiline, 실제 readonly multiline, disabled multiline의 배경과 편집 상태를 추가하고 실패를 확인한다.
2. `frontend/src/theme/theme.ts`의 readonly textarea 탐지에서 `aria-hidden="true"` 측정용 요소만 제외한다.
3. 실제 공통 theme과 견적작성 컴포넌트를 렌더링하는 Playwright 회귀로 375/768/1280px 비고 입력·배경·읽기전용 상태를 확인한다.
4. 공통 readonly·theme 및 견적 회귀 테스트, 빌드·변경 영역 lint를 실행한다.
5. `docs/result/20261117/multiline-readonly-color`에 원인·결과·스크린샷을 저장한다. DB 변경과 커밋·푸시는 하지 않는다.
