# 문서작성 알림 카드 정보 보강 결과

## 반영 내용

- 상단 알림 유형 옆에 기존 문서 결재상태 색상/variant의 상태 배지를 추가했다.
- 제목을 보조 caption 대신 굵은 body2로 표시해 문서 자체를 먼저 읽을 수 있게 했다.
- 구분선 아래 업무구분, 기안자, 상신일을 라벨/값 형태로 표시한다. 업무구분은 축약하지 않는다.
- 상신일은 기존 API `submittedAt`만 별도 `submittedDate` 필드로 전달한다. 누락 시 `—`이며 작성일/수정일로 대체하지 않는다.
- 기존 목록의 날짜 fallback, 최대 3건, 보완 요청 문구, 빈 상태, 카드 클릭 선택을 유지했다.
- 버튼 내부는 span 기반 표시 요소로 구성해 중첩 버튼을 만들지 않았다.

## 검증

- TDD: 신규 정보 표시/날짜 분리 테스트 5건이 구현 전 실패했고 기존 4건은 통과했다.
- `npm run test -- tests/approval-notice-panel.test.tsx tests/use-document-write-page.test.tsx`: 9건 통과.
- 최종 회귀 검증에서 `tests/document-presentation.test.ts`를 포함한 3개 파일 32건 모두 통과.
- `npm run build`: TypeScript/Vite 빌드 성공. 기존 번들 크기 경고가 표시됐다.
- 변경 파일 oxlint: 오류 없음. 기존 훅의 동기 setState-in-effect 경고 2건은 변경 범위 밖으로 보존했다.
- `git diff --check`: 통과.

## 실제 렌더링

기존 4173 Vite 서버에서 실제 `ApprovalNoticePanel` 및 앱 테마를 가져와 독립 Chromium 페이지에 합성 알림 데이터를 렌더링했다. 실제 사용자/tenant 데이터는 캡처하지 않았다. 전체 문서작성 화면의 실데이터 통합 검증과는 구분한다.

| 뷰포트 | 업무구분/기안자/상신일/상태 | 긴 제목/이름 | 페이지·항목·내부 텍스트 가로 넘침 |
| --- | --- | --- | --- |
| 375px | 표시 확인 | 줄바꿈 확인 | 없음 |
| 768px | 표시 확인 | 줄바꿈 확인 | 없음 |
| 1280px | 표시 확인 | 줄바꿈 확인 | 없음 |

- 실제 Chromium에서 클릭과 Enter 키가 선택한 문서 ID를 전달하는 것을 확인했다.
- 상신일 누락 표시 `—`를 포함해 캡처했다.
- 라이트/다크 테마를 캡처하고, 다크 전환 완료 후 실제 버튼 글자색이 테마 text.primary에 맞는지 확인했다.
- 검증 브라우저는 finally에서 종료했고 기존 서버는 유지했다.

### 스크린샷

- [모바일 375px](screenshots/notice-metadata-375.png)
- [태블릿 768px](screenshots/notice-metadata-768.png)
- [데스크톱 1280px](screenshots/notice-metadata-1280.png)
- [다크 테마](screenshots/notice-metadata-dark.png)

## DB 및 범위 확인

- 기본 read-only MCP `list_tables` → `describe_table(tb_electronic_approval_main)`으로 `drafter_name`, `submitted_at`, `document_type`, `document_status` 메타데이터를 직접 확인했다.
- 상신일 컬럼은 nullable timestamp다. 데이터 행, 연결 문자열, 인증정보는 조회/기록하지 않았다.
- 백엔드, API, DB 스키마 변경은 없어 SQL/롤백 스크립트가 필요하지 않다.
- 단일 컴포넌트, 기존 훅의 매핑 1줄, UI 타입 1필드 및 전용 테스트만 변경했다. 동시 작업의 다른 변경은 보존했다.
- 이전 작업에서 확인한 문서작성 전체 테스트의 기준선 실패는 이번에 재실행하지 않았다. 이번 변경은 관련 전용 테스트와 브라우저 검증으로 확인했다.

## 근거 문서

- [작업지시서](../../../directions/20261016/20261016_011_document_notice_metadata_work_instruction.md)
- [계획서](../../../plan/20261016/20261016_011_document_notice_metadata_plan.md)
- [상세 사양서](../../../spec/20261016/20261016_011_document_notice_metadata_spec.md)
