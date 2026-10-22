# 문서작성 자주 쓰는 결재선 액션 버튼 가운데 정렬 결과

## 작업 내용

자주 쓰는 결재선 불러오기/관리 팝업의 행별 `적용`/`삭제` 버튼 그룹을 액션 셀 가운데로 정렬했습니다. 액션 열 너비(110px), 우측 고정, 버튼 순서와 동작은 유지했습니다.

기존 셀은 이미 가운데 정렬되어 있었지만, MUI 버튼의 기본 최소 너비가 액션 열보다 커 버튼 그룹이 셀 안에 안정적으로 들어오지 않는 것이 원인이었습니다. 해당 팝업의 버튼에만 `minWidth: 0`과 좌우 6px 패딩을 적용하고, 전체 셀 너비를 쓰는 그룹 컨테이너에 4px 간격과 중앙 정렬을 지정했습니다.

## 수정 파일

- `frontend/src/pages/groupware/documents/write/components/DocumentApprovalSettingsDialog.tsx`: 행 액션 그룹과 버튼 너비 조정
- `frontend/tests/document-approval-settings-dialog.test.tsx`: 그룹 중앙 정렬, 간격, 버튼 최소 너비 및 패딩 회귀 테스트
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`: 좁은 액션 셀에서 버튼 그룹을 정렬하는 가이드 보완

## 검증 결과

- `frontend`에서 `npx vitest run --testTimeout=15000 tests/document-approval-settings-dialog.test.tsx`: **34개 테스트 통과**
- `frontend`에서 `npm run build`: **성공**
  - 번들 크기 1,000kB 경고가 출력됐지만 빌드 종료 코드는 0이었습니다.
- `git diff --check`: **통과** (공유 작업공간의 `.mcp.json` 줄바꿈 안내 경고만 출력)
- 브라우저에서 375px, 768px, 1280px 뷰포트를 확인했습니다. 행 액션 버튼은 110px 액션 셀 안에서 중앙에 배치됐고, 문서 전체 가로 스크롤은 발생하지 않았습니다. 측정된 버튼 그룹 폭은 약 101px, 셀 폭은 110px이며 그룹 중심과 셀 중심의 차이는 최대 약 0.5px였습니다.

## 캡처

1280px 팝업 화면 캡처: [favorite-actions-1280.png](./screenshots/favorite-actions-1280.png)

375px 및 768px 캡처는 브라우저 캡처 도구가 화면 일부만 잘라 저장해 결과물에서 제외했습니다. 해당 뷰포트의 정렬 및 가로 넘침 여부는 브라우저 DOM 측정으로 확인했습니다.

## 관련 문서

- 작업지시서: [20261022_007_문서작성_자주쓰는결재선_액션버튼_가운데정렬_작업지시서.md](../../../directions/20261022/20261022_007_문서작성_자주쓰는결재선_액션버튼_가운데정렬_작업지시서.md)
- 계획서: [20261022_007_문서작성_자주쓰는결재선_액션버튼_가운데정렬_계획서.md](../../../plan/20261022/20261022_007_문서작성_자주쓰는결재선_액션버튼_가운데정렬_계획서.md)
- 상세 사양서: [20261022_007_문서작성_자주쓰는결재선_액션버튼_가운데정렬_상세사양서.md](../../../spec/20261022/20261022_007_문서작성_자주쓰는결재선_액션버튼_가운데정렬_상세사양서.md)
- 승인 설계: [2026-10-22-document-approval-favorite-action-alignment-design.md](../../../superpowers/specs/2026-10-22-document-approval-favorite-action-alignment-design.md)
