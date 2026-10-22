# 20261021_011 문서현황 전체조회 및 로컬 그리드 정렬·필터 결과

## 요청 및 원인

문서현황 그리드는 `F1GridDataSource`의 페이지/정렬 요청 방식을 사용해 정렬 시 서버 목록 API를 다시 호출했고, `disableFiltering` 설정으로 헤더 필터 메뉴가 숨겨져 있었다. 페이지 이동 UI는 없었지만 200건 단위의 내부 페이징과 스크롤 추가 로딩이 적용되고 있었다. 백엔드도 기본 limit 200 및 SQL `LIMIT/OFFSET`을 적용했다.

## 변경 내용

| 항목 | 결과 |
|---|---|
| 문서현황 조회 | 검색조건에 맞는 전체 결과를 조회하고 그리드 `rows`로 전달 |
| 정렬 및 필터 | 전체 로드된 행에 로컬 적용, 조작으로 목록 API 재호출 없음 |
| 헤더 필터 메뉴 | 문서현황 그리드에서 활성화 |
| 기존 페이징 | offset/limit을 제공하는 기존 API 호출은 최대 200건 페이징 동작 유지 |
| DB 스키마 | 변경 없음 |
| F1-Grid 문서 | 문서현황 전체조회 및 로컬 정렬·필터 설명 갱신 |

백엔드 서비스와 Mapper는 페이징 파라미터가 없는 요청에서만 SQL 페이징 절을 생략한다. 프런트엔드의 기존 페이징 데이터소스는 보존하고 문서현황 화면에 한해 전체조회 서비스와 로컬 rows 모드를 연결했다.

## 검증

### 테스트 및 빌드

| 검증 | 결과 |
|---|---|
| `mvn '-Dtest=DocumentApprovalServiceImplTest,DocumentApprovalMapperTest' test` | 89개 통과 |
| `npm run test -- tests/document-status-service.test.ts` | 6개 통과 |
| `node .\node_modules\vitest\vitest.mjs run tests\document-status-page.test.tsx -t 'loads all matching status rows|sorts and filters loaded status rows'` | 2개 통과, 16개 선택 제외 |
| `npm run build` | 성공. 기존 대형 번들 경고 출력 |
| `git diff --check` | 오류 없음 |

문서현황 페이지 테스트 전체 실행은 18개 중 16개 통과, 2개 실패했다. 두 실패는 변경 전 기준 실행에서도 확인된 기존 실패이며 이번 작업 범위에서 수정하지 않았다.

- `derives detailed search fields from the F1-Grid column metadata`: 숨김 `updatedAt` 필드가 상세검색 목록에 포함되어야 한다는 기존 기대와 실제 메타데이터 간 불일치.
- `applies document ID and personal approval filters from detailed search`: 문서번호 입력을 접근성 역할 `spinbutton`으로 찾는 기존 테스트가 현재 입력 컴포넌트와 일치하지 않음.

### 브라우저

인증 후 목록 API 응답을 합성 문서 3건으로 대체해 확인했으며, 실제 문서 데이터는 결과 스크린샷에 저장하지 않았다.

- 제목 오름차순 정렬 결과: `Synthetic Alpha`, `Synthetic Mike`, `Synthetic Zeta`.
- 제목 필터 `Alpha` 적용 결과: 1행만 표시되고 나머지 2행은 숨겨짐.
- 정렬 조작과 필터 적용 각각에서 문서 검색 API 추가 요청 0건.
- 필터 메뉴가 표시되고 375px, 768px, 1280px 뷰포트 모두 메뉴 영역이 화면 안에 위치함.
- 각 뷰포트에서 `documentElement.scrollWidth`와 `body.scrollWidth`가 뷰포트 너비와 일치함.

| 뷰포트 | 문서 가로 너비 | 본문 가로 너비 | 필터 메뉴 |
|---:|---:|---:|---|
| 375px | 375px | 375px | 표시 및 화면 내 위치 확인 |
| 768px | 768px | 768px | 표시 및 화면 내 위치 확인 |
| 1280px | 1280px | 1280px | 표시 및 화면 내 위치 확인 |

#### 스크린샷

- [데스크톱 1280px 필터 메뉴](screenshots/desktop-1280-filter-menu.png)
- [태블릿 768px 필터 메뉴](screenshots/tablet-768-filter-menu.png)
- [모바일 375px 필터 메뉴](screenshots/mobile-375-filter-menu.png)

### DB 확인

PostgreSQL 읽기 전용 MCP에서 관련 테이블 목록과 결재 문서/결재선 테이블 메타데이터를 확인했다. 테이블 행 데이터는 조회하지 않았고 스키마 변경도 없다.

## 관련 문서

- [작업지시서](../../../directions/20261021/20261021_011_document_status_full_load_local_grid_work_instruction.md)
- [계획서](../../../plan/20261021/20261021_011_document_status_full_load_local_sort_plan.md)
- [상세사양서](../../../spec/20261021/20261021_011_document_status_full_load_local_sort_spec.md)
- [F1-GRID 문서](../../../../frontend/src/pages/f1-grid-docs/F1-GRID.md)

## 완료 점검

- [x] 전체조회와 기존 페이징 계약을 함께 유지
- [x] 로컬 정렬·필터와 필터 메뉴 검증
- [x] 백엔드/프런트엔드 타깃 테스트 및 프런트엔드 빌드
- [x] 375px·768px·1280px 브라우저 검증 및 합성 데이터 스크린샷
- [x] F1-GRID 문서와 결과 문서 갱신
- [x] DB 스키마 변경 없음 및 MCP 메타데이터 확인
