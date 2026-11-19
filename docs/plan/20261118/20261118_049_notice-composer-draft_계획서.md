# 공지 작성 초안 초기화 Implementation Plan

> **실행:** executing-plans 방식으로 이 세션에서 순차 진행한다.

**Goal:** 작성 중 초안과 기존 초기화 시점을 보존하면서 순수 필드 effect 경고를 제거한다.

**Architecture:** open/debug를 직전 동기화 상태로 보관하고 값이 달라질 때 그 상태를 갱신한다. 열려 있을 때만 기존 필드 setter 본문을 실행한다. 최초 값은 이미 각 useState initializer와 같으므로 첫 render의 추가 초기화는 필요 없다. editor/DOM side effect는 기존 세 effect에 남긴다.

**Tech Stack:** React, TypeScript, MUI/CommonDialog, Tiptap, Vitest/Testing Library, oxlint, Orca.

## 대상과 순서

- 운영: `frontend\src\pages\groupware\community\notice\components\NoticeComposerDialog.tsx`.
- 회귀: `frontend\tests\notice-composer-dialog-theme.test.tsx`에 기본값 변경 중 초안 보존/재열기 및 debug 전환 회귀를 추가한다. 아래 사양의 실제 입력/삭제/닫기·열기 흐름을 사용한다.
- 함께 실행: `notice-composer-payload.test.ts`, `notice-page.test.tsx`, `notice-login-popup.test.tsx`.
- [x] 추가한 기존 동작 회귀를 포함해 UTC/threads/worker 2로 기준선을 실행한다. target 경고 0개 assertion은 기존 state/dependency 진단으로 실패해야 한다.
- [x] 기존 순수 필드 effect만 다음 블록으로 교체한다. setter 인자/순서와 다른 코드가 같음을 비교한다.

```tsx
const [resetSource, setResetSource] = useState({ open, pasteDebugEnabled });

if (resetSource.open !== open || resetSource.pasteDebugEnabled !== pasteDebugEnabled) {
  setResetSource({ open, pasteDebugEnabled });
  if (open) {
    setTitle(defaultTitle);
    setNoticeGubunCode(defaultNoticeGubunCode);
    setNoticeGubunError(false);
    setLoginPopup(defaultLoginPopupYn === 'Y');
    setPopupEndDate(defaultPopupEndDate ?? '');
    setPopupDateError(false);
    setAttachments(defaultAttachments);
    setImageUploadError(null);
    setPasteDebugLog(
      pasteDebugEnabled ? ['[notice-paste] 진단 모드가 활성화되었습니다.'] : [],
    );
  }
}
```

- [x] 동일 회귀/전체 lint/typecheck/build를 확인한다. 대상 진단만 제거하고 새 진단은 없어야 한다.

```powershell
$env:TZ = 'UTC'
.\node_modules\.bin\vitest.cmd run tests/notice-composer-dialog-theme.test.tsx tests/notice-composer-payload.test.ts tests/notice-page.test.tsx tests/notice-login-popup.test.tsx --pool=threads --maxWorkers=2
.\node_modules\.bin\oxlint.cmd --format=json
.\node_modules\.bin\tsc.cmd -b
.\node_modules\.bin\vite.cmd build
```

- [x] AST/전체 소스로 필드 초기값·setter 본문, 다른 세 effect/editor/ref/JSX/CSS/저장·닫기 흐름이 그대로임을 확인하고 검증 workspace와 byte parity를 확인한다.
- [x] 실제 작성창을 메모리 Storage/닫힌 transport로 세 폭에서 연다. 제목/본문 입력, 테마/기본값 변경 시 초안 보존, 정상 취소/닫힘과 최신 기본값 재열기·첨부/팝업 필드를 확인한다.
- [x] 결과/스크린샷·이전 정확한 CI를 보관하고 allowlist·별도 커밋·비강제 푸시 인수를 검토한다.

실제 기준선/수정 후는 각각 4파일·83개 통과, lint 94→92/새 진단 0, typecheck/build exit 0이다. 선행 048의 정확한 SHA 전체 CI 226파일·2,678개/네 job success를 별도 확인했다. 이번 커밋·push·정확한 SHA CI는 이후 진행표로 확인한다.
