# 메뉴 handle 초기화 순서 결과

## 변경과 동작 보존

MenuManagementPanel의 useImperativeHandle과 바로 뒤 dirty 알림 useEffect를 함께 handleSave 선언 뒤로 이동했다. 함수·배열 선언을 마친 뒤 handle을 등록하므로 React Compiler의 초기화 전 변수 참조 진단 두 개가 없어졌다.

원문 연속 블록의 위치만 바뀌었다. TypeScript AST의 컴포넌트 statement 원문 집합과 Hook 순서(useRef 3회 → useState 5회 → useImperativeHandle → useEffect)가 전후 동일하다. layout/passive 위상과 callback/deps도 그대로다. 저장·권한·재시도·CSV·선택 삭제·화면 JSX·서비스·API·DB를 바꾸지 않았다.

## 검증

- 실제 메뉴 테스트 두 파일: 65/65 통과, 실패·제외 0. UTC, threads/worker 2.
- typecheck exit 0. lint exit 0은 경고 0을 뜻하지 않는다. 전체 진단은 139 → 137개이며 immutability 2 → 0 이외 진단은 동일하다.
- 검증 worktree와 현재 frontend 890파일 byte 일치. statement 내용/Hook 순서 보존 audit 통과.
- 선언 위치만 정리했고 화면 구조/동작 변경이 없어 새 스크린샷은 생성하지 않았다. 기존 메뉴 화면 증거를 유지한다.
- backend·manifest·SQL 변경 없음. DB MCP/백엔드 재검증 대상이 아니다.

세션 근거: `lint028-related.json`, `lint028-oxlint.json`, `lint028-typecheck.log`, `lint028-parent-audit.json`. 이번 단위는 관련 65개를 실행했다. 전체 2,641개 통과는 이전 026 소스 기준 결과이며 이번 실행으로 표현하지 않는다.

## 검토와 잔여

사양 검토: 참조 대상 선언 뒤 등록, 원래 Hook 순서/본문/의존 배열 유지. 품질 검토: 원문 이동 동등성 및 AST audit와 실제 메뉴 회귀에서 추가 문제 없음.

남은 lint: set-state-in-effect 97, exhaustive-deps 28, refs 10, preserve-manual-memoization 2. 의존성 두 권고는 027에 기록한 공식 수정 경로/사전 번들 차단 상태다. 전체 요청은 계속 진행한다.

## 복사할 커밋

제목: `fix: 메뉴 imperative handle 선언 순서 정리`

내용: `Hook 호출 순서와 동작을 유지하면서 초기화 참조 경고 2개를 제거하고 메뉴 회귀 65개를 확인한다.`
