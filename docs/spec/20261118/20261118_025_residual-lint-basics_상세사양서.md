# 잔여 lint 저위험 항목 상세사양

## 기준과 목표

현재 206개는 only-export-components 56, set-state-in-effect 97, exhaustive-deps 28, refs 10, immutability 2, preserve-manual-memoization 2와 이 단위의 11개다. 이 단위는 마지막 11개만 제거해 195개로 줄인다. 경고 분류를 새 오류/기존 오류 또는 실제 취약점 수와 혼동하지 않는다.

## 동작 보존 계약

- 중복 fixture key는 같은 `'Y'` 값이다. 마지막 값과 adapter 기대값을 유지한다.
- 미사용 import는 실제 사용처가 없는 named import만 제거한다.
- `const grid = await screen.findByRole(...)`에서 선언만 제거한다. DOM 준비를 기다리는 call과 await는 그대로 둔다.
- `const { rerender } = render(...)`는 `render(...)`로 바꾼다. 렌더링과 기존 사용자 동작·단언은 유지한다.
- 브라우저 스크립트의 미사용 locator 구성과 bounds 읽기는 기존 결과 객체/검사/스크린샷에 영향을 주지 않는다. 다른 브라우저 동작은 수정하지 않는다.
- Boolean cast는 조건식에서 이미 같은 truthiness로 평가된다. 결과 `'Y'/'N'`을 바꾸지 않는다.
- catch의 에러 인수만 제거한다. try 요청, catch 실행과 사용자 안내는 유지한다.
- 메뉴 경로 template은 `'/'` separator를 항상 포함하므로 빈 문자열이 될 수 없다. 실제 반환 경로를 그대로 유지하고 도달 불가능한 fallback만 제거한다.

## 변경하지 않는 범위

서버/API/DB, 권한, 메뉴 URL, 기존 화면·Grid 동작, Hook 의존성, 상태 초기화 시점, memoization, ref, lint 설정과 의존성 manifest/lock은 변경하지 않는다.

F1Grid 관련 파일은 기존 테스트의 미사용 import/binding 정리뿐이며 Grid 기능·API·UI 동작은 수정하지 않는다. 이 결과 문서로 정리 범위를 기록하고 신규 UI 스크린샷은 요구하지 않는다. 이후 Grid 운영 동작을 수정하는 단위에는 F1-GRID 문서와 실제 브라우저 검증을 함께 포함한다.

## 완료 조건

네 규칙 진단 0/전체 195개, 관련 테스트·typecheck·스크립트 구문·문서 링크 검증, 실제 변경 범위와 작업 단위 커밋/push 확인이다. 나머지 195개와 의존성 두 권고는 이 결과로 해결됐다고 표현하지 않는다.
