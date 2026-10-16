# 문서작성 알림 카드 문서 정보 상세 사양

## 화면

- `놓치지 마세요` 패널의 기존 카드 배경/테두리/클릭/최대 3건/빈 상태를 유지한다.
- 첫 행: 알림 유형(보조색)과 결재상태 Chip. 상태는 기존 문서 상태 label/color/variant를 사용한다.
- 두 번째 행: 문서 제목을 굵은 body2로 표시하고 공백 없는 문자열도 줄바꿈한다.
- 세 번째 영역: 업무구분, 기안자, 상신일의 라벨/값을 각각 한 행으로 표시한다.
- 업무구분은 `기안서` 등 전체 명칭이다. 기안자는 기존 author를 표시한다.
- 상신일은 `submittedAt`만 `YYYY.MM.DD`로 포맷한 `submittedDate`를 표시한다. 누락 시 `—`이며 공통 date의 fallback을 재사용하지 않는다.
- 배지는 상단 영역에서 줄바꿈할 수 있고 정보 값은 `minmax(0, 1fr)` 안에서 줄바꿈해 좁은 폭에서도 넘치지 않게 한다.
- 버튼 안 정보 요소는 span 기반 비상호작용 요소이며 중첩 버튼을 만들지 않는다.

## 계약 확인

기본 read-only DB MCP `list_tables` → `describe_table(tb_electronic_approval_main)`으로 메타데이터만 확인했다. `submitted_at`은 nullable timestamp이며 `drafter_name`, `document_type`, `document_status`가 존재한다. 데이터 행을 조회하지 않았다. 기존 API 응답 타입의 `submittedAt`, `drafterName`, `documentType`, `documentStatus`를 재사용하고 backend/스키마를 변경하지 않는다.

## 검증

- 패널 정보 및 상태 Chip, 누락 상신일, 클릭/개수 제한/빈 상태 테스트.
- 훅에서 날짜가 실제 submittedAt을 따르고 다른 날짜를 대체 사용하지 않는 테스트.
- 375/768/1280px에서 긴 제목/기안자/업무구분/상신일 표시 및 가로 넘침 없음.
- 관련 테스트, 빌드 및 lint 결과를 기록하고 결과 폴더에 캡처를 저장한다.

## 연결

- [작업지시서](../../directions/20261016/20261016_011_document_notice_metadata_work_instruction.md)
- [계획서](../../plan/20261016/20261016_011_document_notice_metadata_plan.md)
