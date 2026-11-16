# F1-Tree 최하위 마커 수정 계획

> 작업지시: [F1-Tree 최하위 마커](../../directions/20261116/20261116_010_f1-tree-leaf-marker_작업지시서.md)

**목표:** 루트를 제외하고 실제 자식이 없는 하위 행에만 기존 마커를 표시한다.

**구조:** 기존 projection의 `depth`와 `hasChildren`을 렌더링 조건에 사용한다. 데이터 구조나 버튼 배치는 바꾸지 않는다.

1. `frontend/tests/f1-tree.test.tsx`의 3단계 트리 테스트에서 중간 행의 마커가 없는지 확인하고 루트·최하위 및 접기 동작도 검증한다. 단독 루트에도 마커가 없는지 확인한다.
2. `npm run test -- tests/f1-tree.test.tsx`로 중간 행의 기존 마커 때문에 실패하는지 확인한다.
3. `frontend/src/shared/components/f1-grid/tree/F1Tree.tsx`의 조건을 `meta.depth > 0 && !meta.hasChildren`으로 바꾸고 최하위 마커의 위치를 유지한다.
4. 같은 테스트, 프론트엔드 빌드와 lint를 실행하고 브라우저에서 반응형 화면을 확인한다.
5. `frontend/src/pages/f1-grid-docs/F1-GRID.md`와 결과 문서에 동작 및 검증을 기록한다.
