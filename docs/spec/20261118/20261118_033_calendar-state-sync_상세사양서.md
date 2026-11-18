# 공통 달력 상태 동기화 상세사양

## 기준과 선택

기존 `20261117_008_공통_달력_개선` 지시/사양의 입력·정규화·검증·폭·단일 날짜 선택 정책을 유지한다. 범위 달력을 새로 연결하거나 날짜 기본값/서버 정책을 바꾸지 않는다.

prop-only 파생으로 바꾸면 사용자가 이동한 달/연도나 입력 중 draft를 유지할 수 없다. key remount는 focus와 popup/부분 입력을 잃는다. 따라서 이전 입력 key를 state로 보관하고 key 변경 시에만 같은 컴포넌트의 state를 조건부 조정한다. 무조건 setState하는 render가 아니며 key를 현재 primitive 값으로 갱신하므로 다음 render에서 멈춘다. 값은 React state라 중단된 render의 조정이 현재 commit으로 새지 않는다.

## 정확한 reset 조건

| 컴포넌트 | 관찰 key | key 변경 시 기존 동기화 의미 |
| --- | --- | --- |
| DatePanel | value, 계산된 today 문자열 | key를 기록하고 parseIsoDate(value)가 유효할 때만 viewOf로 표시 월을 맞춘다. 빈/invalid 값이면 탐색 월 유지 |
| MonthPanel | value, 계산된 today 문자열 | key를 기록하고 기존 6자리 숫자 조건일 때만 yearOf로 연도를 맞춘다. 비정상 월 숫자도 기존 today 연도 fallback 유지 |
| DateEditor | value, disabled | draft=value. disabled이면 calendarAnchor=null. 다시 활성화해도 예전 popup이 재개되지 않음 |
| MonthEditor | value | draft의 숫자만 남긴 값이 value와 다를 때만 formatMonthValue(value). 동등한 부분 입력 표시 유지 |

최초 state 초기화 함수와 값은 그대로다. 같은 key의 부모 재렌더는 사용자의 월/연도 이동·입력 draft를 초기화하지 않는다. DatePanel/MonthPanel은 유효한 value에서 today가 바뀌면 기존처럼 선택 값의 표시 월/연도로 돌아간다.

## 구현과 검증 경계

effect의 reset을 해당 guarded state 조정으로 옮기고 useEffect import를 제거한다. JSX·스타일·폭·선택/삭제/오늘·키보드·onChange·정규화 함수·props와 외부 계약은 바꾸지 않는다. callback이나 microtask로 state update를 숨기지 않는다.

Profiler로 외부 값 변경 직후 **첫 commit**의 DOM을 확인하는 4사례는 수정 전 stale 표시로 실패해야 한다. 각 사례에서 같은 key 재렌더, 비정상/빈 값, today 변경, 부분 월 입력 및 disabled 후 닫힘도 검증한다. 기존 실제 입력·검색·영업/마감 화면 회귀를 함께 확인한다.

전체 lint에서 해당 4개만 없어져 effect-state 97 → 93/전체 119 → 115가 되어야 한다. typecheck/build, source snapshot, 실제 모듈의 합성 fixture에서 날짜/월 popup의 375/768/1280px 선택·이동·외부 reset·disabled와 가로 넘침을 확인한다. 신규 UI 디자인이 아니므로 기존 모양과 before/after가 동일해야 한다.
