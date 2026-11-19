# 공지·피드 테스트 복구 결과

## 범위와 원인

- [작업지시서](../../../directions/20261118/20261118_001_repository-remediation_작업지시서.md)
- [계획서](../../../plan/20261118/20261118_002_notice-feed-test-recovery_계획서.md)
- [상세 사양서](../../../spec/20261118/20261118_002_notice-feed-test-recovery_상세사양서.md)
- 범위: `feed-components.test.tsx`, `notice-page-local-updates.test.tsx`, `notice-page.test.tsx`, `notice-summary.test.ts` 및 계획·결과 문서.
- 일반 공지 fixture는 `isPinned: 'N'`이므로 수정 payload 단언을 `N`으로 맞췄다. 목록 API의 일반 공지 계약과 일치한다.
- 댓글 버튼의 실제 클릭은 `NoticeFeedList` 상호작용 래퍼까지 버블링되어 상세 조회를 시작한다. 이 요청이 댓글 삭제/첨부 삭제보다 늦게 끝나면 오래된 댓글을 병합하여 이미 완료된 로컬 변경을 되돌리는 경합이 있었다.
- 처음의 119/119 검사는 삭제 API 이후 mock 응답도 이미 삭제된 서버 데이터로 바꾸고 있어 로컬 상태 보존을 증명하지 못했다. 이를 제거하고 상세 조회를 보류했다가 **변경 전 상태**로 완료하는 회귀 검사를 추가했다. 수정 전 두 테스트는 로컬 UI가 먼저 바뀐 뒤 오래된 응답에서 첨부가 복구되거나 부모 댓글 placeholder·댓글 수가 되돌아오는 것을 재현했다.
- `useNoticeInteractions`는 조회 시작 시 댓글 배열 참조와 총 건수를 저장하고, 응답 시점에 이 값이 달라졌으면 현재 댓글 상태를 보존하면서 나머지 상세 필드는 병합하도록 최소 수정했다. API·DB 계약 변경은 없다.
- 삭제 API 호출 확인과 React DOM 반영은 별도 시점이므로 `findByText`/`waitFor`를 사용한다. 동작 단언은 유지했다.
- 운영 UI의 레이아웃·외형은 바뀌지 않았지만 댓글 상호작용 동작이 바뀌므로, 아래 실제 브라우저 검증과 스크린샷을 추가했다.

## 검증

잠금 설치는 Vitest 4.1.12 / Vite 8.3.8을 사용했다. 검증 worktree의 Git HEAD는 기준 `9a9b0729`이며, 부모가 준비한 `22bd60b8` 프론트엔드 소스 오버레이(4개 변경 파일 hash 확인)와 이 작업의 테스트 파일 변경을 적용한 상태에서 실행했다. 잠금 의존성을 설치하거나 교체하지 않았다.

| 검증 | 결과 |
|---|---|
| 수정 전 네 공지·피드 파일, 잠금 설치 | 115 통과, 4 실패 |
| 보강된 경합 회귀 검사, 제품 수정 전 | 2 실패. 요청 전에 시작된 상세 응답이 첨부 삭제와 댓글 삭제를 되돌림 |
| 기존 119/119 중간 실행 | mock이 서버도 변경된 상태로 반환하여 증거로 채택하지 않음 |
| 수정 후 네 공지·피드 파일, 잠금 설치 | 119 통과 |
| 수정 후 경합 회귀 2개 | 2 통과 |
| 변경한 훅·테스트 oxlint | 통과, 경고 없음 |
| 전체 타입 검사 | 담당 단계에서는 미실행. 이후 상위 최종 검사에서 종료 코드 0, [종합 결과](20261118_009_repository-remediation-validation_결과.md) 참조 |

## 실제 브라우저 검증

- 공유 iPlusMES Vite 서버 `http://127.0.0.1:4173`을 재사용했으며 서버를 종료하거나 교체하지 않았다. 격리 Orca 프로필/탭에서 임시 harness가 실제 `CommunityNoticePage`와 `useNoticeInteractions`를 직접 마운트했다. 로그인 화면이나 개발 힌트가 포함된 전체 앱은 사용하지 않았다.
- 모든 `/api/` `fetch` 요청은 harness가 합성 응답으로 처리하고, 알 수 없는 API/외부 요청은 차단했다. 합성 사용자 ID만 소유권 fixture로 두었으며 access/refresh token은 빈 문자열이었다. 실제 인증, DB, 백엔드 API 및 테넌트 행은 사용하지 않았다.
- 일반 공지 피드에는 댓글이 있는 변경 전 데이터만 제공했다. 실제 페이지의 댓글 메뉴를 열어 상세 조회를 보류하고 삭제 API 성공 후 로컬 삭제 placeholder를 확인한 다음, 동일한 변경 전 댓글/건수를 담은 보류 응답을 resolve했다. 서버가 삭제된 상태를 반환하도록 fixture를 바꾸지 않았다. `orca click`은 Orca 입력 보호(미완성 IME 입력 보존)로 차단되어, 같은 격리 탭에서 실제 페이지 버튼의 DOM `click()` 이벤트로 React 동작을 실행했다.
- 브라우저 상태에서 모든 폭에 `syntheticDataOnly`, `detailRequestWasHeld`, `deleteSucceeded`, `staleDetailResolved`, `deletedPlaceholderVisible`, `deletionSurvivedStaleDetail`이 `true`, 응답 완료 후 `detailRequestPending`, `oldCommentVisible`, `horizontalOverflow`가 `false`였다.

| CSS viewport | document client/scroll width | 가로 넘침 | 결과 화면 |
|---:|---:|---|---|
| 375px | 375 / 375px | 없음 | [notice-stale-detail-375.png](screenshots/notice-stale-detail-375.png) |
| 768px | 753 / 753px | 없음 (세로 스크롤바 제외 15px) | [notice-stale-detail-768.png](screenshots/notice-stale-detail-768.png) |
| 1280px | 1280 / 1280px | 없음 | [notice-stale-detail-1280.png](screenshots/notice-stale-detail-1280.png) |

검증 후 자체 생성한 격리 Orca 탭·프로필과 임시 harness 파일을 정리했다. 공유 서버와 다른 작업의 파일은 보존했다.

```powershell
node .\node_modules\vitest\vitest.mjs run tests\feed-components.test.tsx tests\notice-page-local-updates.test.tsx tests\notice-page.test.tsx tests\notice-summary.test.ts --pool=threads --maxWorkers=2 --reporter=default --no-color
```

수정 후 전체 네 파일 실행에서 일부 기존 `act(...)` 경고가 출력됐지만 테스트는 모두 통과했다. 경고 수정으로 범위를 넓히거나 시간 제한을 올리지 않았다. 검증 worktree의 Git HEAD는 기준 `9a9b0729`이고, 상위 작업이 적용·hash 확인한 `22bd60b8` 프론트엔드 소스 오버레이와 이 작업의 변경 파일만 반영한 잠금 설치 결과다. 공유 설치는 Vitest 4.1.11 / Vite 8.2.2라 최종 근거로 사용하지 않았다.

## 변경 및 보존

- 테스트 변경은 세 파일(`feed-components.test.tsx`, `notice-page-local-updates.test.tsx`, `notice-page.test.tsx`)이고, 제품 변경은 `useNoticeInteractions.ts` 한 파일이다. `notice-summary.test.ts`는 수정하지 않았다.
- 단언 삭제·skip 추가·전역 시간 제한 변경은 없다.
- 검증 worktree에는 위 세 테스트 파일과 새로 변경한 상호작용 훅만 복사했다. 다른 작업의 파일 변경은 보존했다.

## 복사용 커밋 문구

```text
test(notice): 공지 피드 검증을 현행 계약에 맞춤

- 댓글 상세 재조회 fixture와 비동기 DOM 검증을 정합화
- 일반 공지의 비고정 payload를 명시
- 오래된 상세 응답이 로컬 댓글 변경을 덮어쓰지 않도록 보호
```

커밋은 생성하지 않았다.
