# F1-Grid 액션 컬럼 우측 간격 보정 결과

## 작업 범위

- 대상: F1-Grid 공용 헤더/액션 컬럼 렌더링
- 문제: row form plugin 활성화 시 우측 끝의 synthetic action column이 기본 헤더 padding까지 상속받아 이상한 공백이 남음
- 범위: 우측 고정 액션 컬럼 스타일만 조정, 데이터 컬럼/행 로직은 변경하지 않음

## 수정 내용

- [frontend/src/shared/components/f1-grid/core/F1Grid.tsx](../../../frontend/src/shared/components/f1-grid/core/F1Grid.tsx)
  - header와 body가 분리된 스크롤 컨테이너를 사용하므로, body에만 생기는 세로 스크롤바 폭 전체를 header의 `paddingRight`에 반영
  - action column 폭 48px을 scrollbar gutter에서 추가로 차감하지 않도록 하여 header/body sticky 컬럼 좌표를 일치시킴
  - 행 수 변경으로 세로 스크롤이 사라지는 경우에도 이전 scrollbar 폭이 남지 않도록 body `ResizeObserver`로 viewport를 재측정
  - 세로 스크롤이 있을 때 마지막 고정 액션 헤더만 `48px + scrollbarWidth`로 확장하고 `right: -scrollbarWidth`를 적용해 오른쪽 gutter만 채움
  - 액션 헤더 자체의 하단 border는 제거하고, 액션 셀의 기존 `1px` 상단선만 사용해 다른 데이터 컬럼과 동일한 얇은 경계로 정리
- [frontend/src/shared/components/f1-grid/core/GridHeader.tsx](../../../frontend/src/shared/components/f1-grid/core/GridHeader.tsx)
  - synthetic action header의 내부 좌우 padding을 제거하여 고정 48px 슬롯 내부의 불필요한 여백을 방지
- [frontend/tests/f1-grid-form-modal.test.tsx](../../../frontend/tests/f1-grid-form-modal.test.tsx)
  - 액션 헤더의 좌우 padding 0px를 확인하는 회귀 검증 추가
- [frontend/tests/f1-grid.test.tsx](../../../frontend/tests/f1-grid.test.tsx)
  - 세로 스크롤이 활성화된 row form action column에서 header gutter가 body scrollbar 폭과 일치하는지 회귀 검증 추가

## 검증 결과

- 실행 명령
  - `cd frontend; npm run test -- --run tests/f1-grid-form-modal.test.tsx -t "synthetic action header and row cell styled like a pinned right column"`
- 결과
  - 1개 파일 통과, 39개 테스트 통과
  - 종료 코드 0
- `npx vitest run tests/f1-grid.test.tsx -t "keeps the action header aligned with the body action cell when vertical scrolling is active"`
  - 대상 회귀 테스트 통과
- `npx vitest run tests/f1-grid-form-modal.test.tsx -t "synthetic action header"`
  - 대상 액션 컬럼 테스트 통과
- `npx vitest run tests/f1-grid.test.tsx -t "clears the header scrollbar gutter when rows shrink below the vertical scroll threshold|keeps the action header aligned with the body action cell when vertical scrolling is active"`
  - 스크롤 생성/해제 전환 회귀 테스트 2개 통과
- `npm run build`
  - TypeScript/Vite production build 통과
- `get_errors`
  - F1Grid 구현/회귀 테스트 파일 오류 없음

## 완료 상태

- 세로/가로 스크롤이 함께 생겨도 header와 body의 sticky 액션 컬럼 기준이 어긋나지 않도록 수정
- 액션 컬럼 내부의 불필요한 padding과 body scrollbar 미반영 문제를 각각 분리해 처리
- 세로 스크롤바 위의 header 빈 영역은 액션 헤더가 오른쪽 방향으로만 덮도록 보정
