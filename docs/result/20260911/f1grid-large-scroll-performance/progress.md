# F1-Grid 대용량 스크롤 성능 개선 결과

## 작업 개요

- 작업일: 2026-09-11
- 작업 범위: 대용량 F1-Grid 스크롤 성능 개선
- 핵심 목표: 가상화 범위 제한, 불필요한 재렌더 방지, 대용량 데이터 처리 대응성 강화

## 관련 문서

- 작업지시서: [../../directions/20260911/20260911*002_f1grid*대용량*스크롤*성능개선\_작업지시서.md](../../directions/20260911/20260911_002_f1grid_대용량_스크롤_성능개선_작업지시서.md)
- 계획서: [../../plan/20260911/20260911*002_f1grid_large_scroll_performance*계획서.md](../../plan/20260911/20260911_002_f1grid_large_scroll_performance_계획서.md)
- 상세 사양서: [../../spec/20260911/20260911*002_f1grid_large_scroll_performance*사양서.md](../../spec/20260911/20260911_002_f1grid_large_scroll_performance_사양서.md)

## 변경 사항

### 1. 기본 row overscan 강화

- `DEFAULT_GRID_ROW_OVERSCAN`를 4로 지정하여, 기존 8 수준보다 더 좁은 가상화 범위를 적용하도록 조정했다.
- 스크롤 시 불필요하게 많은 row를 미리 렌더링하지 않도록 제한했다.

### 2. row height 계산 경량화

- `F1Grid` 내부에서 `rowHeights`를 Map 기반으로 재사용하도록 정리했다.
- 행 높이 계산이 반복적으로 재해석되지 않도록 보완했다.
- 대용량 데이터 환경에서 가변 행 높이 계산이 빠르게 누적되지 않도록 조정했다.

### 3. 가상화 로직 정비

- `GridVirtualization.ts`에 기본 row overscan 상수와 안전 경계값을 추가했다.
- overscan 값이 지나치게 낮거나 높아지지 않도록 최소/최대 경계를 유지했다.

### 4. 회귀 테스트 추가

- `frontend/tests/f1-grid-virtualization.test.ts`에 대용량 데이터 overscan 회귀 테스트를 추가했다.

## 주요 수정 파일

- [frontend/src/shared/components/f1-grid/core/F1Grid.tsx](../../../frontend/src/shared/components/f1-grid/core/F1Grid.tsx)
- [frontend/src/shared/components/f1-grid/core/GridVirtualization.ts](../../../frontend/src/shared/components/f1-grid/core/GridVirtualization.ts)
- [frontend/tests/f1-grid-virtualization.test.ts](../../../frontend/tests/f1-grid-virtualization.test.ts)

## 검증 결과

### 통과한 명령

```bash
cd frontend; npm run test -- tests/f1-grid-virtualization.test.ts
```

결과: 1개 파일 통과, 5개 테스트 통과.

```bash
cd frontend; npm run build
```

결과: Vite production build 성공, 출력 생성 완료.

## 한계 및 추가 권장 사항

- 본 수정은 공용 F1-Grid의 스크롤 체감 성능 개선에 초점을 둔 변경이다.
- 10,000건 이상 대규모 데이터는 여전히 `dataSource` 기반 서버 페이지네이션이 가장 안정적인 전략이다.
- 실제 브라우저 수준의 대용량 시나리오 검증이 추가로 필요하면, Playwright 기반 스크롤 캡처를 이어서 수행하는 것이 좋다.

## DB 영향

- DB 스크립트: 해당 없음
- 기존 스키마 영향 검토 완료
