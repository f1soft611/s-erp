# Document detail readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 문서 상세 wrapper 제목과 실제 비동기 상세 메뉴의 준비 조건을 구분한다.

**Architecture:** 실제 DocumentApprovalDetailFeed와 서비스 경로는 유지한다. wrapper heading만 기다린 참조 추가 세 사례에서 실제 more button과 menuitem을 각각 findByRole로 기다린다. 기존 실제 성공·실패·중복 처리 단언과 시간 제한을 유지한다.

**Tech Stack:** React, Testing Library, Vitest, GitHub Actions.

---

### Task 1: RED와 canonical 구조 확인

- [x] 03ff2be3의 run 44252242430은 2,640/2,641 통과, 참조 추가 상세 메뉴 한 사례만 실패했다. 공지·router는 통과했고 lint/typecheck/build도 성공했다.
- [x] DocumentApprovalDetailFeed.tsx:2219-2231의 PostDetailPanel 제목은 상세 데이터와 별개다. 실제 toolbar는 1262행의 status/kind 조건 및 1367행의 detail guard 이후 표시된다.
- [x] 같은 wrapper heading만 준비 조건으로 사용한 참조 추가 성공·실패·중복 세 사례를 함께 정정한다. 실제 card 준비를 기다리는 다른 상세 사례는 변경하지 않는다.

### Task 2: 실제 메뉴 준비 대기

**Files:** `frontend/tests/document-write-page.test.tsx`.

- [x] 아래 두 입력 전제조건만 세 곳에 반영했다. heading 대기와 모든 후속 단언·API fixture는 유지한다.

```tsx
fireEvent.click(await screen.findByRole('button', { name: '문서 더보기' }));
fireEvent.click(await screen.findByRole('menuitem', { name: '참조자 추가하기' }));
```

### Task 3: 검증과 동기화

- [x] 해당 참조 추가 세 사례를 원래 제한 시간으로 검증해 3/3 통과했다. 다른 153개는 이름 선택으로 미실행이며 전체 통과로 표현하지 않는다. lint exit 0이다.
- [ ] lint·공백·기존 case/expect 개수 보존을 확인한다.
- [ ] 작업별 커밋·non-force push하고 정확한 새 코드의 원격 전체 CI를 확인한다.
- [ ] 결과 021과 최종 동기화 기록에 실제 전체 상태·잔여 제약을 기록한다.
