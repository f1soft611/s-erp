# 요청 세대 cleanup 표현 정리 결과

## 변경과 원인

창고·거래처·품목·기안양식·메뉴의 numeric 요청 generation cleanup 6곳을 `++ref.current;`에서 `ref.current += 1;`로 바꿨다. 현재 분석은 cleanup의 prefix increment를 ref 쓰기로 인식하지 않아 DOM ref cleanup과 같은 경고를 보고했으나 명시적 assignment에서는 사라진다.

모두 useRef(0)인 내부 숫자 counter다. 최신값에 1을 더하는 연산과 시점은 동일하다. mount의 숫자를 복사하지 않았고 요청 시작 increment·응답 비교·effect deps·나머지 cleanup은 그대로다. 규칙 억제나 helper로 접근을 숨기지 않았다.

## 검증

- RED: 해당 5파일의 경고 0 gate가 진단 6개로 exit 1.
- GREEN: 전체 exhaustive-deps 28 → 22/전체 lint 133 → 127. 해당 cleanup 6개 이외 진단은 동일하다.
- 실제 관련 6파일/161개 통과, 실패·제외 0. UTC, threads/worker 2.
- typecheck exit 0. 지정한 숫자 쓰기 6표현만 변경한 exact-scope audit 통과. frontend 890파일과 검증 복사 byte 일치.
- 사양 검토: cleanup 시 최신 counter를 증가시켜 늦은 응답 무효화 유지. 품질 검토: generation 값 snapshot을 만들지 않았고 함수·Hook·deps·서비스 계약 변경 없음.
- 화면 구조 변경이 없어 새 스크린샷 대상이 아니다. backend·DB·manifest 변경 없음.

세션 근거: `lint031-red.json`, `lint031-oxlint.json`, `lint031-related.json`, `lint031-typecheck.log`, `lint031-parent-audit.json`. 이번 단위는 관련 161개 실행이며 이전 전체 실행과 구분한다.

잔여 lint 127개: set-state-in-effect 97, exhaustive-deps 22, refs 8. 의존성 두 권고는 027 차단 근거가 유지된다. 전체 요청은 계속 진행한다.

## 복사할 커밋

제목: `fix: 요청 세대 cleanup의 숫자 쓰기를 명시`

내용: `최신 요청 무효화 동작을 유지하면서 cleanup 경고 6개를 정리하고 관련 실제 회귀 161개를 확인한다.`
