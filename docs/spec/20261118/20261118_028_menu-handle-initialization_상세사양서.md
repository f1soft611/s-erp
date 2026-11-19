# 메뉴 imperative handle 초기화 순서 상세사양

## 원인

기존 handle factory는 소스 위치상 columns 선언 및 handleSave 선언보다 앞에 있다. 실제 factory 실행은 commit의 layout 단계여서 기존 JavaScript 동작은 가능하지만 React Compiler는 초기화 전 변수 접근으로 진단한다.

## 최소 수정

useImperativeHandle 호출과 바로 뒤 dirty 통지 useEffect를 하나의 연속 블록으로 원문 그대로 이동한다. 삽입 위치는 columns와 handleSave를 포함한 모든 지역 선언 뒤, 컴포넌트 JSX return 직전이다.

두 Hook을 함께 옮기므로 useRef/useState/useImperativeHandle/useEffect의 호출 순서는 바뀌지 않는다. handle 등록은 여전히 layout 단계, dirty 통지는 passive 단계다. handle factory의 deps 생략 및 dirty effect의 `[changes, onDirtyChange]`를 유지한다.

## 보존 범위

저장 checkpoint·권한 반영·재시도·refresh·저장 중 중복 방지·CSV 내용·선택 행 삭제·최신 props/closures·콜백과 UI JSX를 그대로 유지한다. 서비스/API/DB 계약·메뉴 URL·권한 정책·Grid 동작과 레이아웃을 바꾸지 않는다.

## 검증

원문 이동 AST 보존, 관련 실제 메뉴 테스트 두 파일, typecheck와 lint 진단 2 → 0/전체 139 → 137을 확인한다. 화면 구조/행동을 추가하지 않는 선언 위치 정리라 신규 스크린샷 대상이 아니며 기존 메뉴 화면 증거를 유지한다.
