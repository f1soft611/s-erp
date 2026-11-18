# 공지 작성 초안 초기화 결과

[작업지시서](../../../directions/20261118/20261118_049_notice-composer-draft_작업지시서.md) → [계획서](../../../plan/20261118/20261118_049_notice-composer-draft_계획서.md) → [상세사양](../../../spec/20261118/20261118_049_notice-composer-draft_상세사양서.md) 순서로 진행했다.

## 변경과 보존

기존 open/debug 조건의 순수 필드 초기화 effect를 두 값이 달라질 때만 수렴하는 render state guard로 옮겼다. 최초 값은 기존 useState initializer와 같으며 열린 상태에서만 기존 setter 아홉 개를 같은 순서/인자로 호출한다. 기본값 다섯 개를 effect dependency에 단순 추가해 작성 중 초안을 지우지 않는다.

전체 소스/AST로 초기값·setter 본문과 다른 코드가 그대로임을 확인했다. guard는 컴포넌트의 raw setter만 호출하며 render ref read/write는 0개다. editor 초기화/DOM·이미지 해석/URL·cleanup·blur의 세 effect는 바이트 보존했다. 저장·취소·close lifecycle, 본문 defaultBody 변경 정책, 공개 props·JSX/CSS·API/DB·패키지 계약도 바꾸지 않았다. DB MCP·SQL 대상이 아니다.

## 검증

| 항목 | 실제 결과 |
| --- | --- |
| 대상 lint RED | target 진단 0개 assertion이 기존 state/dependency 2개로 실패 |
| 집중 회귀 | 열린 초안의 기본값 교체/첨부 삭제/재열기, debug flag 전환 2개 추가 |
| runtime 기준선/수정 후 | 새 회귀를 포함한 동일 composer-theme/payload/page/login-popup **4파일·83개씩 통과**, 실패·대기 0 |
| 기존 회귀 | 기존 theme 11개 본문 보존, 편집·툴바·첨부·닫힘·본문/저장/팝업 정책 포함 |
| 전체 lint | **94 → 92**, 대상 2개만 제거·새 진단 0 |
| 잔여 분류 | effect-state 82 / deps 2 / refs 8 |
| typecheck/build | `tsc -b`, `vite build` 각각 exit 0; 기존 큰 chunk 안내 유지 |
| 범위/일치 | 운영 1파일의 초기화 block과 기존 테스트 파일의 2개 추가, frontend 890파일 byte 일치 |

UTC/threads/worker 2로 실행했다. 기존 동작 보존 회귀이므로 기준선도 83개 통과하며 RED는 실제 lint 진단이다. [범위 근거](screenshots/notice-composer-draft/scope-audit.json)와 [브라우저 수치](screenshots/notice-composer-draft/verification.json)를 보관했다.

## 실제 브라우저

실제 NoticeComposerDialog·CommonDialog·RichTextEditor·테마 provider를 합성 제목/본문/구분/팝업/종료일/첨부로 사용했다. 모든 fetch를 차단하고 Storage property는 탭 한정 메모리 객체로 대체했다. 실제 저장 값 read/write나 운영 요청 fallback은 없다.

| 폭 | metadata/테마 갱신 | 정상 취소/재열기 | 캡처 |
| --- | --- | --- | --- |
| 375 | 제목/본문 입력·기존 첨부 삭제, 구분/팝업/종료일 초안 유지 | 최신 기본 제목/본문·구분/팝업/종료일/첨부 적용 | [초안](screenshots/notice-composer-draft/draft-375.png) / [재열기](screenshots/notice-composer-draft/reopened-375.png) |
| 768 | 동일 | 동일 | [초안](screenshots/notice-composer-draft/draft-768.png) / [재열기](screenshots/notice-composer-draft/reopened-768.png) |
| 1280 | 동일 | 동일 | [초안](screenshots/notice-composer-draft/draft-1280.png) / [재열기](screenshots/notice-composer-draft/reopened-1280.png) |

모달 뒤 합성 UI를 억지로 클릭하지 않고 fixture의 native Alt+M/Alt+T로 기본값/테마를 바꿨다. 입력/첨부 삭제/취소/열기는 native fill/click으로 수행했다. 열기/닫기 각 6회, submit 0회, 알 수 없는 fetch 0개였고 세 폭에서 문서 가로 넘침 없이 모달이 뷰포트 안에 있었다. PNG 6개/JSON 2개를 보관하고 소유 탭만 닫았으며 공유 서버는 변경·종료하지 않았다.

debug 전환은 집중 Vitest에서 검증했으며 브라우저 검증 범위로 확대하지 않는다. 합성 shortcut/기본값/제어 UI도 제품 기능 변경이 아니다.

## CI와 잔여

이번 049의 정확한 SHA `4871799e9004f6edd56719aa0974a4aaf7cfada9`에 대한 [전체 CI 44335269537](https://github.com/f1soft611/s-erp/actions/runs/44335269537)를 별도로 확인했다. **226파일·2,680개 통과**, frontend-build/tests/lint/required 네 job 모두 success이며 status와 원본 마지막 집계를 대조했다. [원격 CI 근거](screenshots/notice-composer-draft/remote-ci.json)를 보관했고 실행 완료 뒤에만 다음 단위를 push한다.

[048의 정확한 SHA 전체 CI](20261118_048_grid-source-deps_결과.md) **226파일·2,678개**도 원본 집계와 네 job success로 확인했다. 그 선행 결과를 이번 049 소스의 전체 결과로 재사용하지 않고 위 실행으로 별도 확인했다.

최초 206개 중 114개를 제거했고 **92개 경고는 순차 처리 중**이다. 공식 호환 경로 없는 권고 2건은 [027](20261118_027_dependency-remediation-boundary_결과.md)의 BLOCKED 상태로 유지한다. 기존 TreeProjection 3단계 및 자료실 모바일 보조정보 관찰은 이 단위에서 수정하지 않았다.

```text
fix(frontend): 공지 작성 초안 초기화 소유권 정리

- 기존 open/debug 조건과 순수 필드 초기화 인자 보존
- 기본값·테마 변경 중 초안 유지와 재열기/debug 회귀 추가
- 관련 83개·실제 3폭 검증, lint 94→92
```
