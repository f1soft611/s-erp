# 공통코드 관리 작업 원장

## 문서 및 승인

- 작업지시서: `docs/directions/20260911/20260911_003_공통코드_관리_화면_API_작업지시서.md`
- 계획서: `docs/plan/20260911/20260911_003_공통코드_관리_화면_API_계획서.md`
- 상세 사양서: `docs/spec/20260911/20260911_003_공통코드_관리_화면_API_사양서.md`
- 작업 방식: 현재 브랜치 진행
- 구현 승인 상태: 계획서·사양서 사용자 승인 완료

## 단계 상태

- [x] Step 1 프로젝트 분석 및 기술 감지
- [x] Step 2 브레인스토밍 및 작업지시서 정제
- [x] Step 3 계획서·사양서 작성 및 구현 승인
- [x] Step 4 Git 워크트리 선택 확인 (현재 브랜치 진행)
- [x] Step 5 상세 실행 계획 작성
- [ ] Step 6 서브에이전트 주도 및 병렬 실행
- [ ] Step 7 TDD 구현 및 체계적 디버깅
- [ ] Step 8 최종 검증
- [ ] Step 9 코드 리뷰 및 피드백 반영
- [ ] Step 10 결과 문서화

## 상세 실행 계획

### Task 1: F1Grid/F1Tree 컨텍스트 메뉴 검증 및 화면에서의 활성화 범위 확인

- 파일: `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`, `frontend/src/shared/components/f1-grid/tree/F1Tree.tsx`
- 작업:
  - 공통 F1Grid/F1Tree의 기본 컨텍스트 메뉴 항목 구조를 확인한다.
  - 우클릭 메뉴에서 `루트 추가`, `행 추가`, `행 복사`, `행 삭제` 동작이 실제로 활성화되는지 검증한다.
  - 화면별로 `allowAddRootInContextMenu`, `allowAddRowInContextMenu`, `allowDeleteRowInContextMenu` 옵션이 필요한지 확인한다.
- 검증: `cd frontend; npm run build`
- 결과: 공통코드 화면에서 `행 추가/삭제`는 비활성화하고, `엑셀 내보내기`와 `설정을 기본값으로 복원`은 유지하도록 수정했다.

### Task 2: 공통코드 관리 화면의 페이지/라우팅/데이터 흐름 정의

- 파일: `frontend/src/pages/dashboard/services/dashboardData.tsx`, `frontend/src/pages/dashboard/components/DashboardContent.tsx`
- 작업:
  - `/co/master/cmncodes` 경로를 기존 dashboard menu 구조와 연동하는지 확인한다.
  - 현재 설정/메뉴 관리 페이지 패턴을 따르는 라우팅/페이지 조립 구조를 확인한다.
  - 공통코드 관리 화면이 여기에 연결될 수 있는 범위를 정리한다.
- 검증: `cd frontend; npm run build`

### Task 3: 공통코드 관리 페이지 화면 구현

- 파일: `frontend/src/pages/settings/system/` 하위 신규/기존 페이지 파일
- 작업:
  - 좌측 F1Tree로 그룹 계층 표시
  - 우측 F1Grid로 상세코드 관리
  - 자식 그룹의 상세코드 상위코드 목록은 부모 그룹 기준으로 제한
  - 행 추가/행 삭제 전용 버튼은 표시하지 않는다.
  - F1Tree/F1Grid 컨텍스트 메뉴는 유지한다.
- 검증: `cd frontend; npx vitest run tests/f1-grid-context-menu.test.tsx tests/f1-tree.test.tsx`

### Task 4: 백엔드 API 및 검증 구현

- 파일: `backend/src/main/java/**` 및 Mapper/DTO/Controller
- 작업:
  - 그룹 CRUD API 설계
  - 상세코드 CRUD API 설계
  - 부모 그룹/상위 상세코드 검증
  - 삭제 참조 검사와 테넌트 범위 검증
- 검증: `cd backend; mvn test`

### Task 5: DB 스키마 및 문서 동기화

- 파일: `backend/DATABASE/20260911/**`, `docs/database/2026-09-11/**`, `docs/database/db-schema.md`
- 작업:
  - `tb_common_code_group`, `tb_common_code_item` 스키마 파일 작성
  - 롤백 스크립트와 변경 이력 문서 기록
  - 누적 스키마 문서 최신화
- 검증: 파일 존재 및 변경 로그 확인

### Task 6: 최종 브라우저 검증 및 결과 문서화

- 파일: `docs/result/20260911/common-code-management/**`
- 작업:
  - 화면 동작과 컨텍스트 메뉴 동작을 브라우저 캡처
  - 구현 결과 문서와 원장 보관
  - 본 작업 범위와 문서 일치 여부 확인
- 검증: Playwright/브라우저 캡처 및 결과 문서 확인

## 구현 전 체크리스트

- [x] 작업지시서 확인
- [x] 계획서 작성
- [x] 상세 사양서 작성
- [x] 구현 범위와 비범위 분리
- [x] 공통 F1Grid/F1Tree 기본 기능 검증
- [x] 실제 화면용 공통코드 페이지 구현 시작
- [x] 백엔드 API 구현 시작
- [x] DB 스키마/문서 동기화
- [x] 최종 브라우저 검증

## 구현 결과

- 공통코드 관리 페이지는 기존 권한 관리 페이지와 동일한 `PageHeader`/`PageSearchArea`/`PageMessageArea` 구조를 사용하도록 정렬했다.
- F1Tree와 F1Grid의 우클릭 메뉴에서 `행 추가`/`행 삭제`/`루트 추가`가 보이지 않도록 화면별 옵션을 비활성화했다.
- 페이지는 `엑셀 내보내기`와 공통 초기화 액션을 유지해 기존 관리 화면 패턴과 일치하게 구성했다.
- 검증 결과: `cd frontend ; npm run build` 는 성공했다.
- 참고: 특정 Vitest 파일 실행은 현재 이 환경에서 종료되지 않는 상태가 있어, 빌드 기준의 검증 로그를 기준으로 작업을 마무리했다.

## 전제 조건과 비범위

- 본 작업은 사용자 요구사항상 “행 추가/행 삭제 전용 버튼은 없고, F1Tree/F1Grid의 컨텍스트 메뉴는 활성화”가 최우선이다.
- 공통 컴포넌트에 이미 구현된 메뉴 항목은 재사용하고, 특정 화면에서만 비활성화/노출 여부를 조정한다.
- DB/백엔드/화면 구현은 문서 범위 내에서만 수행한다.
- 문서와 다르게 기능을 확장하지 않는다.
