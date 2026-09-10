# F1-Grid 가상화 엔진 확장 결과

## 작업 문서

- [작업지시서](../../../directions/20260910/20260910_005_f1grid_virtualization_engine_작업지시서.md)
- [계획서](../../../plan/20260910/20260910_005_f1grid_virtualization_engine_계획서.md)
- [상세 사양서](../../../spec/20260910/20260910_005_f1grid_virtualization_engine_사양서.md)

## 구현 결과

- 200행 이상에서 자동 row virtualization 적용
- 12컬럼 이상이며 가로 overflow가 있으면 자동 column virtualization 적용
- `virtualizeRows`, `virtualizeColumns`, `rowOverscan`, `columnOverscan`, `fixedRowHeightThreshold` 공개 옵션 추가
- 스크롤 viewport 갱신을 `requestAnimationFrame`당 한 번으로 병합
- 10,000행 이상 기본 고정 행 높이 및 행 리사이즈 비활성화
- pinned 컬럼과 선택/편집 보호 컬럼 상시 렌더
- 선택 모델을 `{ anchor, focus }` 범위로 정리하고 숫자 bounds를 한 번 계산하도록 변경
- 전체 데이터/dirty/filter/sort 파생값을 memoize해 scroll frame에서 재계산하지 않도록 분리
- 전체 index와 render index를 분리해 행번호, 편집, 선택, merge 좌표 보존

## 테스트

### 신규 테스트

- 100,000행 고정 높이 window 산술 계산
- viewport + overscan + pinned/protected column 계산
- RAF scroll update coalescing
- anchor/focus selection bounds
- large row DOM 제한
- column DOM 제한 및 pinned 유지
- horizontal scroll 후 window 이동과 셀 선택
- fixed row height 임계값에서 resize 비활성화

### 실행 결과

- 가상화/선택 집중 테스트: 3개 파일, 9개 테스트 통과
- 프론트엔드 빌드: 통과
- 전체 관련 회귀: 217개 중 160개 통과, 57개 실패
  - 가상화 관련 신규 테스트 실패 없음
  - `frontend/tests/f1-grid.test.tsx` 다수 실패는 테스트 소스의 깨진 한글 기대 문자열과 실제 접근성 문자열 불일치
  - `frontend/tests/f1-tree.test.tsx` 1건은 Tree 컬럼 메뉴에서 정렬 메뉴가 노출되는 기존 계약 불일치

## 영향 범위

- 프론트엔드 공용 F1-Grid 렌더링과 선택 계층
- F1-Grid 문서 포털 및 API Reference
- 백엔드/DB 영향 없음

## 브라우저 검증

- Vite 개발 서버 `http://127.0.0.1:4173/f1-grid-docs`에서 확인했다.
- 1,000행 중간 스크롤에서 `scrollTop=16,000`, 전체 scrollHeight 32,000px가 유지됐다. 실제 DOM은 header 포함 29행으로 제한됐고 첫 렌더 행은 `large-493`이었다.
- 보이는 `ITEM-000501` 셀 선택이 즉시 `data-grid-selected="true"`로 반영됐다.
- 10,000행 로드는 브라우저 측정 약 623ms였고, 중간 스크롤에서 `scrollTop=160,000`, 전체 scrollHeight 320,000px, DOM 29행, 첫 렌더 행 `large-4993`을 확인했다.
- MUI `sx` 숫자 padding이 spacing 단위로 해석되어 virtual offset이 8배가 되는 문제를 브라우저 검증에서 발견했고, px 문자열로 수정했다.
- virtual padding 교체 시 scrollTop이 clamp되는 문제를 실제 CSS Grid spacer track으로 변경해 해결했다.
- 스크린샷:
  - [large-data-1280.png](screenshots/large-data-1280.png)
  - [large-data-375.png](screenshots/large-data-375.png)
