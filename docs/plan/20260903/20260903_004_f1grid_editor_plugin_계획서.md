# 계획서

## 목적

- F1Grid/F1Tree의 편집 기능을 기본 비활성화 구조로 전환하고, 플러그인 기반 에디터를 통해 선택적으로 활성화할 수 있게 한다.
- 에디터 전/후 이벤트 훅을 공통 인터페이스로 추가해 개발자가 커스텀 로직을 연결할 수 있게 한다.
- 메뉴 관리 페이지에서 저장된 row의 메뉴코드는 수정할 수 없도록 `beforeEdit` 흐름을 적용하고, 신규 row와 기존 row를 구분해 편집 정책을 적용한다.

## 범위

- 프론트엔드: `frontend/src/shared/components/f1-grid`, `frontend/src/pages/settings/system/menus`
- 문서: `docs/guide/F1-GRID.md`, `docs/result/YYYYMMDD/...`

## 구현 단위

1. 공통 타입 확장
   - 에디터 플러그인 등록 인터페이스 정의
   - 에디터 시작 전/후 훅 타입 추가
   - 기본 동작은 `enabled` false 로 유지
2. 그리드 엔진 변경
   - 편집 시작 시 플러그인 존재 여부 확인
   - 이벤트 훅 호출
   - 플러그인 없으면 편집 시작 차단
   - `beforeEdit`에서 특정 row/field 조합의 수정 여부를 제어할 수 있도록 전달값 확인
3. 메뉴 관리 페이지 적용
   - `MenuManagementPanel`의 컬럼 구성에 에디터 플러그인 연결
   - `name`, `code`, `path`, `description` 편집 활성화
   - 기존 저장 row의 `code`는 `beforeEdit` false 처리
   - 신규 생성 row는 `code` 편집 허용
4. 트리/그리드 공통 적용
   - `F1Grid`와 `F1Tree`가 동일 인터페이스를 사용하도록 연결
5. 문서 및 테스트 반영
   - `menu-management-f1-grid.test.tsx`에 beforeEdit/플러그인 회귀 케이스 추가
   - F1-Grid 문서 갱신

## 검증 계획

- `cd frontend; npm run test -- tests/menu-management-f1-grid.test.tsx`
- `cd frontend; npm run test -- tests/f1-grid.test.tsx`
- 필요 시 `frontend/tests/f1-grid-docs.test.tsx` 추가 확인
