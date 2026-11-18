# 공지·피드 테스트 복구 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 메뉴관리 복구 다음으로 공지·공통 피드의 현재 사양에 어긋난 테스트를 복구한다.

**Architecture:** 운영 컴포넌트는 현재 배지·고정 목록·초기 오류·댓글 소유권 계약을 유지한다. 테스트의 오래된 외형 단언, 중복된 제목 선택, 불완전한 응답 fixture와 비동기 대기를 원인별로 수정한다. 댓글 상태 변경보다 늦게 도착한 상세 조회가 로컬 변경을 덮어쓰는 경합이 재현되어 `useNoticeInteractions`의 최소 보호 변경을 포함한다.

**Tech Stack:** React, Vitest, Testing Library, MUI.

## 근거와 파일

- [작업지시서](../../directions/20261118/20261118_001_repository-remediation_작업지시서.md)
- 앞선 메뉴관리 65개 집중 테스트와 정적 검사는 통과했다.
- 변경 대상: `frontend/tests/feed-components.test.tsx`, `frontend/tests/notice-page-local-updates.test.tsx`, 직접 관련된 `frontend/tests/notice-page.test.tsx`, `frontend/tests/notice-summary.test.ts`.
- 운영 코드 변경은 이 계획의 기본 범위가 아니다. 실제 결함이 확인되면 별도 사양을 먼저 보완한다.

## Task 1: 잠금 설치 기준 재현

- [x] 새 검증용 worktree의 실제 Vitest 4.1.12에서 앞의 두 파일을 실행하여 29개 실패를 재현한다.

```powershell
node .\node_modules\vitest\vitest.mjs run tests\feed-components.test.tsx tests\notice-page-local-updates.test.tsx --pool=threads --maxWorkers=2 --reporter=json --no-color
```

- [x] JSON 보고서를 세션 작업 공간에 보존한다. 배지 11개는 8px 모서리 등 과거 표시 단언이고, 공지 18개는 초기 오류 재시도·중복 제목·댓글 상호작용 실패로 구별된다.

## Task 2: 현재 표시·목록 계약 반영

- [x] `feed-components.test.tsx`의 시스템 배지 모서리 단언은 2026-11-10 최신 사양의 `6px`로 변경한다. 높이 20px·라벨 크기·padding·색상 의미·variant·읽기 전용 단언은 유지한다.

```tsx
expect(badge).toHaveStyle({ borderRadius: '6px', height: '20px' });
```

- [x] 공지 일반 목록 fixture는 비고정 항목, 고정 목록 fixture는 고정 항목을 반환하도록 분리한다. 같은 제목이 요약·목록에 존재하는 경우 실제 카드/패널 범위를 지정해 의도한 항목의 수정·삭제·선택을 검증한다.
- [x] 최초 실패 후 retry 중에는 기존 오류 안내를 유지하고 재시도 버튼이 비활성화되는 현재 계약을 검증한다. 최초 로딩 성공 전 skeleton 계약과 혼합하지 않는다.
- [x] 댓글 fixture는 명시적 편집 가능 여부와 현재 API 응답의 ID·부모 관계를 준비한다. 실제 작성·답글·삭제·이전 댓글 로드·실패 후 보존 단언을 유지한다.
- [x] 순수 요약 테스트의 현재 목록 계약을 기존 테스트와 대조했다. 현행 계약과 일치하여 파일 변경은 필요하지 않았다.

## Task 3: 검증과 결과

- [x] 네 파일을 threads 풀·최대 워커 2로 실행한다. 기존 실패가 사라지고 다른 성공도 유지되어야 한다.
- [x] 공유 설치 결과와 새 잠금 설치 결과를 구별하고 최종 변경 파일을 새 검증용 worktree에 복사해 동일 명령을 실행한다.
- [ ] 새 검증용 worktree에서 타입 검사를 실행한다.
- [x] 변경한 상호작용 훅과 회귀 테스트에 잠금 설치 oxlint를 실행한다.
- [x] 실제 `CommunityNoticePage`에서 합성 API로 경합을 검증하고 375/768/1280px 스크린샷과 가로 넘침 결과를 기록한다.
- [x] 결과를 `docs/result/20261118/repository-remediation`에 기록한다. 남은 다른 업무 실패와 전체 통과를 혼동하지 않는다.

## Task 4: 댓글 변경 중 오래된 상세 응답 보호

- [x] 댓글 삭제·첨부 삭제 후 상세 응답이 역순 도착하는 경로를 deferred mock으로 재현한다. 로컬 변경 직후 UI가 갱신되지만 이전 응답 resolve 후 상태가 되돌아오는 것을 확인했다.
- [x] `useNoticeInteractions`에서 조회 시작 이후 변경된 댓글 트리와 댓글 수를 응답 병합이 덮어쓰지 않도록 최소 수정한다. API·DB 계약은 변경하지 않는다.
- [x] 두 회귀 테스트를 먼저 통과시킨 뒤 공지·피드 네 테스트 파일을 잠금 설치에서 재검증한다.
