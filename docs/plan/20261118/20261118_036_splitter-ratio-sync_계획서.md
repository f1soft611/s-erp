# Splitter 비율 상태 동기화 Implementation Plan

> **실행:** executing-plans 방식으로 이 세션에서 순차 진행한다. 사용자 승인된 잔여 경고 정리 범위를 확장하지 않는다.

**Goal:** 드래그와 공개 레이아웃을 보존하면서 flex prop 복사 effect 1개를 제거한다.

**Architecture:** 이전 leftFlex/rightFlex를 하나의 state로 기록한다. Object.is로 입력 그룹 변경을 감지할 때만 기존 숫자 조건으로 두 local ratio를 조정한다. 같은 prop 재렌더와 미지정 ratio는 기존 드래그 값을 유지한다.

**Tech Stack:** React 19, TypeScript, Vitest/Testing Library, oxlint, Orca 실제 브라우저.

## 선택과 경계

prop-only 파생은 드래그를 잃으므로 제외한다. remount는 픽셀 크기와 자식을 초기화하므로 제외한다. state 소유를 유지하는 조건부 동기화를 사용한다. 이전 effect의 dependency 비교는 Object.is이므로 `!==`로 바꾸지 않는다. JSX·스타일·pointer/resize effect·콜백은 그대로 둔다.

변경 파일은 `frontend\src\shared\components\Splitter.tsx`, 기존 `frontend\tests\common-code-management-page.test.tsx`, 이 단위 문서·결과뿐이다. 초기 확인 대상은 공통코드와 flex 1:1을 사용하는 RoleManagementPanel이며 호출자는 수정하지 않는다.

## 실행

- [x] 기존 지시·사양, Splitter 전체, 기존 분리기 4개 테스트와 실제 flex 소비자를 확인했다.
- [x] 기존 테스트에 Profiler 숫자/부호 있는 0 첫 commit 2사례와 미지정 ratio/픽셀 복귀 보존 1사례를 추가했다. NaN 동일 입력도 반복하지 않는다.
- [x] 테스트 파일만 검증 workspace에 복사하고 `vitest run tests/common-code-management-page.test.tsx --pool=threads --maxWorkers=2`로 새 첫 commit 2개만 실패함을 확인했다(31 통과).
- [x] 아래 입력 key guard로 기존 effect만 대체했다. guard에는 ref 접근이 없다.

```tsx
const [previousFlex, setPreviousFlex] = useState({ leftFlex, rightFlex });

if (
  !Object.is(previousFlex.leftFlex, leftFlex) ||
  !Object.is(previousFlex.rightFlex, rightFlex)
) {
  setPreviousFlex({ leftFlex, rightFlex });
  if (typeof leftFlex === 'number') setLeftRatio(leftFlex);
  if (typeof rightFlex === 'number') setRightRatio(rightFlex);
}
```

- [x] 관련 공통코드·권한 알림·매입마감 3파일/99개 회귀와 `tsc -b`, `vite build`, `oxlint --format=json`을 확인했다. lint는 111→110이며 다른 signature는 같다.
- [x] AST로 JSX·props·초기값·드래그/리스너·스타일과 기존 테스트 보존을 확인하고 root/검증 frontend 890파일 byte 일치를 확인했다.
- [x] 실제 Splitter 합성 fixture의 375px stacked/768·1280px split, native 드래그→같은 prop 재렌더→외부 비율 reset→픽셀 모드와 수직 드래그도 확인했다.
- [x] 결과 문서·스크린샷 8개와 검증 JSON을 작성했다. 이전 035 CI 226파일/2,652개는 정확한 source SHA로 구분했다.

위 결과를 이 단위만 별도 커밋·비강제 푸시한다.
