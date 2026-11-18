# Document test stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 운영 화면·제한 시간·검증 단언을 바꾸지 않고 문서작성 회귀의 불필요한 준비·전역 조회 비용과 분리 DOM 대기를 바로잡는다.

**Architecture:** 실제 DocumentComposerDialog와 서비스 mock을 그대로 사용한다. 격리 worktree에서 실패 사례의 단계별 비용을 먼저 측정한다. 순수 composer 동작은 실제 dialog 경계에서 검증하고, 초기화 사례는 동일 instance를 유지하는 최소 controlled host를 사용한다. Dashboard 고유 통합·refresh 사례는 기존 경계를 유지한다. 비동기 교체되는 feed 노드는 대기 callback 안에서 재조회한다.

**Tech Stack:** React, Testing Library, Vitest threads, npm exact-lock.

---

## 후속 계측에 따른 경계 정정

초기 보수적 계획은 닫기/재열기를 Dashboard에 남겼으나 로컬 전체와 관련 223개 실행에서 이 한 사례가 각각 10,850/11,157ms로 계속 실패했다. 단순 조회 축소만으로 해결됐다고 주장하지 않는다.

운영 소스를 재확인하면 실제 제목·결재·참조 초기화는 useDocumentComposer.closeComposer가 소유하고, DocumentWritePage의 onClose는 별도로 quiet refresh와 detail 갱신까지 실행한다. 따라서 **초기화만 단언하는 이 사례도 실제 dialog를 open state로 제어하는 얇은 React host**로 바꾼다. 버튼 클릭→onClose→실제 닫힘→동일 instance 재열기와 원래 값/참여자 단언은 그대로 유지한다. Dashboard 자체 통합은 다른 기존 사례를 유지하며 제품 코드·시간 제한은 바꾸지 않는다.

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

- [x] 닫기/재열기의 공개 label과 실제 연결된 picker listbox로 조회 범위를 좁힌다. 이 변경만으로 관련 전체 실행이 실패했으므로 최종 초기화 검증에는 위 책임 분석에 따른 controlled host도 사용한다.

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

- [x] 기존 ID·payload·권한·상태·UI 단언과 Dashboard 고유 integration 사례를 보존한다. 초기화 사례에서도 실제 닫기 callback과 open state 전환을 사용한다. skip·재시도·시간 제한 상향은 금지한다.
- [x] 관련 다섯 파일 223개 전체를 KST/2 workers에서 확인했다. 초기화 사례는 7,050ms로 기존 10초 이내이며 직접 it 127개·expect 982개도 유지한다.

### Task 3: 검증·커밋·동기화

- [x] 먼저 이전 전체 실패 케이스와 detached DOM 사례를 선택 실행한다.
- [x] 이어 문서작성/승인필드 두 파일 전체를 1 worker에서 실행한다. 선택 통과를 전체로 바꾸어 표현하지 않는다.
- [x] 정확한 소스·lock을 고정한 2-worker 원격 전체는 최종 8937faec/run 44253972552에서 2,641/2,641 통과했다. 원본 로그와 로컬 관련 JSON을 보관했고 중단한 전체 JSON을 만들어 대체하지 않았다.
- [x] lint/typecheck·diff 공백·문서 상대 링크와 테스트 우회 설정 부재를 확인했다.
- [x] 결과 017과 최신 결과 021에 원인·경계·실패 이력·최종 전체 모수를 기록했다. 테스트 전용 변경으로 신규 스크린샷은 생성하지 않았다.
- [x] 사용자 승인 범위의 작업별 코드 커밋을 non-force push했다. 집중/관련 파일과 실제 전체 결과를 구별하고 최종 전체 결과 문서는 완료 뒤 별도 동기화한다.
