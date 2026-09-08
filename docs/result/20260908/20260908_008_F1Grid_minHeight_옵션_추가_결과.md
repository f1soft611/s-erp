# 결과 문서

## 작업명

F1-Grid `minHeight` 옵션 추가

## 변경 내용

### 1) 공용 Props 계약 추가

- [frontend/src/shared/components/f1-grid/types/grid.types.ts](../../../frontend/src/shared/components/f1-grid/types/grid.types.ts)에 `minHeight?: number | string`을 추가했습니다.
- 숫자 값은 `${value}px`로 변환되고, 문자열 값은 그대로 CSS 값으로 전달되도록 정규화했습니다.
- 값이 없으면 기존 동작을 유지하도록 `minHeight: 0`을 기본으로 두었습니다.

### 2) Grid 루트 컨테이너에 적용

- [frontend/src/shared/components/f1-grid/core/F1Grid.tsx](../../../frontend/src/shared/components/f1-grid/core/F1Grid.tsx)의 최상위 `role="grid"` 컨테이너에 `resolvedMinHeight`를 연결했습니다.
- 기존 `height`와 `maxHeight` 동작은 유지하고, `minHeight`는 별도 최소 높이 옵션으로 추가했습니다.

### 3) 문서 업데이트

- [frontend/src/pages/f1-grid-docs/F1-GRID.md](../../../frontend/src/pages/f1-grid-docs/F1-GRID.md)와 [frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts](../../../frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts)에 공개 API 계약을 반영했습니다.

### 4) 회귀 테스트 추가

- [frontend/tests/f1-grid.test.tsx](../../../frontend/tests/f1-grid.test.tsx)에 숫자 값과 문자열 값 `minHeight` 회귀 케이스를 추가했습니다.

## 수정 파일

- [frontend/src/shared/components/f1-grid/types/grid.types.ts](../../../frontend/src/shared/components/f1-grid/types/grid.types.ts)
- [frontend/src/shared/components/f1-grid/core/F1Grid.tsx](../../../frontend/src/shared/components/f1-grid/core/F1Grid.tsx)
- [frontend/src/pages/f1-grid-docs/F1-GRID.md](../../../frontend/src/pages/f1-grid-docs/F1-GRID.md)
- [frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts](../../../frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts)
- [frontend/tests/f1-grid.test.tsx](../../../frontend/tests/f1-grid.test.tsx)

## 검증 결과

### 1) 회귀 테스트

다음 명령을 실행했습니다.

```bash
cd frontend
npx vitest run tests/f1-grid.test.tsx --testNamePattern="F1-GRID size props" --reporter=verbose
```

결과:

- Test Files: 1 passed (1)
- Tests: 2 passed (2)

### 2) 빌드 검증

다음 명령을 실행했습니다.

```bash
cd frontend
npm run build
```

결과:

- TypeScript + Vite build succeeded.
- 출력에 Vite chunk-size 경고는 있었지만 최종 exit code는 0이었습니다.

## 비고

- 이번 작업은 공용 F1-Grid API 확장 범위에 한정했습니다.
- 메뉴 화면 전용 CSS 하드코딩은 피하고, 공용 그리드의 공개 계약으로 해결했습니다.
- 브라우저 렌더링 캡처는 이번 작업 범위의 자동화 검증에서 수행하지 않았으며, 테스트와 빌드 기준으로 확인했습니다.
