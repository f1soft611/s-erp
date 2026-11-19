# 공통 이미지 상태 경계 정리 결과

[작업지시서](../../../directions/20261118/20261118_034_image-state-boundaries_작업지시서.md) → [계획서](../../../plan/20261118/20261118_034_image-state-boundaries_계획서.md) → [상세사양](../../../spec/20261118/20261118_034_image-state-boundaries_상세사양서.md) 순서로 진행했다.

## 원인과 최소 변경

ImageViewerDialog의 displaySrc는 사용자 수정 없이 src effect로만 갱신됐다. 열린 뷰어의 src가 바뀌면 이전 이미지를 먼저 commit했다. Profiler의 첫 실제 img src를 관찰하는 회귀를 먼저 추가했고, 수정 전 8개 중 이 1개만 실패했다. 별도 state/effect를 제거하고 전달받은 src를 직접 표시한다.

ProfileAvatar의 실패 상태는 이미지 error 이벤트가 소유하므로 유지한다. 이전 imageUrl이 바뀐 경우에만 failedImageUrl을 null로 조정해 불필요한 effect commit을 제거했다. 같은 URL의 실패는 유지하고 A 실패→B→A 및 A 실패→null→A는 다시 시도하는 기존 계약을 회귀로 고정했다. 호출자 onError의 이벤트 target과 횟수도 확인했다. 이 사례는 기존 동작 보존이며 아바타에 없던 stale-image 버그를 재현했다고 주장하지 않는다.

아바타 JSX·onError 본문·props는 그대로다. 뷰어 JSX는 `src={displaySrc}` → `src={src}` 한 곳만 바뀌었다. CommonDialog, 제목/닫기/alt, 테마·체크무늬·비율·스타일, Blob URL 생성/해제, 데이터 조회/인증/API/DB는 변경하지 않았다. inner MUI Avatar의 자체 이미지 로딩 동작도 교체하지 않았다.

## 검증

| 항목 | 실제 결과 |
| --- | --- |
| RED | 2파일/8개 중 7개 통과, 새 뷰어 첫 commit 회귀 1개 실패; 대상 lint 2개 존재 |
| 최종 관련 회귀 | **6파일/126개 통과**, 실패·대기 0; 새 회귀 2개 포함 |
| 실행 조건 | UTC, Vitest threads, worker 2 |
| typecheck/build | `tsc -b`, `vite build` 각각 exit 0; 기존 큰 chunk 안내 유지 |
| 전체 lint | **115 → 113**; effect-state 93 → 91, deps 14·refs 8 동일 |
| 진단 비교 | 위 2파일의 effect-state 2개만 제거, 새 진단 0 |
| 범위 검증 | frontend 890파일 root/소유 검증 workspace byte 일치, 기존 테스트 본문 보존 |

회귀 범위는 `profile-avatar`, `image-viewer-dialog`, `feed-components`, `document-feed-item`, `notice-page`, `notice-page-local-updates`다. 운영 2파일·테스트 2파일만 변경했고 manifest/lock/backend 변경은 없다. F1-Grid 자체의 이미지 셀·이벤트는 변경하지 않았다.

raw 증거는 세션의 `lint034-red.json`, `lint034-related.json`, `lint034-oxlint.json`, `lint034-typecheck.log`, `lint034-build.log`에 있다. 저장소에는 [scope audit](screenshots/image-state-boundaries/scope-audit.json)과 [실제 화면 검증](screenshots/image-state-boundaries/verification.json)을 보관했다. 이전 031 또는 033의 CI를 이번 이미지 변경 전체 테스트 결과로 간주하지 않는다.

추가로 이 단위 커밋 `e2b93480853e1a2bdecd7ab539715c5d5fe27179`의 [원격 CI 44293639019](https://github.com/f1soft611/s-erp/actions/runs/44293639019)를 raw log와 source SHA로 확인했다. **226파일/2,649개 전체 통과**, build/lint/tests/required 네 job 모두 success다. [원격 증거](screenshots/image-state-boundaries/remote-ci.json)를 보관했다. 후속 035 검색 변경의 전체 결과로 재사용하지 않는다.

## 실제 브라우저

실제 두 컴포넌트와 createAppTheme를 합성 SVG·이름으로 mount했다. SVG는 불투명 빨강/파랑/초록 및 반투명 노랑과 빈 영역으로 구성했다. 데이터 URI만 사용했으며 업무 API·테넌트 데이터는 사용하지 않았다. 공유 4173 서버를 변경하지 않았고 검증 후 소유 탭만 닫았다.

| 폭 | light | dark | 실제 이미지 치수 |
| --- | --- | --- | --- |
| 375 | [캡처](screenshots/image-state-boundaries/viewer-light-375.png) | [캡처](screenshots/image-state-boundaries/viewer-dark-375.png) | 253 × 147.58px |
| 768 | [캡처](screenshots/image-state-boundaries/viewer-light-768.png) | [캡처](screenshots/image-state-boundaries/viewer-dark-768.png) | 480 × 280px |
| 1280 | [캡처](screenshots/image-state-boundaries/viewer-light-1280.png) | [캡처](screenshots/image-state-boundaries/viewer-dark-1280.png) | 480 × 280px |

6경우 모두 원본 480:280 비율·동일 src·filter none·체크무늬를 확인했고 viewport와 문서 scrollWidth가 같다. surface는 light `rgb(255,255,255)`, dark `rgb(17,24,39)`로 앱 테마를 따른다. 반투명 영역의 배경 합성 차이는 의도된 동작이며 이미지 자체의 필터 보정은 없다.

아바타는 375px에서 [정상](screenshots/image-state-boundaries/avatar-loaded-375.png) → 의도적인 잘못된 data URI의 [SP fallback](screenshots/image-state-boundaries/avatar-failed-375.png) → 정상 URL [복원](screenshots/image-state-boundaries/avatar-restored-375.png)을 확인했다. 크기 56px·가로 넘침 없음도 유지된다. 뷰어를 닫고 부모 src를 교체한 뒤 다시 열면 [새 이미지](screenshots/image-state-boundaries/viewer-replaced-375.png)가 나온다. Escape와 실제 닫기 버튼이 닫기 콜백을 실행하는 것도 확인했다. **열린 상태의 src 교체 첫 commit**은 앞서 명시한 Profiler 회귀가 검증한다.

## 잔여와 커밋

최초 206개 중 93개를 제거했고 lint **113개는 계속 처리한다**. 공식 호환 수정 경로가 없는 의존성 고유 권고 2건은 [027 결과](20261118_027_dependency-remediation-boundary_결과.md)의 BLOCKED 상태로 남는다. DB/API 변경이 없어 DB MCP·SQL 변경 대상이 아니다.

```text
fix(frontend): 공통 이미지 상태 경계 정리

- 뷰어 src의 불필요한 state 복사 제거
- 아바타 실패 URL 변경 시 재시도 계약 유지
- 관련 126개와 light/dark 반응형 화면 검증, lint 115→113
```
