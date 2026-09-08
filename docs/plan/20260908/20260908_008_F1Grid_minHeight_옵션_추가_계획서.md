# 계획서

## 제목

F1-Grid 부모 높이 연동 및 내부 스크롤 보장

## 관련 작업지시서

[20260908*008_F1Grid_minHeight*옵션*추가*작업지시서.md](../../directions/20260908/20260908_008_F1Grid_minHeight_옵션_추가_작업지시서.md)

## 요구사항 분석 및 목적

- 현재 F1-Grid 공용 Props는 `height`와 `maxHeight`를 제공하며, 부모 높이가 제한된 flex 레이아웃에서 본문 내부 스크롤을 사용한다.
- F1-Grid 최상위 컨테이너의 기존 `minHeight: 0`을 선택적 Props 값으로 제어해, flex 레이아웃과 로딩 스켈레톤이 필요한 화면에서 인스턴스별 최소 높이를 지정할 수 있게 한다.
- `height="100%"`가 브라우저 높이 축소를 반영하려면 부모 및 상위 flex 컨테이너의 `minHeight: 0` 조건이 함께 보장되어야 한다.
- 옵션 미지정 시 기존 렌더링과 레이아웃을 보존한다.

## 작업 범위

### 프론트엔드

1. `frontend/src/shared/components/f1-grid/types/grid.types.ts`
   - `F1GridProps`에 `minHeight?: number | string`을 추가한다.
2. `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
   - `minHeight`를 구조분해하고 기존 `height`/`maxHeight`와 같은 방식으로 CSS 값을 정규화한다.
   - 최상위 grid 컨테이너의 `sx.minHeight`에 정규화 값을 적용한다.
   - 미지정 시 `0`을 유지한다.
3. `frontend/src/pages/settings/system/menus/components/MenuManagementPanel.tsx` 및 관련 부모 레이아웃
   - `height="100%"`의 기준 높이가 부모 flex 영역에서 계산되도록 `flex: 1`, `minHeight: 0` 구조를 유지·보완한다.
   - 브라우저 높이 축소 시 그리드 본문만 세로 스크롤하는지 확인한다.
4. `frontend/src/pages/f1-grid-docs/F1-GRID.md`
   - 실제 Props 계약과 숫자/문자열 단위, 기본 동작을 문서화한다.
5. `frontend/tests/f1-grid.test.tsx`
   - 숫자 값, CSS 문자열 값, 미지정 기본값에 대한 회귀 검증을 추가한다.
6. `docs/result/20260908/f1-grid-min-height/`
   - 작업 원장, 변경 요약, 테스트·빌드·브라우저 검증 결과와 캡처 경로를 기록한다.

### 백엔드 / DB

- 해당 없음. API, 서버, 테이블, 컬럼, 마이그레이션을 변경하지 않는다.

## 기존 코드 및 아키텍처 영향

- `F1TreeProps`는 `F1GridProps`를 기반으로 하므로 별도 타입 중복 없이 `minHeight`를 상속한다.
- `height`, `maxHeight`, 행 높이(`minRowHeight`), 내부 body 스크롤, loading skeleton 계산 로직은 변경하지 않는다.
- 부모 flex 레이아웃에서 `minHeight: 0`이 누락되어 높이가 콘텐츠 크기로 확장되는 경로만 보완하며, 페이지 전체 레이아웃은 대규모로 변경하지 않는다.
- 현재 작업 트리에 존재하는 메뉴 로딩 및 기타 사용자 변경 파일은 되돌리거나 범위를 확장하지 않는다.

## 실행 계획

1. 승인된 사양을 기준으로 `minHeight` Props와 컨테이너 스타일의 실패 테스트를 먼저 추가한다.
2. `F1GridProps`와 `F1Grid.tsx`에 최소 변경으로 구현한다.
3. F1-Grid 문서에 실제 공개 계약을 반영한다.
4. 변경된 단일 테스트 파일을 실행하고 실패 시 원인을 수정한다.
5. `npm run build`로 TypeScript와 Vite 빌드를 확인한다.
6. 기존 개발 서버 또는 별도 포트에서 375px, 768px, 1280px 브라우저 뷰포트를 확인한다.
7. 결과 문서와 작업 원장에 명령 결과, 변경 범위, 캡처 경로를 기록한다.

## 검증 계획

- 테스트: `npm run test -- tests/f1-grid.test.tsx`
- 빌드: `npm run build`
- 브라우저: F1-Grid 테스트/문서 화면에서 `minHeight` 적용 여부 및 가로 스크롤·겹침을 375px, 768px, 1280px로 확인
- 브라우저: 부모 높이 축소 시 그리드 루트 높이가 함께 감소하고, 초과 행의 세로 스크롤이 그리드 본문에만 생기는지 확인
- 정적 확인: `F1GridProps`, `F1TreeProps`, 최상위 `role="grid"` 스타일, 문서 계약 대조
- 백엔드/DB: 해당 없음

## 완료 조건

- 숫자 `minHeight`가 px 값으로 적용된다.
- CSS 문자열 `minHeight`가 그대로 적용된다.
- 미지정 시 기존 `minHeight: 0`이 유지된다.
- `F1Tree`에서도 타입 오류 없이 옵션을 사용할 수 있다.
- 관련 테스트와 빌드가 통과한다.
- 세 가지 뷰포트 검증 및 결과 문서가 남는다.
