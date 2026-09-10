# F1-Grid 가상화 엔진 확장 상세 사양서

## 작업 근거

- 작업지시서: [20260910*005_f1grid_virtualization_engine*작업지시서.md](../../directions/20260910/20260910_005_f1grid_virtualization_engine_작업지시서.md)
- 계획서: [20260910*005_f1grid_virtualization_engine*계획서.md](../../plan/20260910/20260910_005_f1grid_virtualization_engine_계획서.md)

## 1. 상태 경계

### Data Layer

전체 active rows, 정렬/필터 결과, dirty/edit 변경은 virtual window와 무관하게 보존한다. export, validate, 전체 선택, Ref API는 전체 visible rows를 대상으로 한다.

### Viewport Layer

viewport state는 `scrollTop`, `scrollLeft`, `viewportHeight`, `viewportWidth`만 가진다. 연속 scroll 이벤트는 최신 값을 ref에 덮어쓰고 RAF 콜백당 한 번 state에 반영한다.

### Selection/Edit Layer

셀 선택은 `{ anchor, focus }` 범위 좌표로 유지한다. 각 셀은 별도 selected state를 갖지 않으며, 전체 row/column index와 범위를 비교해 렌더 시 CSS 상태를 파생한다. 편집 셀은 단일 좌표로 유지하고 virtual column 보존 목록에 포함한다.

### Render Layer

전체 데이터 배열은 유지하되 row/column window에 포함된 셀만 DOM에 생성한다. pinned 컬럼, 편집 컬럼, 선택 anchor/focus 컬럼은 일반 window와 합집합으로 렌더한다.

## 2. 자동 활성화와 옵션

| 옵션                      | 기본 동작                                    | 설명                                                     |
| ------------------------- | -------------------------------------------- | -------------------------------------------------------- |
| `virtualizeRows`          | 행 수가 200개 이상이면 활성                  | 명시 시 자동 판단 재정의                                 |
| `virtualizeColumns`       | 컬럼 수가 12개 이상이고 가로 overflow면 활성 | 명시 시 자동 판단 재정의                                 |
| `rowOverscan`             | 8행                                          | viewport 위/아래 추가 렌더 행 수                         |
| `columnOverscan`          | 2열                                          | viewport 좌/우 추가 렌더 일반 컬럼 수                    |
| `fixedRowHeightThreshold` | 10,000행                                     | 이상이면 사용자 행 리사이즈 비활성화 및 산술 window 계산 |

음수 overscan은 0으로 정규화한다. threshold는 최소 1로 정규화한다.

## 3. Row window 계산

고정 높이 경로:

$$
start = \max(0, \lfloor scrollTop / rowHeight \rfloor - overscan)
$$

$$
end = \min(rowCount, \lceil (scrollTop + viewportHeight) / rowHeight \rceil + overscan)
$$

상단/하단 padding은 각각 `start * rowHeight`, `(rowCount - end) * rowHeight`로 계산한다. 대용량 경로에서 계산 복잡도는 $O(1)$이어야 한다.

## 4. Column window 계산

- checkbox와 row form action은 구조 컬럼으로 유지한다.
- left/right pinned 데이터 컬럼은 항상 렌더한다.
- 일반 컬럼은 누적 폭과 `scrollLeft`, `viewportWidth` 교차 여부로 window를 계산한다.
- window 밖이어도 편집 셀 및 선택 anchor/focus 컬럼은 유지한다.
- 셀의 `columnIndex`는 렌더 배열 index가 아니라 전체 visible columns의 원래 index를 사용한다.
- full column track은 유지해 수평 스크롤 폭과 pinned offset을 보존한다.

## 5. 선택 및 편집 계약

- 키보드 이동, 복사/붙여넣기, 정렬/필터는 전체 visible rows/columns index를 사용한다.
- 화면 밖으로 이동한 포커스 대상은 scroll 위치를 조정한 뒤 window에 포함한다.
- 범위 선택 내부 셀 여부는 row/column index 비교로 파생한다.
- virtual unmount는 선택, copied range, dirty, edit 데이터를 삭제하지 않는다.

## 6. Merge/Tree 제약

- merge 계산은 전체 visible rows 기준을 유지한다.
- 현재 window 경계를 가로지르는 merge는 group start/end 정보를 보존해 표시한다.
- F1Tree가 전달하는 projected rows도 일반 F1Grid와 동일한 row window를 사용한다.
- pinned merge 컬럼은 항상 렌더한다.

## 7. 성능 기준

- 1,500행/고정 높이 240px 그리드에서 header 포함 DOM row 수는 250 미만이어야 한다.
- 100,000행 fixed-height window 계산은 전체 row height 누적 배열을 만들지 않는다.
- 다수 컬럼에서 DOM gridcell 수는 `renderedRows × (window columns + pinned/protected columns)`에 비례해야 한다.
- 한 animation frame 내 연속 scroll 이벤트는 한 번의 viewport state 반영으로 합쳐야 한다.

## 8. 검증 기준

1. row window 초기/중간/마지막 위치 단위 테스트
2. column window + overscan + pinned/protected 컬럼 단위 테스트
3. 1,500행 DOM row 제한 통합 테스트
4. horizontal scroll 후 컬럼 window 변경 통합 테스트
5. pinned 컬럼 유지 테스트
6. RAF coalescing 테스트
7. 10,000행 이상 row resize 비활성화 테스트
8. 기존 selection/edit/merge/tree/form modal/docs 회귀 테스트
9. Vite build
10. 375px, 768px, 1280px 브라우저 확인

## 9. 제외 범위

- 서버 사이드 query virtualization
- viewport 밖 셀의 실제 DOM 유지
- 동적 row height를 100,000행 모드에서 지원
- 외부 virtualization 패키지 도입
