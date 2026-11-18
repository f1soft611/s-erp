# Splitter 비율 상태 동기화 상세사양

## 비율 소유와 prop 변경

leftRatio/rightRatio는 기존 초기값 `leftFlex ?? 1`/`rightFlex ?? 1` 및 pointer 드래그가 소유한다. 둘 중 어느 flex prop이 Object.is 기준으로 변경되면 숫자인 현재 prop을 해당 ratio에 적용한다. 값이 바뀌지 않은 다른 쪽도 숫자 prop이면 다시 적용하는 기존 그룹 dependency 의미를 유지한다.

같은 두 prop의 재렌더는 드래그한 비율을 유지한다. undefined인 쪽은 마지막 ratio를 보존한다. 둘 다 undefined이면 기존 size state의 픽셀 모드로 돌아가고, 나중에 한 쪽만 다시 지정하면 다른 쪽의 마지막 ratio를 재사용한다. initialSize를 새 controlled prop처럼 동기화하지 않는다.

이전 입력 그룹을 state로 저장하고 입력 변경 render에서 같은 컴포넌트의 state만 조건부 조정한다. Object.is를 사용해 NaN→NaN은 변경으로 취급하지 않고 0→-0은 변경으로 취급한다. 유효하지 않은 비율에 새 보정·검증 정책을 추가하지 않는다.

## 변경하지 않는 범위

방향/모바일 stacked 조건·breakpoint·핸들 숨김·style·ARIA·키보드·터치 동작·크기 clamp·픽셀 저장 onSizeChange·pointer/resize listener와 cleanup은 원문 유지한다. 드래그 ref와 stacked 전환 정리도 기존 위치를 유지한다. 외부 prop 동기화 때문에 자식 remount, DOM 측정, 서비스 요청 또는 layout effect를 추가하지 않는다.

## 검증

기존 분리기 접근성/픽셀 드래그 저장/모바일 stacked/flex 초기값 4개를 유지한다. Profiler로 드래그 후 외부 숫자 prop 변경 및 0/-0 변경의 첫 commit부터 두 비율이 맞는지 확인한다. 같은 prop, 한 쪽 미지정, 양쪽 미지정의 픽셀 복귀와 다시 flex로 전환하는 경우도 보호한다. NaN 동일 prop은 무한 재렌더 없이 완료되어야 한다.

수정 전 새 첫 commit 2사례 실패, 최종 관련 회귀/typecheck/build 통과 및 lint effect-state 89→88/전체 111→110을 확인한다. deps14/refs8과 다른 진단 signature는 동일해야 한다. 실제 375/768/1280px에서 합성 패널의 치수·핸들·넘침을 기록하며 768/1280px native 드래그 및 부모 재렌더/외부 reset을 확인한다. API·테넌트 데이터는 사용하지 않는다.
