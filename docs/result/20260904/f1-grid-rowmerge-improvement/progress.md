# F1-Grid Row Merge 개선 진행 원장

## 상태

- 분류: bounded
- 범위: frontend shared F1Grid merge 로직 및 회귀 테스트
- 구현 상태: 완료(타깃 로직 수정 및 회귀 검증 완료)
- 전체 빌드 상태: 미완료(기존 프로젝트 레벨 TS 오류로 인한 빌드 실패)

## 작업 단계

- [x] 작업 범위 확인 및 브레인스토밍
- [x] 작업지시서 작성
- [x] 계획서 작성
- [x] 상세 사양서 작성
- [x] merge 로직 수정
- [x] 회귀 테스트 추가
- [x] 문서 반영
- [x] 타깃 검증 수행
- [ ] 전체 빌드 해결(기존 오류 범위 별도 처리 필요)

## 변경 내용

1. 이전 merge 컬럼의 group 경계를 기준으로 현재 컬럼의 merge span을 계산하도록 수정
2. 동일한 값이어도 이전 그룹이 다르면 merge를 이어가지 않도록 제한
3. 하위 merge가 상위 merge 영역을 침범하지 않도록 span 종료 조건 반영
4. F1-Grid 문서와 테스트 케이스에 경계 규칙 기록

## 검증 결과

### 통과

```bash
cd frontend
npx vitest run tests/f1-grid.test.tsx -t "row merge"
```

결과: 1 passed, 2 tests passed.

### 실패(기존 프로젝트 오류)

```bash
cd frontend
npm run build
```

실패 원인: 프로젝트 전역에서 다른 파일들의 TS 오류가 남아 있음.

- [frontend/src/pages/settings/system/menus/MenuManagementPage.tsx](../../../../frontend/src/pages/settings/system/menus/MenuManagementPage.tsx)
- [frontend/src/pages/settings/system/roles/components/RoleManagementPanel.tsx](../../../../frontend/src/pages/settings/system/roles/components/RoleManagementPanel.tsx)
- [frontend/src/pages/settings/system/roles/RoleManagementPage.tsx](../../../../frontend/src/pages/settings/system/roles/RoleManagementPage.tsx)
- [frontend/src/shared/components/f1-grid/core/F1Grid.tsx](../../../../frontend/src/shared/components/f1-grid/core/F1Grid.tsx)
- [frontend/src/shared/components/UnsavedChangesConfirmDialog.tsx](../../../../frontend/src/shared/components/UnsavedChangesConfirmDialog.tsx)

이 항목들은 본 row merge 수정 범위와 무관한 기존 오류로 판단되며, 현재 작업의 검증 기준인 row merge 회귀는 통과한 상태다.
