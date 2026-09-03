# 메뉴 관리 제목줄 우측에 전체 펼치기/접기 배치

## 변경 내용

- `MenuManagementPanel.tsx`의 제목 영역과 버튼 영역을 같은 행으로 재배치했다.
- `메뉴 관리` 텍스트는 좌측에 유지하고, 전체 펼치기/접기 버튼을 우측에 배치했다.
- 기존 트리 확장/축소 동작과 `selectedModule` / `saving` 비활성화 조건은 유지했다.
- 하단 그리드 컨트롤 툴바에서 버튼이 분리되도록 레이아웃 구조를 정리했다.

## 수정 파일

- [frontend/src/pages/settings/system/menus/components/MenuManagementPanel.tsx](../../../frontend/src/pages/settings/system/menus/components/MenuManagementPanel.tsx)
- [frontend/tests/menu-management-f1-grid.test.tsx](../../../frontend/tests/menu-management-f1-grid.test.tsx)
- [docs/directions/20260903/20260903_013_menu_title_expand_collapse_작업지시서.md](../../../docs/directions/20260903/20260903_013_menu_title_expand_collapse_작업지시서.md)
- [docs/plan/20260903/20260903_013_menu_title_expand_collapse_계획서.md](../../../docs/plan/20260903/20260903_013_menu_title_expand_collapse_계획서.md)
- [docs/spec/20260903/20260903_013_menu_title_expand_collapse_사양서.md](../../../docs/spec/20260903/20260903_013_menu_title_expand_collapse_사양서.md)

## 검증 로그

### 빌드 검증

```bash
Set-Location "D:\f1soft\dev\react\S-ERP\frontend"; npm run build
```

결과:

- `tsc -b && vite build` 실행
- `✓ built in 981ms` 확인

### 테스트 검증

```bash
cd frontend
npm run test -- tests/menu-management-f1-grid.test.tsx --reporter=basic
```

결과:

- 전체 파일 실행 시 기존 메뉴관리 회귀 테스트 중 일부가 이미 실패 상태로 남아 있다.
- 이 작업과 직접 관련된 레이아웃 요구사항은 코드 반영과 회귀 검증 로직을 추가했지만, 파일 전체는 기존 미해결 테스트 때문에 완전한 초록 상태를 보장하지 않는다.

## 상태 요약

요청된 타이틀 우측 배치 변경은 반영되었고, 프론트엔드 빌드는 성공한다. 전체 메뉴관리 테스트 파일에 남아 있는 기존 실패는 이번 레이아웃 수정 범위를 넘어서는 문제이므로 별도 정리가 필요하다.
