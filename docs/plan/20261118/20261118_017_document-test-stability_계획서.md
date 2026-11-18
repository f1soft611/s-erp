# Document test stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 운영 화면·제한 시간·검증 단언을 바꾸지 않고 문서작성 회귀의 불필요한 준비·전역 조회 비용과 분리 DOM 대기를 바로잡는다.

**Architecture:** 실제 DocumentComposerDialog와 서비스 mock을 그대로 사용한다. 격리 worktree에서 실패 사례의 단계별 비용을 먼저 측정한다. 순수 composer 동작만 검증하는 케이스는 실제 leaf dialog 경계에서 렌더하고, Dashboard 통합·열기/닫기·refresh 검증은 기존 Dashboard 경계를 유지한다. 비동기 교체되는 feed 노드는 대기 callback 안에서 재조회한다.

**Tech Stack:** React, Testing Library, Vitest threads, npm exact-lock.

---

### Task 1: 계측과 근거 고정

**Files:** `frontend/tests/document-write-page.test.tsx`, 소유 세션 로그.

- [x] 기존 새 lock 전체 12 timeout, 단일 파일 진단과 구 lock 5 timeout을 RED 증거로 보존한다.
- [x] 소유 worktree에서 4번째 결재·불명확 첨부 케이스의 render/open/ready/action 비용을 일시 계측했다. 두 대표 사례에서 동일 원인이 확인되어 이미지 사례에 별도 계측을 추가하지 않았다.
- [x] 전역 조회를 포함한 host 열기/준비 비용과 실제 단언·API 대기를 구별했다. 계측은 제거하고 로그만 보관한다.

### Task 2: 최소 테스트 경계·조회 수정

**Files:** `frontend/tests/document-write-page.test.tsx`.

- [x] 계측이 불필요한 Dashboard 준비 비용을 확인하면, Dashboard 동작을 단언하지 않는 composer 전용 실패 케이스의 시작만 다음으로 대체한다. 서비스·editor·picker·첨부 처리는 mock으로 추가 치환하지 않는다.

```tsx
render(<DocumentComposerDialog open onClose={vi.fn()} />);
await waitForComposerReady();
```

- [x] host 경계를 줄인 뒤 추가 전역 조회 치환을 최소화해 닫기/재열기의 제목만 같은 공개 label로 조회했다. 옵션 조회는 기존 동작을 보존했다.

```tsx
const composer = within(screen.getByRole('dialog', { name: '문서 작성' }));
fireEvent.change(composer.getByLabelText('제목'), {
  target: { value: '초안 제목' },
});
```

- [x] 댓글 pagination 대기는 교체될 수 있는 firstCard를 캡처하지 않고 매 retry에 현재 feed에서 같은 텍스트를 확인한다.

```tsx
await waitFor(() =>
  expect(
    within(screen.getByTestId('document-feed')).getByText('이전 페이지 댓글'),
  ).toBeInTheDocument(),
);
```

- [x] 기존 ID·payload·권한·상태·UI 단언, 실제 Dashboard 열기/닫기·조회 integration 사례를 보존한다. skip·재시도·시간 제한 상향은 금지한다.

### Task 3: 검증·커밋·동기화

- [x] 먼저 이전 전체 실패 케이스와 detached DOM 사례를 선택 실행한다.
- [x] 이어 문서작성/승인필드 두 파일 전체를 1 worker에서 실행한다. 선택 통과를 전체로 바꾸어 표현하지 않는다.
- [ ] 통과 시 정확한 소스·lock을 고정해 CI 동일 2-worker 전체를 실행하고 JSON 원본을 보관한다.
- [ ] lint/typecheck·diff 공백·문서 상대 링크와 테스트 우회 설정 부재를 확인한다.
- [ ] 결과 017에 원인·경계·실패 잔존·최종 전체 모수를 기록한다. 테스트 전용 변경이므로 신규 화면 스크린샷은 생성하지 않는다.
- [ ] 사용자 승인 범위에서 해당 변경만 커밋·non-force push하고 tip 일치를 확인한다. 집중/두 파일 전체가 통과한 소스는 전체 실행 중임을 명시해 먼저 동기화하고 원격 CI에서도 확인한다. 최종 전체 결과 문서는 완료 뒤 별도 동기화한다.
