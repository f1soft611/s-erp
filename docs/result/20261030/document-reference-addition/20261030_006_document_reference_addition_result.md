# 문서 참조자 추가 구현 결과

## 근거 문서

- 작업지시서: [20261030_006 문서 참조자 추가](../../../directions/20261030/20261030_006_문서_참조자_추가_작업지시서.md)
- 상세사양서: [문서 참조자 추가 상세사양](../../../spec/20261030/20261030_006_문서_참조자_추가_상세사양서.md)
- 구현 계획: [Document Reference Addition Implementation Plan](../../../superpowers/plans/2026-10-30-document-reference-addition.md)

## 구현 내용

- 문서 열람 권한이 있는 사용자가 상신된 문서의 더보기 메뉴에서 참조자를 추가할 수 있다. 임시저장 문서에는 메뉴를 표시하지 않는다.
- 현재 결재선의 모든 참여자는 선택 대상에서 제외한다. 사용자 옵션은 상세 화면에서 이미 조회하는 활성 사용자 목록을 재사용한다.
- 추가 성공 시 문서 상세와 SYSTEM 타임라인을 다시 조회하고 문서 목록 갱신을 요청한다. API 오류는 선택값을 보존한 채 다이얼로그에 표시한다. 이미 참여 중인 사용자만 요청해 추가 건수가 0이면 성공으로 오인시키지 않고 안내한다.
- `REFERENCE_ADDED` 이벤트는 서버의 SYSTEM 타임라인 내용을 변경하지 않고 기존 이벤트 배지 형식으로 표시한다.
- 실제 브라우저 검증 중 다중 선택 팝업이 제출 버튼 클릭을 가로막는 문제를 발견했다. 참조자 다이얼로그에서 항목 선택 후 팝업을 닫도록 하여 여러 명을 차례로 선택하고 제출할 수 있게 했다.

## 검증 결과

| 검증 | 결과 |
|---|---|
| 백엔드 `DocumentApprovalInteractionServiceImplTest`, `DocumentApprovalInteractionApiControllerTest`, `DocumentApprovalMapperTest` | 성공, 92 tests |
| 프론트엔드 상세 UI 회귀 4건 | 성공 |
| 프론트엔드 API/메뉴 회귀 `document-approval-service.test.ts`, `document-link-sharing.test.tsx` | 성공, 54 tests |
| 프론트엔드 `npm run build` | 성공 |
| 프론트엔드 변경 파일 oxlint | 종료 코드 0. `DocumentApprovalDetailFeed.tsx`의 기존 effect set-state 경고 5건 출력 |
| Playwright 브라우저 검증 | 성공, 375px / 768px / 1280px. 메뉴/다중 선택/상세 갱신/SYSTEM 이력 표시와 페이지 가로 넘침을 확인 |
| `git diff --check` | 성공. 기존 파일의 LF/CRLF 안내만 출력 |

전체 세 파일 회귀 실행에서는 `document-write-page.test.tsx`에서 44건이 실패하고 전체 196건 중 152건이 통과했다. 실패는 문서 목록, 작성기, 댓글, 결재 처리 등 이번 참조 추가 변경과 무관한 기존 테스트 영역에 분포하며, 참조 추가 전용 UI 4건과 API/메뉴 54건은 별도 실행에서 통과했다.

## DB 및 이력

- 읽기 전용 `s-erp-postgresql-readonly` MCP로 테이블/컬럼 및 제약 메타데이터를 확인했다. 업무 데이터 행은 조회하지 않았다.
- 기존 SYSTEM event CHECK가 `REFERENCE_ADDED`를 허용하지 않아 날짜별 변경 SQL, 롤백 및 이력 문서를 `backend/DATABASE/20261030`과 `docs/database/20261030` 양쪽에 작성하고 누적 스키마를 갱신했다.
- migration은 실제 DB에 적용하지 않았다. 롤백 전 해당 event 행의 정리 여부를 확인해야 한다.
- 새 참조자는 기존 결재 참여자 행으로 저장된다. 기존 `documentReadAccess` 및 `MY_REFERENCE_PENDING` 조회 조건이 `REFERENCE` 참여자를 인식하는 mapper 검증을 통과했다.

## 브라우저 캡처

- [375px](screenshots/reference-add-dialog-375.png)
- [768px](screenshots/reference-add-dialog-768.png)
- [1280px](screenshots/reference-add-dialog-1280.png)

캡처와 API 응답은 합성 사용자/문서 데이터만 사용했다.

## 승인된 후속 수정 결과

### 재현 조건과 원인

- 문서현황에서 문서 상세를 연 뒤 참조자를 추가하면 `onActionComplete`가 목록 `retry`를 호출하고, 목록 조회 시작 콜백이 `detail.closeDetail`을 실행해 상세 오버레이까지 닫았다.
- 목록 재조회와 상세 닫기가 같은 콜백에 결합되어 검색 조건 변경뿐 아니라 데이터 갱신에서도 상세가 닫히는 것이 원인이었다.

### 해결 및 메시지

- 목록 조회 시작 콜백에서 상세 닫기를 제거하고, 검색 조건이 바뀌었을 때만 기존 상세를 닫도록 분리했다. 편집기 닫기 동작은 별도로 상세를 닫아 기존 흐름을 유지한다.
- 참조 추가 성공 후 상세·목록 갱신은 그대로 수행하면서 상세 패널을 유지한다.
- SYSTEM 이력 문구를 `작성자님이 참조자(새 참조자 A, 새 참조자 B)를 추가했습니다.` 형식으로 변경했다.
- DB 테이블/컬럼 및 API 구조 변경은 없어 migration은 추가하지 않았다. 읽기 전용 DB MCP에서 테이블 목록과 `tb_electronic_approval_line_info` 컬럼 메타데이터를 확인했고, 업무 행 데이터는 조회하지 않았다.

### 후속 검증

| 검증 | 결과 |
|---|---|
| `document-status-page.test.tsx` | 29 tests 통과 |
| 참조 추가 상세 화면의 SYSTEM 문구 테스트 | 통과 |
| `DocumentApprovalInteractionServiceImplTest` | 통과 |
| `npm run build` | 통과 |
| 참조자 추가 브라우저 검증 및 시스템 이력 표시 | 375px / 768px / 1280px 통과 |
| 변경 프론트엔드 파일 oxlint | 종료 코드 0. `useDocumentStatusList.ts`의 기존 effect set-state 경고 1건 출력 |
| `git diff --check` | 후속 문서/코드 변경 포함 통과 |

브라우저 캡처는 위의 `screenshots/reference-add-dialog-{375,768,1280}.png`를 갱신했다. 문서현황 상세 유지 회귀는 통합 테스트로 검증했으며 브라우저 캡처는 참조자 선택 화면과 새 SYSTEM 문구를 검증한다.

### 조용한 갱신 추가 검증

- `document-status-page.test.tsx`의 `refreshes quietly and keeps the document detail open after a detail action` 회귀 테스트가 통과했다. 조용한 갱신 중 그리드의 기존 행과 상세 패널이 유지되고 `aria-busy`가 켜지지 않는 것을 확인했다.
- 별도 `document-write-page.test.tsx`의 “상세 패널을 유지하고 작성기 닫은 뒤 조용히 갱신” 테스트는 문서 목록 region을 찾지 못하고 목록 로드 오류 상태로 실패했다. 이 경로는 참조자 추가의 문서현황 갱신과 별도이며, 기존 해당 테스트 파일의 다수 실패 범위와 함께 미해결로 남긴다.
