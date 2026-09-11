# F1-Grid 대용량 가로 스크롤 헤더 정렬 오류 작업 원장

## 작업 개요

- 작업일: 2026-09-11
- 작업 범위: F1-Grid 대용량 가로 스크롤 시 헤더/데이터 정렬 불일치 수정
- 현재 단계: 완료

## 관련 문서

- 작업지시서: [../../directions/20260911/20260911*004_f1grid*대용량*가로스크롤*헤더정렬오류\_작업지시서.md](../../directions/20260911/20260911_004_f1grid_대용량_가로스크롤_헤더정렬오류_작업지시서.md)
- 계획서: [../../plan/20260911/20260911*004_f1grid_large_horizontal_scroll_header_alignment*계획서.md](../../plan/20260911/20260911_004_f1grid_large_horizontal_scroll_header_alignment_계획서.md)
- 상세 사양서: [../../spec/20260911/20260911*004_f1grid_large_horizontal_scroll_header_alignment*사양서.md](../../spec/20260911/20260911_004_f1grid_large_horizontal_scroll_header_alignment_사양서.md)

## 단계별 상태

- [x] 작업 범위 정리 및 브레인스토밍 완료
- [x] 작업지시서 작성 및 사용자 승인 완료
- [x] 계획서 작성 완료
- [x] 상세 사양서 작성 완료
- [x] 구현 승인 완료
- [x] 상세 실행 계획 및 구현 시작
- [x] 테스트/검증 실행
- [x] 결과 문서 및 스크린샷 정리

## 문제 원인

세로 스크롤과 가로 스크롤이 동시에 있는 대용량 그리드에서 본문 스크롤 영역은 세로 스크롤바 gutter만큼 `clientWidth`가 줄어든다. 반면 헤더 스크롤 영역은 스크롤바를 숨기고 있어 같은 폭의 trailing scroll range를 갖지 못했다. 이 상태에서 본문을 가로 끝까지 이동하면 본문의 최대 `scrollLeft`가 헤더의 최대 `scrollLeft`보다 커지고, 브라우저가 헤더 `scrollLeft`를 더 작은 최대값으로 clamp해 헤더와 데이터 셀의 x 좌표가 어긋났다.

## 수정 내용

- [frontend/src/shared/components/f1-grid/core/F1Grid.tsx](../../../frontend/src/shared/components/f1-grid/core/F1Grid.tsx)에서 본문 스크롤 컨테이너의 `offsetWidth - clientWidth`를 viewport metric으로 측정한다.
- 측정된 세로 스크롤바 gutter 폭을 헤더 스크롤 컨테이너의 `paddingRight`에 반영해 헤더의 trailing scroll range를 본문과 맞춘다.
- [frontend/src/shared/components/f1-grid/core/GridVirtualization.ts](../../../frontend/src/shared/components/f1-grid/core/GridVirtualization.ts)의 `GridViewportMetrics`에 `verticalScrollbarWidth`를 추가해 헤더/바디 스크롤 정렬 기준을 명시했다.
- 회귀 방지를 위해 [frontend/tests/f1-grid.test.tsx](../../../frontend/tests/f1-grid.test.tsx)에 세로 scrollbar gutter가 있는 상태에서 헤더가 동일한 오른쪽 스크롤 여유를 확보하는 테스트를 추가했다.

## 검증 결과

다음 명령을 실제 실행해 확인했다.

```bash
cd "d:/f1soft/dev/react/S-ERP/frontend"; npx vitest run tests/f1-grid-virtualization.test.ts
```

결과: 1개 파일 통과, 6개 테스트 통과.

```bash
cd "d:/f1soft/dev/react/S-ERP/frontend"; npx vitest run tests/f1-grid.test.tsx --testNamePattern "keeps the header scroll range aligned with the body when the vertical scrollbar gutter is present"
```

결과: 1개 파일 통과, 1개 테스트 통과, 144개 스킵.

```bash
cd "d:/f1soft/dev/react/S-ERP/frontend"; npx vitest run tests/f1-grid.test.tsx --testNamePattern "stable scrollbar gutter|moves the virtual column window on horizontal scroll and selects the mounted cell|keeps the header scroll range aligned with the body when the vertical scrollbar gutter is present"
```

결과: 1개 파일 통과, 3개 테스트 통과, 142개 스킵.

```bash
cd "d:/f1soft/dev/react/S-ERP/frontend"; npm run build
```

결과: TypeScript + Vite production build 성공.

추가 확인:

```bash
cd "d:/f1soft/dev/react/S-ERP/frontend"; npx vitest run tests/f1-grid.test.tsx
```

결과: 100개 통과, 45개 실패. 첫 실패는 `tests/f1-grid.test.tsx:3887`의 컬럼 메뉴/로컬스토리지 테스트에서 깨진 라벨 문자열 버튼을 찾지 못하는 문제이며, 이번 스크롤 gutter 수정 범위와 직접 관련된 회귀 테스트는 위의 좁은 패턴 실행에서 통과했다.

브라우저 검증:

- 검증 URL: `http://127.0.0.1:4180/dashboard/settings/system/f1-grid-test`
- 검증 조건: Playwright로 메뉴/모듈 API를 mock 처리하고, 본문 grid content 높이를 늘려 세로 스크롤바를 강제한 뒤 가로 스크롤을 끝으로 이동
- 측정 결과: `bodyScrollLeft=436`, `headerScrollLeft=436`, `bodyOffsetWidth=758`, `bodyClientWidth=743`, `headerPaddingRight=15px`, `headerScrollWidth=1209`
- 정렬 결과: 헤더와 첫 데이터 행의 비교 가능한 셀 `left` 좌표 차이 `0px`
- 스크린샷: [screenshots/01-header-body-end-scroll-aligned.png](screenshots/01-header-body-end-scroll-aligned.png)

## 완료 기준

- 가로 스크롤 끝에서 헤더와 본문 컬럼 정렬이 일치한다.
- 대용량 가로 스크롤 경계 시점의 가상화 계산이 안정적으로 동작한다.
- 관련 회귀 테스트와 빌드 검증이 통과했다.
- 결과 문서가 현재 구현과 일치한다.

## 비고

- 본 작업은 F1-Grid 공용 스크롤 정렬 보정만 포함하며, DB/백엔드 변경은 없다.
- 브라우저 스크린샷은 같은 결과 폴더 아래에 보관했다.
