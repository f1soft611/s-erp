# Vercel Build Fix Implementation Plan

**Goal:** 기존 화면 동작과 소수점 정책을 유지하면서 프론트엔드 배포 빌드를 복구한다.

**Architecture:** 호출부마다 우회 타입을 추가하지 않고 공통 컬럼 타입의 누락을 복원한다. 같은 변경에서 누락된 기존 UI 설정과 공통코드 필수 타입만 보완한다.

**Tech Stack:** TypeScript, React, Vite, Vitest, oxlint.

## 근거

[작업지시서](../../directions/20261117/20261117_013_vercel-build-fix_작업지시서.md)

## 작업

- [x] `frontend`에서 `npm run build`로 실패를 확인한다. 기존 호출부의 컴파일 오류를 회귀 검증으로 사용하고, 타입 선언·기존 상수 복원만을 검사하는 중복 단위 테스트는 추가하지 않는다.
- [x] `frontend/src/shared/components/f1-grid/types/grid.types.ts`에 `options?: F1GridOption[];`를 복원한다. 기존 빌드의 호출부들이 컴파일 회귀 검증 역할을 한다.
- [x] `frontend/src/pages/sales/quotation/status/data/quotationStatusColumns.tsx`의 `amountColumn` 반환값에 `width,`를 복원하고 소수점은 정책 상속을 유지한다.
- [x] `frontend/src/pages/co/master/common-code/components/CommonCodeManagementPanel.tsx`에 `searchQuery?: string;`, `groupDc`의 `headerName: '그룹 설명'`을 복원한다.
- [x] `frontend/src/pages/co/master/common-code/data/commonCodeManagement.data.ts`의 샘플 그룹 세 개에 `moduleCd: ''`를 지정한다(기존 공통 그룹 의미 유지).
- [x] `frontend`에서 `npm run build`, 관련 Vitest, 변경 파일 대상 `npm run lint -- <files>`를 실행한다.
- [x] F1-GRID.md의 옵션 계약 설명과 결과 문서를 갱신한다. 커밋은 생성하지 않는다.
