# CI contract stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실제 원격 CI에서 확인한 세 테스트 계약/준비 경합을 운영 코드 변경 없이 바로잡는다.

**Architecture:** 현재 브라우저 로컬 달력 기반 주간 계산에 맞는 Date fixture, 준비된 댓글 editor 대기, 별도 사용자 커밋 0e6c9bdf의 확정 컬럼 순서를 테스트에 반영한다. 전역 TZ·timeout·재시도·제품 동작은 바꾸지 않는다.

**Tech Stack:** Vitest, Testing Library, Node TZ, GitHub Actions.

---

### Task 1: RED와 요구 근거

- [x] 원격 code commit 61a70ef4의 run 44243224117은 226파일 중 3개 실패다. 문서작성 156개는 원격에서 통과했다.
- [x] notice-summary의 고정 +09:00 fixture가 UTC에서는 두 항목을 전주 일요일로 해석해 이번 주가 3→1로 바뀜을 현재 local getWeekStart 구현과 대조했다.
- [x] 댓글 실패 사례는 댓글 표시만 대기한 뒤 editor를 동기 조회해 원격에서 textbox 부재로 실패했다. editor 자체 준비를 기다리는 계약으로 좁힌다.
- [x] 수주현황의 기대 순서는 사용자 별도 커밋 0e6c9bdf가 진행상태를 행 다음으로 옮긴 변경을 아직 반영하지 않았다.

### Task 2: 최소 테스트 수정

**Files:**
- `frontend/tests/notice-summary.test.ts`
- `frontend/tests/notice-page-local-updates.test.tsx`
- `frontend/tests/sales-order-status-page.test.tsx`

- [x] UTC 환경에서 기존 summary와 수주현황 기대 실패 두 개를 재현했다.
- [x] notice-summary의 달력 시각 fixture를 `new Date(2026, 8, 21, 8).toISOString()`처럼 로컬 숫자 생성 후 문자열로 직렬화한다. 기존 정상 문자열 파싱도 계속 검증한다. 현재 시각은 `new Date(2026, 8, 21, 12)`로 맞추며 기대 통계·정렬은 유지한다.
- [x] 댓글 실패 사례의 input 준비를 `await screen.findByRole('textbox', { name: '댓글 입력' })`로 대기한다. 실패 메시지·호출·초안 보존 단언은 유지한다.
- [x] 수주현황 기대 배열의 진행상태만 기존 수주상태 앞에서 행 뒤로 옮긴다. 위치가 가로 가상화 초기 범위 밖이므로 실제 grid body를 scrollLeft 800으로 스크롤한 후 표시를 기다린다. 기존 컬럼·조회 조건·값 단언은 유지한다.

### Task 3: 검증과 동기화

- [x] 세 파일 전체를 UTC와 Asia/Seoul에서 검증했다. UTC 63/63, KST 관련 실행 내 63/63이다. 테스트 개수·단언 삭제·source skip·timeout 증가는 없다.
- [x] 문서작성의 별도 닫기/재열기 책임 경계 정정과 함께 관련 다섯 파일 223/223 전체를 검증했다.
- [x] 사용자 승인 범위에서 50f7b1d5와 d7e5e233을 각각 커밋·non-force push하고 원격 전체 run 44248961094를 확인했다.
- [x] 실패한 기존 CI/중단한 로컬 전체를 성공으로 바꾸지 않았다. 새 전체는 2,640/2,641 통과·별도 router 1개 실패이며 결과 019로 이어진다.
- [x] 결과 018에 플랫폼·모수·커밋·원격 run 결과와 기존 backend/advisory/PR 잔존을 명시했다.
