# F1-Tree 체크박스·최하위 마커 겹침 수정 계획

> 작업지시: [F1-Tree 체크박스와 최하위 마커 겹침 수정](../../directions/20261116/20261116_017_f1-tree-checkbox-marker_작업지시서.md)

1. `frontend/tests/f1-tree.test.tsx`에 `treeCheckbox`가 켜진 최하위 행의 마커가 빈 disclosure 슬롯 안에 있고 체크박스와 분리되는 회귀 테스트를 추가한다.
2. 해당 테스트를 먼저 실행해 현재 구조에서 실패함을 확인한다.
3. `frontend/src/shared/components/f1-grid/tree/F1Tree.tsx`에서 마커를 기존 32px 빈 disclosure 슬롯 안으로 이동한다. 마커 표시 조건과 나머지 행 동작은 유지한다.
4. F1-Grid 사용 문서와 날짜별 작업 결과에 원인·수정·검증을 기록하고 브라우저 화면을 캡처한다.
5. F1-Tree 테스트, 프론트엔드 빌드·lint 및 375px, 768px, 1280px 브라우저 화면을 검증한다.
