# 즐겨찾기 편집 초안 동기화 Implementation Plan

> **실행:** executing-plans 방식으로 이 세션에서 순차 진행한다.

**Goal:** 편집 초안을 보존하면서 최초 열기/기존 입력 key 변경/재개방의 첫 commit부터 현재 표시명·폴더를 반영한다.

**Architecture:** 사용자 입력 state를 유지한다. 초기 state는 open일 때 기존 초기화 식을 사용하고, 이후 다섯 primitive 입력을 이전 state와 `Object.is`로 비교하여 조건부 own-state 조정한다. favorite 객체 전체나 폴더 목록을 초기화 key로 넓히지 않는다.

**Tech Stack:** React, TypeScript, Vitest/Testing Library, oxlint, Orca.

## 변경 파일과 선택

- 운영: `frontend\src\pages\dashboard\components\MenuFavoriteEditDialog.tsx`.
- 회귀: 기존 `frontend\tests\menu-favorites.test.tsx`.
- 문서/이미지: 작업 038의 날짜별 문서와 `screenshots/favorite-draft-sync`.
- prop-only 파생은 편집값을 잃으므로 제외한다. key remount, layout effect로 이동, microtask, lint disable도 제외한다.

## 실행 순서

- [x] Profiler로 열린 대상 key 4개의 첫 commit 및 오류 정리, 첫 열린 mount/닫힌 대상 변경 후 재개방의 첫 관찰 가능한 dialog commit을 회귀 6개로 추가했다. 동일 primitive의 새 favorite 객체/목록/URL/menuId 변경에서는 입력·오류 보존도 확인했다.
- [x] 테스트만 검증 workspace에 복사하고 `vitest run tests/menu-favorites.test.tsx --pool=threads --maxWorkers=2`에서 열린 대상 key 4개만 의도한 stale-commit RED를 확인했다(기존 13개와 신규 mount/reopen 2개 통과).
- [x] 초기 state를 아래처럼 맞추고 기존 effect의 setter 세 개만 조건부 render로 옮겼다.

```tsx
const [name, setName] = useState(
  open ? favorite?.favoriteName?.trim() || menuName : menuName,
);
const [folderValue, setFolderValue] = useState(
  open && favorite?.folderId != null ? String(favorite.folderId) : 'root',
);
const inputs = [
  favorite?.favoriteId, favorite?.favoriteName, favorite?.folderId,
  menuName, open,
] as const;
const [previousInputs, setPreviousInputs] = useState(inputs);

if (inputs.some((value, index) => !Object.is(value, previousInputs[index]))) {
  setPreviousInputs(inputs);
  if (open) {
    setName(favorite?.favoriteName?.trim() || menuName);
    setFolderValue(favorite?.folderId == null ? 'root' : String(favorite.folderId));
    setError('');
  }
}
```

- [x] 관련 즐겨찾기/대시보드/공통 모달 4파일/54개와 `tsc -b`, `vite build`가 통과했다. lint 109→108, 다른 진단은 동일하다.
- [x] AST로 공개 props/JSX/모든 이벤트/submitting/기존 테스트 13개/다섯 key/Object.is/초기화 문장 보존을 확인했다. root/검증 workspace 890파일 byte가 같다.
- [x] 실제 컴포넌트 3폭, native 검증/폴더 선택/실패 후 보존/metadata 갱신/대상 교체/저장/제거/더보기/닫기/Escape/재개방을 합성 값·콜백으로 확인했다. 소유 탭을 닫았고 공유 4173 서버는 종료하지 않았다.
- [x] 결과·실제 PNG 6개·JSON 2개와 이전 037 정확한 SHA CI 226파일/2,657개를 구분해 기록했다.

위 결과를 이 단위만 별도 커밋·비강제 푸시로 동기화한다.
