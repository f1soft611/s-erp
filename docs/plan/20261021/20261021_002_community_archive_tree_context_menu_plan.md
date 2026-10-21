# 20261021_002 Community Archive Tree Context Menu Plan

## 1. 목표

자료실 F1Tree 우클릭 메뉴에서 `루트 추가`를 숨기고 공통 exporter 기반 `엑셀 내보내기`를 추가한다. 추가 행 작업 그룹이 비어 있으면 해당 그룹 구분선을 숨겨, 작업 메뉴와 정렬/필터 메뉴도 모두 없는 자료실 메뉴에 구분선이 한 개만 남도록 한다.

## 2. 근거 문서

- 승인 설계: [자료실 트리 컨텍스트 메뉴 설계](../../superpowers/specs/2026-10-21-community-archive-tree-context-menu-design.md)
- 작업지시서: [20261021_002 작업지시서](../../directions/20261021/20261021_002_커뮤니티_자료실_F1Tree_컨텍스트메뉴_개선_작업지시서.md)
- 상세사양서: [20261021_002 상세사양서](../../spec/20261021/20261021_002_커뮤니티_자료실_F1Tree_컨텍스트메뉴_상세사양서.md)

## 3. 변경 파일

| 파일 | 변경 |
|---|---|
| `frontend/src/pages/groupware/community/archive/components/ArchiveFileGrid.tsx` | 자료실 `F1Tree`에 `allowAddRootInContextMenu={false}`와 `canExportExcel` 설정 |
| `frontend/tests/archive-page.test.tsx` | 자료실 우클릭 메뉴에서 루트 추가 부재와 엑셀 내보내기 제공 검증 |
| `frontend/src/shared/components/f1-grid/core/F1Grid.tsx` | 메뉴 작업 그룹이 비어 있을 때 불필요한 구분선 제거 |
| `frontend/tests/f1-grid-context-menu.test.tsx` | 행 작업이 없는 트리 컨텍스트 메뉴에 구분선이 하나만 표시되는지 검증 |
| `frontend/src/pages/f1-grid-docs/F1-GRID.md` | 자료실 내보내기와 비활성 메뉴 설명 갱신 |
| `docs/result/20261021/community-archive-upload-f1tree/result.md` | 후속 메뉴 변경과 검증 결과 기록 |

공통 F1Grid/F1Tree 구현 및 타입, 다른 화면은 변경하지 않는다.

## 4. TDD 및 검증 순서

1. 자료실 페이지의 메뉴 테스트와 공유 그리드 no-row-actions separator 테스트를 실행해 현재 실패를 재현한다.
2. F1Grid에서 행 작업 메뉴 그룹이 실제 표시될 때만 그룹 경계 구분선을 렌더링한다.
3. 자료실 페이지 및 shared Excel exporter focused tests를 실행한다. 기존 sorting/filter F1Tree tests와 구분해 실행하고 이 변경에서 정렬/필터 동작은 건드리지 않는다.
4. `cd frontend; npm run build`로 타입 및 production build를 확인한다.
5. F1-Grid 설명과 결과 문서를 갱신하고 `git diff --check` 및 변경 범위를 점검한다.
