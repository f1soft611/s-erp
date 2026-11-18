# F1-Grid 서버 조회 의존성 Implementation Plan

> **실행:** executing-plans 방식으로 이 세션에서 순차 진행한다.

**Goal:** 서버 조회 effect가 사용하는 callback을 안정적으로 의존하도록 하되 조회 동작은 보존한다.

**Architecture:** 함수의 비안정 캡처는 기존 effect의 네 dependency와 같다. 동일한 네 값으로 useCallback을 만들고 기존 effect에 callback만 추가한다. controller/ref 접근과 상태 갱신은 기존 event/effect/async completion에 그대로 둔다.

**Tech Stack:** React, TypeScript, oxlint, Vitest/Testing Library, Orca.

## 대상

- 수정: `frontend\src\shared\components\f1-grid\core\F1Grid.tsx`.
- 문서: [F1-GRID](../../../frontend/src/pages/f1-grid-docs/F1-GRID.md)의 서버 조회 설명. 저장소 실제 문서는 `frontend\src\pages\f1-grid-docs\F1-GRID.md`이다.
- 회귀: `f1-grid.test.tsx`, `f1-grid-server-data-source.test.tsx`, `f1-grid-server-data-source.test.ts`.

## 순서

- [x] UTC/threads/worker 2로 세 파일 기준선을 실행하고 target exhaustive-deps 0개 assertion이 기존 loadDataSourcePage 누락 1개로 실패하는지 보관한다.
- [x] 기존 함수 선언/종료만 아래와 같이 바꾸고 본문은 그대로 유지한다.

```tsx
const loadDataSourcePage = useCallback(async (offset: number, append: boolean) => {
  if (!dataSource || dataSourceLoadingRef.current) return;

  const requestId = ++dataSourceRequestRef.current;
  dataSourceLoadingRef.current = true;
  setDataSourceLoading(true);
  try {
    const result = await dataSourceControllerRef.current.load(dataSource, {
      offset,
      limit: Math.max(1, dataSource.pageSize ?? 200),
      sorts: sortState,
      filters: filterState,
    });
    if (!result || requestId !== dataSourceRequestRef.current) return;
    setServerRows((current) =>
      append ? [...current, ...result.rows] : result.rows,
    );
    setServerTotalRowCount(result.totalRowCount);
  } catch (error: unknown) {
    if (requestId === dataSourceRequestRef.current) {
      onDataSourceError?.(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  } finally {
    if (requestId === dataSourceRequestRef.current) {
      dataSourceLoadingRef.current = false;
      setDataSourceLoading(false);
    }
  }
}, [dataSource, filterState, onDataSourceError, sortState]);
```

- [x] 기존 effect 본문은 아래와 같이 그대로 유지하고 dependency만 추가한다.

```tsx
useEffect(() => {
  if (!dataSource) return;
  dataSourceRequestRef.current += 1;
  dataSourceLoadingRef.current = false;
  setServerRows([]);
  void loadDataSourcePage(0, false);
}, [dataSource, filterState, loadDataSourcePage, onDataSourceError, sortState]);
```

- [x] 동일 회귀/전체 lint/tsc/build를 확인한다. 대상 deps 1개만 제거하고 새 진단은 없어야 한다.

```powershell
$env:TZ = 'UTC'
.\node_modules\.bin\vitest.cmd run tests/f1-grid.test.tsx tests/f1-grid-server-data-source.test.tsx tests/f1-grid-server-data-source.test.ts --pool=threads --maxWorkers=2
.\node_modules\.bin\oxlint.cmd --format=json
.\node_modules\.bin\tsc.cmd -b
.\node_modules\.bin\vite.cmd build
```

- [x] AST/전체 소스 비교로 본문·기존 dependencies·나머지 기능을 보존하고 frontend 890파일 byte parity를 확인한다.
- [x] 합성 dataSource와 메모리 Storage만 사용하는 실제 F1Grid를 세 폭에서 확인한다. 초기 요청, 무관한 테마 재렌더, native 정렬/필터와 다음 페이지, 취소/오래된 응답, 오류 전달을 관찰한다.
- [x] F1-GRID 설명/결과/PNG·JSON과 이전 정확한 CI를 보관하고 allowlist·별도 커밋·비강제 푸시를 검토한다.

실제 기준선/수정 후는 각각 3파일·204개 통과, lint 95→94/새 진단 0, typecheck/build exit 0이다. 커밋/푸시와 이번 정확한 SHA CI는 이후 진행표로 별도 확인한다.
