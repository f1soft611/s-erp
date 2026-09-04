# F1-Grid Row Merge 개선 결과

## 변경 사항

- 공통 merge 계산 로직을 이전 그룹 경계 기준으로 재정의했다.
- 동일 값이더라도 이전 merge 그룹이 다르면 하위 컬럼 merge가 이어지지 않는다.
- 하위 merge span은 상위 merge 구간을 벗어나지 않도록 처리했다.

## 영향 파일

- [frontend/src/shared/components/f1-grid/merge/GridRowMerge.ts](../../../../frontend/src/shared/components/f1-grid/merge/GridRowMerge.ts)
- [frontend/src/shared/components/f1-grid/core/F1Grid.tsx](../../../../frontend/src/shared/components/f1-grid/core/F1Grid.tsx)
- [frontend/src/shared/components/f1-grid/core/GridBody.tsx](../../../../frontend/src/shared/components/f1-grid/core/GridBody.tsx)
- [frontend/tests/f1-grid.test.tsx](../../../../frontend/tests/f1-grid.test.tsx)
- [frontend/src/pages/f1-grid-docs/F1-GRID.md](../../../../frontend/src/pages/f1-grid-docs/F1-GRID.md)

## 회귀 기준

- 이전 컬럼 merge 경계가 나뉘면 하위 컬럼 merge도 같은 경계 안에서만 동작한다.
- 값이 같아도 다른 merge group이면 병합하지 않는다.
- 연속 동일 값은 기존 동작과 동일하게 유지한다.

## 검증 로그 요약

- 성공: `npx vitest run tests/f1-grid.test.tsx -t "row merge"`
- 실패(기존): `npm run build` due unrelated TypeScript errors

본 작업의 핵심 요구사항인 row merge 범위 규칙은 통과 검증되었고, 전체 프론트엔드 빌드 오류는 별도 정리 과제로 분리해 두었다.
