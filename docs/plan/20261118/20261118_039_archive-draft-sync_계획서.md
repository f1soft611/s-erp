# 자료실 파일 편집 초안 동기화 Implementation Plan

> **실행:** executing-plans 방식으로 이 세션에서 순차 진행한다.

**Goal:** 파일 객체 변경의 첫 commit부터 현재 파일명/폴더를 반영하고 이전 오류를 제거한다.

**Architecture:** 편집 state는 유지하며 초기 이름/폴더를 file로 초기화한다. 이전 file 참조를 state로 기록하고 변경된 render에서 기존 세 setter를 실행한다. null도 예외 없이 같은 식을 적용한다.

**Tech Stack:** React, TypeScript, Vitest/Testing Library, oxlint, Orca.

## 변경 파일

- 운영: `frontend\src\pages\groupware\community\archive\components\ArchiveFileEditDialog.tsx`.
- 회귀: 기존 `frontend\tests\archive-page.test.tsx`.
- 문서/이미지: 039 날짜별 문서와 `screenshots/archive-draft-sync`.

## 실행

- [x] Profiler로 동일 필드 새 참조/다른 파일/null 폴더 교체의 첫 commit 3개와 null을 거친 재개방 보존 회귀 1개를 추가했다. 동일 file의 categories/saving 변경에서는 입력·오류가 보존된다.
- [x] 테스트만 검증 workspace에 복사하고 `vitest run tests/archive-page.test.tsx --pool=threads --maxWorkers=2`에서 기존 22개 + 신규 재개방 1개 통과, 신규 first-commit 3개만 의도한 RED를 확인했다. 루트의 표시 문자열이 아닌 실제 Select 빈 값을 관찰하도록 초기 테스트 observer를 바로잡았다.
- [x] 기존 복사 effect를 다음 guard로 대체하고 이름/폴더 초기 state도 같은 null-fallback 식으로 맞췄다.

```tsx
const [fileName, setFileName] = useState(file?.fileName ?? '');
const [folderCode, setFolderCode] = useState(file?.categoryCode ?? '');
const [previousFile, setPreviousFile] = useState(file);

if (previousFile !== file) {
  setPreviousFile(file);
  setFileName(file?.fileName ?? '');
  setFolderCode(file?.categoryCode ?? '');
  setError('');
}
```

- [x] 자료실 페이지/서비스/공통 모달 4파일/49개와 `tsc -b`, `vite build`가 통과했다. lint 108→107이며 다른 진단은 동일하다.
- [x] AST로 공개 props/JSX/handleSave/기존 테스트 22개/초기화 문장을 비교했다. root/소유 검증 workspace의 frontend 890파일 byte가 같다.
- [x] 실제 3폭, native 검증/held-save 비활성화·헤더 닫기/Escape 차단/metadata/실패 후 보존/동일 필드 새 참조/대상 B/성공 저장/재개방/취소를 확인했다.
- [x] 결과·PNG 7개·JSON 2개를 기록하고 이전 038 정확한 SHA CI 226파일/2,663개와 구분했다. 소유 탭을 닫았고 공유 서버는 변경하지 않았다.

위 결과를 이 단위만 별도 커밋·비강제 푸시로 동기화한다.

순수 prop 파생/key remount/layout effect/microtask/lint disable은 사용하지 않는다. 공유 4173 서버는 재사용하며 종료하지 않는다.
