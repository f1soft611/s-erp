# 서버 날짜 callback commit 경계 결과

## 재현과 원인

render 본문의 callback ref 대입 때문에 suspend되어 commit되지 않은 render가 이전 화면의 진행 중 서버 요청 callback을 덮어썼다. 성공·실패 두 transition 재현에서 새 render가 시도되되 기존 hook 결과는 유지되는 것을 먼저 확인했다.

수정 전 두 사례 모두 미반영 callback이 1회 호출되어 실패했다. 단순히 응답이 사라진 상황이 아니라 잘못된 render의 callback으로 전달되는 문제임을 확인했다.

## 최소 변경

onDate/onError ref 쓰기만 두 함수를 의존하는 useLayoutEffect로 옮겼다. ref 초기값은 유지하고 최신 commit callback을 layout 단계에 반영한다. 조회 effect·deps·요청 횟수·사용자 날짜 우선·오류·unmount 보호·reload/markTouched는 그대로다. layout effect는 ref만 갱신하며 UI state update는 없다.

## 검증

- RED: 새 두 사례 모두 의도한 잘못된 callback 호출로 실패. 기존 hook 8개는 통과.
- GREEN: hook 10개와 실제 수주등록 36개, 합계 2파일/46개 통과. 실패·제외 0, UTC/threads/worker 2.
- typecheck exit 0. refs 10 → 8, 전체 lint 135 → 133. 해당 두 진단 이외 변화 없음.
- 지정한 import와 ref commit 이동 외 운영 코드 변화 없음. 검증 복사와 frontend 890파일 byte 일치.
- 사양 검토: 미반영 callback 미호출·최신 commit callback 사용·요청 추가 없음. 품질 검토: render 쓰기를 실제 commit 단계로 옮겼고 규칙 억제나 상태 effect의 위상 변경이 아니다.
- 화면 구조 변경이 없어 신규 스크린샷 대상이 아니다. 서비스/API 계약·backend·SQL·manifest 변경 없음.

세션 근거: `lint030-red.json`, `lint030-red-specific.json`, `lint030-related.json`, `lint030-oxlint.json`, `lint030-typecheck.log`, `lint030-parent-audit.json`. 이번 단위의 관련 46개 실행과 이전 전체 2,641개 실행을 구분한다.

잔여 lint 133개: set-state-in-effect 97, exhaustive-deps 28, refs 8. 의존성 두 권고는 027 차단 근거가 유지된다. 전체 요청은 계속 진행한다.

## 복사할 커밋

제목: `fix: 서버 날짜 callback을 commit 시점에 동기화`

내용: `중단된 render의 callback이 서버 응답을 가로채지 않도록 하고 성공·실패 재현과 실제 수주등록 회귀 46개를 확인한다.`
