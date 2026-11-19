# 발주현황 시작 상태 — 073 중단·재개 기록

**상태: 사용자 요청으로 중단. 전체 잔여 정리와073은 미완료이며 이 파일은 최종 완료 결과가 아니다.**

## 재개 요청 확인 (2026-11-19)

사용자가 이전 Copilot 세션 `1ad9bc48-f113-44c6-ae93-51233b4e5c41`의 **“073 인계 기록부터 이어서 진행해줘”**를 다시 지정하고, 이어서 계속할 수 있도록 문서로 기록해 달라고 요청했다. 이 결과 문서를 재개 기준으로 사용한다. 세션 상태와 함께 별도 인계 메모도 `C:\Users\socra\.copilot\session-state\1ad9bc48-f113-44c6-ae93-51233b4e5c41\files\remediation-handoff-20261119.md`에 보존되어 있다.

재개 시점 확인: 원격/HEAD는 여전히 `225d7f761b5cc838cdce59f93d42d984ecd6d667`이며, 072의 정확한 전체 CI는 성공했다. 073의 두 프론트엔드 파일과 006 지시/계획/사양/결과 문서는 로컬 미커밋 상태다. 005 계획/결과 보강과 072 `remote-ci.json`도 로컬 미커밋이다. 073 native/audit/커밋/푸시/CI는 수행하지 않았다. 기존 변경을 덮어쓰거나 초기화하지 말고 아래 재개 순서부터 진행한다.

## 완료·푸시된 기준

- 브랜치 `socra710`, HEAD/원격 일치: `225d7f761b5cc838cdce59f93d42d984ecd6d667`(072 구매요청현황).
- 정확한 [CI44422062406](https://github.com/f1soft611/s-erp/actions/runs/44422062406): 마지막 집계227파일2,727개, build/tests/lint/required 네 job 성공. [최종 판정](screenshots/purchase-request-status-start/remote-ci.json).
- 커밋된 기준 lint는206→63개다.073 로컬 검증은63→60개이지만 **아직073을 푸시하지 않았다.**
- 공식 호환 패치가 없는 의존성 권고2건은 여전히 차단 상태다. 패치가 없는 것을 override/lock 변경으로 해결했다고 표현하지 않는다.

## 073 현재 범위

[지시서](../../../directions/20261119/20261119_006_purchase-order-status-start_작업지시서.md) → [계획서](../../../plan/20261119/20261119_006_purchase-order-status-start_계획서.md) → [사양서](../../../spec/20261119/20261119_006_purchase-order-status-start_상세사양서.md)를 작성했다.

수정한 운영/테스트 파일은 아래2개다.

- `frontend/src/pages/materials/order/status/hooks/usePurchaseOrderStatus.ts`
- `frontend/tests/purchase-order-status.test.tsx`

search 초기화 wrapper·list filters/retryRequest/마지막 실제 시작 version·detail selectedId/refreshToken guard만 대상으로 한다. 정상 status=ACTIVE, session version2, 실제 HTTP item wrapper, view/edit/close mode를 유지했다. Page/Grid/JSX/CSS·서비스/API·공통 훅·수정/취소/입고대기마감/출력은 변경하지 않는다.

## 확인된 증거

| 항목 | 현재 실제 결과 |
| --- | --- |
| 변경 전 기준선 | 현황1파일21개 통과 |
| 구현 전 RED | 실제 search 최초/지연2 + list 최초/지연2 + detail1 = 첫 commit assertion 실패5개 |
| 관련 회귀 | 현황/등록/출력3파일52개 통과, 현황26개 |
| 정적 검증 | TypeScript/Vite exit0, 기존 chunk 크기 안내 유지 |
| Oxc | 로컬63→60개, 전체 label 비교는 아직 미실행 |
| native / PNG | **미실행 / 없음** |
| 범위 audit | **미실행** |
| 073 커밋 / 푸시 / 전체 CI | **없음** |

073 구현/테스트는 루트와 아래 검증 workspace에 보존되어 있다.072의 정확한 CI 최종 문서2개와 `remote-ci.json`도 이번 미커밋 상태에 포함한다.

## 재개 순서

1. root/영역별 AGENTS·팀/반응형 지침과 위 지시서/계획서/사양서를 확인한다. root `git status`와 HEAD/원격을 재확인하고 사용자 변경을 되돌리지 않는다.
2. `lint073-audit.cjs`를 작성한다.072 audit를 참조하되 기준 SHA는 위225d7f76…, 대상은 order, 기존 테스트21개·관련52개/현황26개·진단63→60/제거3·source891 byte parity를 **실제 확인**한다. 새 테스트 describe 블록과 nullable default mock 제어를 제거했을 때 기존21개 본문이 그대로인지 확인한다. 목록/상세의 null `return undefined`와 정상 기본값 useMemo를 유지한다.
3. 준비된 `order073-browser.ps1` / `order073-evidence.cjs`를 **검토 후 처음 실행**한다.072의 소유 합성 probe/harness를 domain별로 재사용한다. 실제 search/list/detail/session 독립 훅·합성 default/deferred GET·메모리 저장소이고 전체 업무 Page/Grid 검증이 아니다. status=ACTIVE/version2/복원 ALL 및 order 전용 close mode까지 확인한다.
4. 375/768/1280px native·PNG6·모든 쓰기/기타 transport/영구 저장소 차단·오류/이탈/가로 넘침0과 소유 탭 닫힘을 확인한다. 공유4173 서버를 중지·재시작·다른 포트로 대체하지 않는다.
5. 실제 결과로 이 파일과 계획서 체크박스를 갱신하고073 screenshot/audit/verification을 저장한다. 직접 작은 diff 리뷰·빈 index·전역 dirty allowlist·선행072 CI 성공을 gate한다.
6. 별도073 커밋/비강제 푸시·원격 일치·정확한073 SHA 전체 CI를 확인한다. 필수 Co-authored-by trailer를 포함한다. **아직 이 단계에 도달하지 않았다.**
7. 이후 남은60개와 최종 검증을 순차 진행한다. 다음 유사 후보는 가입고현황/입고검사현황의 각3개이며 먼저 문서/계약/기존 테스트를 확인한다. 공통 컴포넌트는 같은 owner인지 확인하지 않고 render로 옮기지 않는다.

## 로컬 증거·도구

- 세션: `C:\Users\socra\.copilot\session-state\1ad9bc48-f113-44c6-ae93-51233b4e5c41`
- 증거 폴더: 위 세션의 `files`.
- `lint073-baseline.log/json`, `lint073-red-runtime.log/json`, `lint073-related.log/json`, `lint073-typecheck.log`, `lint073-build.log`, `lint073-oxlint.json`.
- **준비만 한 파일:** `order073-browser.ps1`, `order073-evidence.cjs`. `order073-page.json`은 중단 확인 시 없었다.073 소유 브라우저 탭/서버/진행 중 CI watcher는 없다.
- 참고: `lint072-audit.cjs`, `lint072-sync.cjs`, `request072-fixture.js`, `request072-browser.ps1`, `request072-evidence.cjs`, `receipt069-browser.ps1`, `receipt069-evidence.cjs`, `favorite038-browser-helpers.ps1`, `verify-frontend-ci.cjs`.
- 이전 단위 audit/sync는 커밋 후 재실행하지 않는다.073용으로 먼저 복제·수정·검토한다.
- 검증 workspace: `C:\Users\socra\orca\workspaces\S-ERP\repository-remediation-20261118`. 오래된 Git HEAD에 frontend overlay를 사용한다. reset/merge/clean 금지, private/.env/node_modules 복사 금지.
- runner는 위 workspace의 `frontend`에서 `TZ=UTC`, `.\node_modules\.bin\vitest.cmd run --pool=threads --maxWorkers=2 tests/purchase-order-status.test.tsx tests/purchase-order-create.test.tsx tests/purchase-order-print.test.tsx`, `tsc.cmd -b`, `vite.cmd build`, `oxlint.cmd --format=json`.
- Vitest report는 `.artifacts\vitest\report.json`이며 각 실행 직후 별도 복사한다. source parity는 raw byte, 기존 테스트 비교는 LF/trimEnd 정규화한다.
- frontend state/sessionStorage만 대상, backend/API/DB 변경 없음. DB MCP/SQL 대상이 아니다.

## 재개 요청 예시

“잔여 lint 정리를073 인계 기록부터 이어서 진행해줘. 미완료 작업을 보존하고 audit/브라우저 검증부터 시작해줘.”

현재는 미완료이므로073 커밋 제목/완료 스크린샷을 최종 결과처럼 제공하지 않는다.
