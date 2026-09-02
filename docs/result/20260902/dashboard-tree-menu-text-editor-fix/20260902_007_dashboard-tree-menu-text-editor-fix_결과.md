# 대시보드 트리 반복 렌더링 및 메뉴 텍스트 에디터 높이 보정 결과

## 변경 내용

- `DashboardMenuTree`의 제어형 `expandedItems` state 및 `onExpandedItemsChange` 갱신을 제거했다.
- `SimpleTreeView`는 라우트에서 계산된 확장 목록을 `defaultExpandedItems`로 초기화하고, 확장 경로가 바뀔 때만 key를 변경해 다시 생성한다.
- `TextEditor`, `NumberEditor`(currency/decimal 포함), `AutocompleteEditor`에 `height: 100%`, `minHeight: 0`과 내부 input의 `height: 100%`, `boxSizing: border-box`, 상하 padding 0을 적용했다.
- `SelectEditor`의 root/select 표시 영역과 `CodePickerEditor` 버튼도 셀 콘텐츠 영역 높이를 넘지 않도록 `height: 100%`, `minHeight: 0` 제약을 적용했다.

## 실제 브라우저 검증

- `http://127.0.0.1:4173`에서 대시보드 메뉴 패널을 연 상태로 90초간 관찰했다.
- 결과: 트리가 계속 표시됐고 `Maximum update depth exceeded` 및 기타 `pageerror`는 0건이었다.
- 메뉴관리 `종합현황` 셀 편집 실측: 셀 높이 32px, `TextEditor` 루트 및 input 높이 23px, 상단 482.42px/하단 505.42px으로 셀 경계(477.42px~509.42px) 안에 위치했다.
- 결과: 에디터 및 input의 셀 외부 overflow는 모두 `false`였다. 셀 padding을 유지하면서 하단 border를 넘지 않는다.
- F1-Grid 테스트 페이지의 첫 번째 행 편집 실측: `code` 23px, `select` 18.69px, `number` 23px, `currency` 23px, `decimal` 23px 컨트롤이 모두 32px 셀 경계 안에 위치했고 셀 외부 overflow는 모두 `false`였다.

## 자동 검증

- `npm run test -- tests/f1-grid.test.tsx tests/dashboard-sidebar.test.tsx`: 2개 파일, 105개 테스트 통과.
- `npm run build`: TypeScript 및 Vite production build 통과.
