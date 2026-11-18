# 행 폼 상태 동기화 작업지시

잔여 lint를 기존 화면 기능과 공개 계약을 보존하며 순차 해결한다는 사용자 지시를 따른다. [행 폼 검증 사양](../../spec/20260910/20260910_003_f1grid_number_required_validation_사양서.md), [모바일 행 폼 사양](../../spec/20261110/20261110_001_mobile-sales-grid_상세사양서.md), 최신 F1-GRID 행 폼 설명을 기준으로 한다.

F1GridFormModal의 open/row 복사 effect 1개만 다룬다. 열려 있는 상태에서 row 참조가 바뀌거나 닫았다 다시 열 때 새 draft·빈 local 오류·빈 focusRequest가 첫 commit에 반영되어야 한다. 닫힌 상태에서는 기존 draft를 유지하고 재개방 때 현재 row로 초기화한다.

columns/plugin/mode/externalErrors 등만 바뀌면 local draft를 초기화하지 않는다. JSX·스타일·props·검증·입력/적용/취소·콜백·필드 ref·포커스 effect·CommonDialog를 바꾸지 않는다. 행/초안 데이터 계약, API/DB, 상위 업무 화면은 범위 밖이다.

계획→사양→첫 commit RED→최소 구현→관련 회귀/typecheck/build/lint→실제 375/768/1280px→F1-GRID/결과·스크린샷→별도 커밋·푸시 순서를 지킨다. 목표 lint는 110→109, 다른 진단은 동일하다.
