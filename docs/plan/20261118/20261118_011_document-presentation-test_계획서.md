# Document presentation test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 문서 참여자 표시 검증을 실제 표시 컴포넌트에 배치해 중복 통합 준비 비용을 제거한다.

**Architecture:** DocumentApprovalFields 운영 컴포넌트와 모든 기존 표시 단언을 유지한다. 해당 표시 전용 케이스만 기존 fields-theme 테스트로 이동하고, 문서작성의 사용자 선택·추가·삭제·후보 제외 통합 케이스는 그대로 둔다.

**Tech Stack:** React, TypeScript, Vitest, Testing Library.

---

## 근거

- [작업지시서](../../directions/20261118/20261118_001_repository-remediation_작업지시서.md)
- 기존 전체/파일 실행에서 같은 표시 테스트가 5,998ms/5,591ms로 기본 5,000ms 제한을 넘었다.
- 소유 worktree의 임시 계측: 준비 1,984ms, 결재 추가 완료 3,055ms, 합의 추가 완료 3,971ms, 표시 단언 완료 4,043ms. 표시 단언 자체는 72ms다. 계측은 제거한다.
- 전역/개별 timeout 상향과 재시도는 사용하지 않는다. 사용자 선택 흐름을 생략한 표시 검증이 통합 검증을 대체한다고 표현하지 않는다.

### Task 1: 동일 표시 단언의 컴포넌트 이동

**Files:**
- Modify: `frontend/tests/document-write-page.test.tsx:5549-5653`
- Modify: `frontend/tests/document-approval-fields-theme.test.tsx`
- Production: 변경 없음.

- [x] 기존 `renders compact accessible badges, seals, removal actions, and ellipsized names` 케이스의 `const approvals = ...` 이후 단언을 기존 fields-theme 파일로 그대로 이동한다.
- [x] 원래 API mock·DashboardContent 렌더·선택기 조작만 다음 실제 컴포넌트 fixture로 대체한다. 준비 비용 측정용 코드는 복사하지 않는다.

```tsx
const approvalName = '홍길동김';
const agreementName = '김민수';
const longName = '홍길동김철수';
const users = [
  { value: 'emp-long-1', label: approvalName },
  { value: 'emp-long-3', label: longName },
  { value: 'emp-long-2', label: agreementName },
];
render(
  <DocumentApprovalFields
    userOptions={users}
    selectedApprovalUserIds={[]}
    referenceUserIds={[]}
    approvalStages={[
      { id: 1, kind: 'approval', users: [users[0]], isFixed: true },
      { id: 2, kind: 'approval', users: [users[1]] },
      { id: 3, kind: 'agreement', users: [users[2]] },
    ]}
    onApprovalUserChange={vi.fn()}
    onReferenceUserChange={vi.fn()}
    onAddApproval={vi.fn()}
    onAddAgreement={vi.fn()}
    onOpenApprovalSettings={vi.fn()}
    onRemoveApprovalUser={vi.fn()}
  />,
);
```

- [x] fields-theme의 Testing Library import에 `within`을 추가한다. 기존 렌더 helper에도 필수 `onOpenApprovalSettings={vi.fn()}`를 전달한다.
- [x] 이동한 단언을 대조한다: 원형 순번 badge/aria, 결재 도장 존재·합의 도장 부재, 고정 결재 삭제 부재·합의 삭제 존재, 짧은/긴 이름의 말줄임·title·aria, 결재 minWidth 88px·합의 maxWidth 4em. 단언을 줄이지 않는다.
- [x] 원래 케이스의 무효한 `mockResolvedValue` 두 번째 인수 `15000`은 해당 API 준비 코드 제거와 함께 사라진다. 이를 timeout으로 옮기지 않는다.

### Task 2: 집중 전체 파일 검증

**Files:**
- Create: `docs/spec/20261118/20261118_011_document-presentation-test_상세사양서.md`
- Create: `docs/result/20261118/repository-remediation/20261118_011_document-presentation-test_결과.md`

- [x] root의 두 테스트를 소유 exact-lock worktree에 복사해 임시 계측도 제거한다.
- [x] 아래 명령으로 두 파일을 제외 없이 검증한다. 결과: 문서작성 156개와 fields-theme 4개, 총 160개 통과.

```powershell
node .\node_modules\vitest\vitest.mjs run tests\document-write-page.test.tsx tests\document-approval-fields-theme.test.tsx --pool=threads --maxWorkers=1 --reporter=default --no-color
```

- [x] 이동한 케이스 시간과 전체 결과를 기록한다. source diff로 운영 무변경과 기존 사용자 선택 통합 케이스 유지를 확인한다.
- [x] 테스트/문서 전용이므로 신규 스크린샷은 해당 없음으로 기록한다. 커밋·푸시하지 않는다.

### Task 3: 파일 실행에서 확인한 첨부 통합 테스트의 조회 비용

- 표시 테스트는 484ms로 통과했으나 두 첨부 케이스가 전체 파일에서 5초를 넘었다. 같은 두 케이스의 선택 실행은 2,856ms/2,159ms로 통과해 기능 단언 실패와 구별했다.
- 준비 helper 계측에서 전체 문서 textbox role 조회/대기는 458ms/263ms, 동일 라벨 조회는 71ms/74ms였다.
- [x] helper의 대기 단언은 `expect(screen.getByLabelText('기안자')).toHaveValue('기안자')`로 바꾼다. 준비 완료 조건은 동일하다.
- [x] `keeps attachment deletion failures in the composer error area`, `shows a success toast when an ambiguous attachment is confirmed` 두 케이스는 준비 후 `const dialog = screen.getByRole('dialog', { name: '문서 작성' }); const composer = within(dialog);`로 조회 범위를 제한한다. 제목·첨부 입력·저장·상태 확인·삭제·alert는 `composer`로 조회하고 기존 API 호출 및 오류/성공 단언은 그대로 둔다.
- [x] 전체 두 파일 160개를 다시 검증한다. 임시 계측은 제거하고 시간 제한은 변경하지 않는다.
