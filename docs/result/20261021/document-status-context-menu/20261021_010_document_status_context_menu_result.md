# 문서현황 우클릭 메뉴 수정 결과

## 요청 및 적용

- [작업지시서](../../../directions/20261021/20261021_010_document_status_context_menu_work_instruction.md)
- [계획서](../../../plan/20261021/20261021_010_document_status_context_menu_plan.md)
- [상세 사양서](../../../spec/20261021/20261021_010_document_status_context_menu_spec.md)

| 항목 | 결과 |
|---|---|
| 데이터 셀 우클릭 | 상세를 열지 않고 컨텍스트 메뉴 표시 |
| 엑셀 내보내기 | 메뉴 표시 및 기존 XLSX 생성 기능 연결 |
| 행 추가·위/아래 삽입·복사·삭제 | 사용자 승인에 따라 숨김 |
| 컬럼 길이 자동 조정·정렬 해제·설정 복원 | 기존 동작 유지 |
| 왼쪽 클릭·체크박스 상세 | 기존 동작 유지 |
| 다른 그리드/F1Tree | 기본 우클릭 행 선택 유지 |

## 재현 조건·원인·해결

문서현황의 `DocumentStatusGrid`는 `disableContextMenu`로 메뉴를 모두 차단하면서, `onSelectionChange`를 상세 열기와 연결하고 있었다. 공통 그리드는 오른쪽 버튼 `mousedown`과 `contextmenu` 양쪽에서 행 선택을 갱신하므로 우클릭도 상세를 열었다.

`F1GridProps.selectRowOnContextMenu`를 추가해 기본값 true를 유지하고 문서현황만 false로 지정했다. 두 우클릭 경로의 행 선택 변경을 모두 차단하며 셀 포커스와 메뉴 대상은 유지한다. 오른쪽 버튼은 좌클릭 드래그 선택을 시작하지 않는다. 문서현황 메뉴 차단을 해제하고 기존 항목별 옵션으로 행 변경 메뉴를 숨겼으며 `canExportExcel`을 활성화했다.

변경 코드는 문서현황 그리드, 공통 F1Grid 타입/이벤트 처리 및 관련 테스트에 한정했다. 상세 피드, 백엔드, API 계약, DB 스키마는 변경하지 않았다. DB 관련 작업이 아니므로 DB MCP 확인 및 SQL 스크립트 생성 대상이 아니다.

## 회귀 테스트

신규 테스트를 먼저 추가해 수정 전 실패를 확인했다.

- 문서현황: 오른쪽 버튼 `mousedown` 직후 상세 overlay가 생성되어 실패.
- 공통 그리드: `selectRowOnContextMenu={false}`인데 기존 선택이 다른 행으로 바뀌어 실패.
- 기본값 유지 테스트는 기존 구현에서도 통과했다.

수정 후 선택 실행:

```powershell
Set-Location frontend
node .\node_modules\vitest\vitest.mjs run tests\document-status-page.test.tsx tests\f1-grid-context-menu.test.tsx --testNamePattern "read-only context menu|context-menu row selection is disabled|keeps right-click row selection enabled|opens the existing approval detail|suppresses the F1|shows the excel export"
```

**7개 통과, 42개 선택 제외.** 신규 3개와 기존 상세/메뉴 비활성/엑셀 다운로드 테스트를 검증했다.

추가 검증:

| 검증 | 결과 |
|---|---|
| `document-status-service.test.ts` | 5개 통과 |
| `f1-grid-excel-export.test.ts` | 1개 통과; 숫자/날짜/시간/Boolean 및 잘못된 값 보존 검증 |
| TypeScript + Vite `npm run build` | 성공; 기존 대형 번들 경고 있음 |
| 변경 TypeScript 6개 파일 oxlint | 오류 0개; 변경하지 않은 코드의 기존 경고 13개 |
| `git diff --check` | 성공 |

### 기존 테스트 실패와 분리

사용자에게 수정 전 실패를 알리고, 기존 문제는 기록하되 이번 요청 범위만 수정하는 승인을 받았다.

- 최초 관련 2개 파일 실행: 46개 중 41개 통과, 5개 실패. 검색 metadata, 검색 복원 타이밍, 트리 정렬/필터, Excel 동적 import 시간 초과였다.
- 수정 후 같은 파일 전체 실행: 49개 중 46개 통과, 3개 실패. 검색 metadata(`updatedAt` 기대값), 트리 정렬 메뉴, 트리 필터 메뉴의 기존 실패가 남았다. 검색 복원과 Excel 시간 초과는 재실행에서 재현되지 않았다.
- 확대 F1Grid 회귀: 156개 중 110개 통과, 46개 실패.
- 수정 전 HEAD를 세션 임시 디렉터리에 추출해 확대 F1Grid 테스트를 실행한 결과도 **110개 통과, 46개 실패**였다. 실패 테스트 이름 집합을 비교해 차이가 없음을 확인했다. 잘못 인코딩된 한글 기대값, 기존 편집/레이아웃 테스트 등은 이번 범위에서 수정하지 않았다.
- jsdom Excel 다운로드 테스트에는 기존 `Not implemented: navigation to another Document` 메시지가 출력되지만 해당 테스트는 통과했다.
- 테스트 도구가 테스트 파일을 발견하지 못해 저장소의 기존 Vitest CLI로 검증했다. 전체 테스트가 모두 통과한 상태라고 주장하지 않는다.

## 실제 브라우저

기존 `127.0.0.1:4173` 서버를 재사용했다. 서버를 새로 시작하거나 종료하지 않았다. 목록을 합성 데이터 1건으로 가로채 실제 문서/계정 정보를 스크린샷에 저장하지 않았다.

공유 브라우저의 네이티브 클릭/다운로드 이벤트 대기에는 제한이 있어, 실제 브라우저 DOM에서 오른쪽 버튼 `mousedown → contextmenu → mouseup`을 발생시켜 검증했다. CDP 화면 크기 에뮬레이션으로 실제 `innerWidth`를 확인했으며, 메뉴 패널을 접은 상태에서 다음 결과를 확인했다.

| viewport | document scrollWidth | 우클릭 상세 | 메뉴 항목 수 | 메뉴 viewport 내 표시 |
|---:|---:|---|---:|---|
| 1280px | 1280px | 열리지 않음 | 4 | 확인 |
| 768px | 768px | 열리지 않음 | 4 | 확인 |
| 375px | 375px | 열리지 않음 | 4 | 확인 |

메뉴 4개는 엑셀 내보내기, 컬럼 길이 자동 조정, 정렬 해제, 설정을 기본값으로 복원이다. 정렬이 없으면 정렬 해제는 기존대로 비활성화된다. 설정 복원 실행 및 이후 메뉴 재열기도 확인했다.

엑셀 메뉴를 DOM 클릭해 **6,841바이트 XLSX Blob**, 올바른 MIME type, `문서현황-export.xlsx` 다운로드 호출을 확인했다. 다운로드 이벤트 자체가 공유 브라우저에서 전달되지 않아 Blob 생성과 anchor 다운로드 호출을 계측했으며, 다운로드 저장 완료로 간주하지 않는다. 타입별 workbook 내용과 다운로드 액션은 위 Vitest로 별도 확인했다.

왼쪽 클릭으로 실제 상세 overlay가 생성되는 것도 확인했다. 합성 상세 응답은 일부 보조 요청까지 완전하게 모사하지 않아 상세 본문/댓글 전체 기능의 브라우저 검증으로 간주하지 않는다. 기존 상세 열기/닫기 및 체크박스 동작은 통합 테스트로 확인했다.

스크린샷은 메뉴 전환 효과를 최종 표시 상태로 고정하고 그리드와 메뉴 영역만 캡처했다. 브라우저의 임시 route, 다운로드 계측, 화면 크기 및 메뉴 패널 상태는 검증 후 복원했다.

### 스크린샷

- [데스크톱 1280px](screenshots/desktop-context-menu.png)
- [태블릿 768px](screenshots/tablet-context-menu.png)
- [모바일 375px](screenshots/mobile-context-menu.png)

## 최종 점검

- [x] 작업지시서 → 계획서 → 상세 사양서 → 구현 순서 적용 및 사용자 승인
- [x] 우클릭 두 이벤트 경로 회귀 테스트
- [x] 엑셀 메뉴 제공 및 행 변경 메뉴 숨김
- [x] 좌클릭/체크박스 상세 및 공통 기본값 유지
- [x] F1-Grid 사용 문서 동기화
- [x] 빌드·관련 테스트·lint 및 기존 실패 분리
- [x] 실제 브라우저 375px·768px·1280px 및 합성 데이터 스크린샷
- [x] 백엔드/DB 변경 없음
