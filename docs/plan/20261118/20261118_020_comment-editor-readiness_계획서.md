# Comment editor readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실제 지연 생성되는 댓글 editor의 입력 전제조건을 해당 테스트 파일 전체에서 일관되게 기다린다.

**Architecture:** 운영 TiptapCommentThread는 useEditor의 immediatelyRender:false를 사용한다. 일반 댓글 표시가 editor 준비를 보장하지 않으므로 입력 직전의 동기 textbox 조회 여섯 곳을 기존 findByRole 패턴으로 맞춘다. 제품이나 전역 setup을 바꾸지 않는다.

**Tech Stack:** Tiptap, Testing Library, Vitest, GitHub Actions.

---

### Task 1: 공통 원인 확인

- [x] 25c264c7의 원격 run 44250745339는 2,640/2,641 통과·공지 로컬 댓글 갱신 한 사례 실패다. router 8개와 문서작성은 통과했다.
- [x] 실패는 기존 댓글을 찾은 직후 입력 textbox를 동기 조회한 것이다. TiptapCommentThread.tsx:190-210의 지연 editor 생성과 별개인 전제조건임을 확인했다.
- [x] 결과 018에서 실패 초안 한 곳만 바꿨던 동일 계약이 다른 입력 사례에도 남아 있었다. 새로운 실패마다 한 곳씩 반복 수정하지 않고 같은 파일의 여섯 입력 전제조건을 함께 맞춘다.

### Task 2: 최소 수정

**Files:** `frontend/tests/notice-page-local-updates.test.tsx`.

- [x] 일반 댓글을 입력하는 모든 남은 동기 조회를 다음으로 맞췄다. 이미 비동기인 사례와 기존 부재/오류/호출 횟수 단언은 그대로 뒀다.

```tsx
const input = await screen.findByRole('textbox', { name: '댓글 입력' });
```

- [x] cursor harness의 같은 입력 변수 composer도 동일하게 기다린다. 실제 editor·이벤트·저장·업로드·pagination 경로와 제한 시간은 유지한다.

### Task 3: 검증과 동기화

- [x] 공지 39개와 summary·수주현황·router를 합친 네 파일 71개 전체를 UTC/2 workers에서 실행해 71/71 통과했다. lint exit 0이다.
- [ ] lint·공백·기존 case/expect 개수 보존을 확인한다.
- [ ] 작업별 커밋·non-force push하고 정확한 새 코드의 원격 전체를 확인한다.
- [ ] 결과 020에 실제 전체 상태와 기존 잔여 위험을 기록하고 최종 문서까지 동기화한다.
