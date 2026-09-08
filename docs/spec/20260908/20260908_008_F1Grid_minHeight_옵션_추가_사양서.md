# 상세 사양서

## 제목

F1-Grid 부모 높이 연동 및 내부 스크롤 보장

## 관련 문서

- 작업지시서: [20260908*008_F1Grid_minHeight*옵션*추가*작업지시서.md](../../directions/20260908/20260908_008_F1Grid_minHeight_옵션_추가_작업지시서.md)
- 계획서: [20260908*008_F1Grid_minHeight*옵션*추가*계획서.md](../../plan/20260908/20260908_008_F1Grid_minHeight_옵션_추가_계획서.md)

## 1. Props 계약

`frontend/src/shared/components/f1-grid/types/grid.types.ts`의 `F1GridProps<T>`에 다음 선택적 필드를 추가한다.

```typescript
minHeight?: number | string;
```

- 숫자: `${value}px`로 변환한다.
- 문자열: `100%`, `12rem`, `180px`, `fit-content` 등 CSS 길이 값으로 그대로 사용한다.
- `0`: 유효한 숫자 값이며 `0px`로 변환한다.
- `undefined`: 기존 동작과 동일하게 최상위 grid 컨테이너의 `minHeight`는 `0`이다.

`F1TreeProps<T>`는 `F1GridProps<T>`를 `Omit`으로 확장하는 현재 구조를 유지하므로 `minHeight`를 자동으로 노출한다.

## 2. 컴포넌트 및 레이아웃 동작

대상 컴포넌트: `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`

1. Props 구조분해 시 `minHeight`를 받는다.
2. 기존 `resolvedHeight`, `resolvedMaxHeight`와 동일한 규칙으로 `resolvedMinHeight`를 계산한다.
3. 최상위 `Box`(`role="grid"`)의 `sx.minHeight`에 `resolvedMinHeight`를 적용한다.
4. `height`는 실제 높이, `maxHeight`는 최대 높이, `minHeight`는 최소 높이로 각각 독립 적용한다.
5. body 영역의 `flex: 1`, `minHeight: 0`, overflow 및 로딩 스켈레톤 계산은 유지한다.

### 2.1 부모 높이 연동 및 스크롤 규칙

- `height="100%"`는 F1-Grid 호출부의 부모가 계산 가능한 높이를 가진 경우에만 유효하다.
- F1-Grid를 감싸는 flex 자식과 필요한 상위 flex 컨테이너에는 `flex: 1`과 `minHeight: 0`을 적용한다.
- 브라우저 높이가 줄어들면 부모의 실제 높이가 줄고 F1-Grid 루트도 함께 줄어야 한다.
- 표시 행 높이의 합이 본문 높이를 초과하면 루트가 확장되지 않고 본문 영역의 `overflowY: auto`로 스크롤한다.
- 화면 전용 최소 높이가 필요하지 않은 경우 `minHeight={0}` 또는 생략을 사용하며, 작은 뷰포트에서 고정 `minHeight`로 부모를 초과시키지 않는다.

예상 스타일 값:

| 입력      | 최상위 grid `min-height` |
| --------- | ------------------------ |
| 생략      | `0`                      |
| `240`     | `240px`                  |
| `'18rem'` | `18rem`                  |
| `0`       | `0px`                    |

## 3. 문서 사양

`frontend/src/pages/f1-grid-docs/F1-GRID.md`의 실제 API 설명 영역에 다음을 반영한다.

- `minHeight?: number | string`
- 숫자는 px, 문자열은 CSS 값으로 해석됨
- 기본값은 기존 `0`
- `height`/`maxHeight`와 함께 사용할 수 있음
- 행 높이 제어용 `minRowHeight`와는 다른 컨테이너 옵션임

## 4. API·권한·예외

- HTTP API, 요청/응답 필드, 상태 코드는 변경하지 않는다.
- 인증·권한 정책은 변경하지 않는다.
- 음수 값의 별도 검증이나 자동 보정은 추가하지 않고 CSS/브라우저의 기존 처리에 맡긴다.
- 옵션 미지정 시 기존 화면과의 호환성을 우선한다.

## 5. 테스트 사양

1. `F1Grid`에 `minHeight={240}`을 전달하면 `role="grid"` 요소의 스타일 값이 `240px`로 확인된다.
2. `F1Grid`에 `minHeight="18rem"`을 전달하면 문자열 값이 유지된다.
3. `minHeight`를 생략하면 기존 `minHeight: 0`이 확인된다.
4. `F1Tree`에 동일 Props를 전달할 수 있도록 TypeScript 타입이 통과한다.
5. 기존 F1-Grid 동작 테스트에 회귀가 없다.
6. 부모 높이를 축소했을 때 F1-Grid 루트 높이가 함께 줄고 페이지 전체 세로 스크롤이 아닌 그리드 본문 세로 스크롤이 발생한다.

## 6. 반응형 검증

- 375px: 최소 높이 적용 후 페이지 전체 가로 스크롤이나 헤더·본문 겹침이 없는지 확인한다.
- 768px: 그리드가 부모 너비를 벗어나지 않고 필요한 경우 내부 가로 스크롤만 사용하는지 확인한다.
- 1280px: `height`/`minHeight` 조합에서 헤더, 본문, 로딩 스켈레톤이 정상 배치되는지 확인한다.
- 브라우저 높이 축소: 부모 flex 영역, F1-Grid 루트, 본문 스크롤 영역의 높이를 비교해 부모 높이 연동을 확인한다.

## 7. DB 영향

없음. 프론트엔드 Props 및 레이아웃 스타일만 변경한다.
