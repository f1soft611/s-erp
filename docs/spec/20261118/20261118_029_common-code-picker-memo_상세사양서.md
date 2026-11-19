# 공통코드 상위 선택 메모이제이션 상세사양

## 원인과 변경

openParentPicker는 찾은 부모 객체의 존재와 id만 읽는데 객체 전체를 의존성으로 캡처한다. React Compiler는 해당 객체의 이후 변경 가능성을 배제하지 못해 같은 callback에 진단 두 개를 보고한다.

기존 부모 검색/판정은 유지하고 `parentGroup ? String(parentGroup.id) : null`을 계산한다. callback은 null일 때만 picker를 닫고 반환한다. 그 외에는 기존 String(parentGroup.id)와 동일한 문자열로 같은 서비스를 호출한다. 0이나 빈 문자열을 falsy 부재로 취급하지 않는다. 부모 ID는 편집 컬럼이 아니다.

useCallback을 없애거나 규칙을 억제하지 않는다. dependencies는 onError·parentGroupId·saving이며, callback의 실제 primitive 입력을 모두 포함한다.

## 보존

저장 전후 saveInFlightRef 검사, parentPickerApplyRef 등록, 현재 행 제외, 비동기 옵션 설정/열기, 오류 문구, 호출부의 부모 존재/잠금 판단을 유지한다. UI JSX·API 경로/데이터 계약·서비스·백엔드·SQL은 변경하지 않는다.

## 검증

기준 memoization 2 → 0, 전체 137 → 135, 다른 진단은 동일해야 한다. 문자열/숫자/0/빈 ID의 변환·null guard 동등성, 실제 공통코드 테스트, typecheck를 확인한다. 레이아웃이나 기능을 변경하지 않는 callback 캡처 정리이므로 신규 화면 시안/스크린샷은 생성하지 않는다.
