# F1-Grid 다중 행 선택 상세 사양

근거: [작업지시서](../../directions/20261027/20261027_011_f1grid-multi-select_작업지시서.md), [계획서](../../plan/20261027/20261027_011_f1grid-multi-select_계획서.md).

`F1GridProps.multiSelect?: boolean` 기본값은 false다. `selectionMode`가 cell/row 어느 쪽이든 Row Selector의 선택 행 개수를 제어한다. F1Tree도 상속한 옵션을 사용할 수 있다.

| 경로 | false / 생략 | true |
|---|---|---|
| 일반·Ctrl·Command·Shift 클릭 | 대상 한 행으로 교체 | 기존 일반/토글/연속 범위 |
| row 모드 Shift 위/아래 | 이동한 한 행 선택 | 연속 행 범위 |
| 행 checkbox | 한 행 교체, 재클릭 해제 | 개별 추가/해제 |
| 헤더 행 전체 선택 | 컨트롤 숨김, 컬럼 폭 유지 | 기존 전체 선택/해제 |
| initialSelectedRowIds/ref setSelectedRowIds | 유효 ID 중 현재 표시 순서 첫 행만 선택 | 기존 전체 유효 행 |
| true→false | 현재 표시 순서 첫 선택 행만 유지 | false→true에서 제거된 선택 복구 없음 |
| callback/ref/행 강조/복사·삭제 | 동일한 제한된 선택 상태 | 기존 선택 상태 |

기본 단일 선택은 최대 1행을 뜻하며 선택 없음도 허용한다. 옵션을 전환할 때 다중 선택 콜백을 잠깐 노출하지 않는다. 대용량 전체 선택은 true에서 기존 allSelected/예외 Set 표현을 유지한다.

셀 모드의 직사각형 드래그/TSV 셀 복사, 데이터 checkbox 값/headerCheckbox 일괄 편집, F1Tree의 treeCheckbox 부모·자식 값 전파는 행 선택과 별개이므로 유지한다. 현황을 포함한 페이지는 임의 opt-in 없이 기본 단일 선택으로 바뀐다. 기존 다중 선택 예제와 전용 회귀에만 옵션을 명시한다.

검증: 기본 및 명시 false의 modifier/keyboard/checkbox, true의 Ctrl/Shift/전체 선택/복사, 초기/ref 및 true→false→true, 기본 셀 범위 유지, 실제 브라우저 375/768/1280px와 가로 넘침을 확인한다. 공통 F1-GRID 문서·포털 API·결과/스크린샷을 함께 갱신한다. DB/백엔드 변경은 없다.
