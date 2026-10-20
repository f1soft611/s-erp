# 문서현황 그리드 컬럼 재정의 결과

## 변경 사항

- 문서번호를 `electronicApprovalId` (`electronic_approval_id`)로 표시하고, 문서유형 구분코드인 `eabusNo`를 문서번호 컬럼에서 제거했다. 사용자에게 보이는 문서 종류는 기존 `documentType`을 사용한다.
- 기본 그리드에서 결재 참여자 전체 이름 나열을 제거했다. 대신 `내 결재 역할`, `내 처리상태`, `현재 결재단계·담당자`를 표시한다.
- 참여자 이름 검색은 숨김 `participantName` 컬럼의 search metadata로 유지했다. 숨김 컬럼에 명시된 검색 metadata는 상세검색 필드로 생성할 수 있도록 공통 `toPageSearchFields` 동작을 보완했다.
- 문서번호, 참여자 이름, 역할, 처리상태, 현재 담당자, 기존 문서/기안자/날짜 검색을 목록 API에 연결했다. 역할과 처리상태가 함께 입력되면 동일 사용자의 동일 결재선 행에서 두 조건을 만족해야 한다.
- 목록 응답은 기존 결재선 열에서 현재 사용자 정보와 가장 앞선 활성 결재단계 정보를 파생한다. tenant 및 인증 사용자 접근 제한, 상세 오버레이와 기존 업무 기능은 유지했다.
- DB schema 변경은 없다. `s-erp-postgresql-readonly` MCP의 `list_tables`, `describe_table`로 `tb_electronic_approval_main`, `tb_electronic_approval_line_info`의 메타데이터를 확인했다. 행 데이터는 조회하지 않았다.

## 검증

- 프런트엔드: `npm run test -- tests/document-status-page.test.tsx tests/document-status-service.test.ts tests/page-search-fields.test.ts` — 3개 파일 14개 테스트 통과.
- 프런트엔드: `npm run build` — TypeScript 및 Vite 빌드 성공. 기존 1 MB 초과 번들 경고가 표시됐다.
- 백엔드: `mvn "-Dtest=DocumentApprovalMapperTest,DocumentApprovalServiceImplTest,DocumentApprovalApiControllerTest" test` — 90개 타깃 테스트 통과.
- Mapper 회귀 테스트: `mvn "-Dtest=DocumentApprovalMapperTest#statusPageFiltersByDocumentIdAndCurrentUsersApprovalState" test` — SQL 조건을 적용한 뒤 1개 테스트 통과.
- 전체 `DocumentApprovalMapperTest` 재실행 중 이 작업과 별도인 `selectRelatedFilePage` mapped statement 부재 테스트가 실패했다. 해당 statement는 현재 Mapper XML에서 찾을 수 없어 이번 변경으로 수정하지 않았다.
- 그 뒤 공유 작업공간의 `DocumentApprovalServiceImplTest`에 파일 페이지 테스트가 추가된 상태에서 Maven 재실행은 해당 호출을 컴파일하지 못해 중단됐다. 테스트 소스는 `listFiles`를 호출하고 서비스 소스에는 메서드가 있지만, incremental compile 결과가 일치하지 않았다. 해당 파일 페이지 변경은 이 작업 범위 밖이므로 수정하거나 되돌리지 않았다.
- 브라우저에서 `/groupware/doc/read`에 접근했으나 인증 화면으로 이동했다. 로그인 정보 입력은 시도하지 않았으며 375px·768px·1280px 대상 화면 렌더링 및 스크린샷은 완료하지 못했다. 프런트엔드 자동 테스트와 빌드로 기능 검증을 보완했다.

## 후속 수정: 기안자 역할 및 임시저장 날짜 기준 (2026-10-20)

- 원인: `myParticipantType`이 결재선 참여유형만 집계해, 현재 사용자가 기안자이면서 결재선에도 있으면 `APPROVAL`이 `기안`보다 먼저/유일하게 표시됐다. 또 임시저장 문서는 `submitted_at`이 없는데 기본 결재신청일 범위 조건이 `submitted_at`만 비교해 목록에서 빠졌다.
- 수정: 현재 사용자가 기안자이면 `DRAFTER`를 역할로 우선 반환하고, 상세검색 역할 옵션을 `기안`으로 추가했다. `기안` 역할 필터는 결재선이 아닌 현재 사용자의 `drafter_id`로 검색한다.
- 후속 원인 보정: 목록 API가 `DRAFTER`를 반환하기 시작한 뒤 프런트엔드 응답 검증의 허용 역할 집합에는 `DRAFTER`가 빠져 있어 `전자결재 문서 검색 응답을 확인할 수 없습니다.` 오류가 발생했다. 응답 검증 및 상세검색 역할 파서의 허용 집합에 `DRAFTER`를 추가해 조회 오류를 제거했다.
- 임시저장 문서의 날짜 범위는 `created_at` 기준으로 처리하고, 결재상신된 문서는 기존대로 `submitted_at`을 사용한다. 기존 tenant 및 접근 제어식을 유지해 임시저장은 기안자 본인 문서만 조회된다.
- 검증: 먼저 추가한 프런트엔드 역할 옵션 테스트와 Mapper 날짜/기안자 필터 테스트가 기존 코드에서 각각 실패하는 것을 확인한 뒤 구현했다. 이후 프런트엔드 타깃 테스트 2개 파일 13개 통과, 백엔드 Mapper/Service 타깃 테스트 4개 통과, `npm run build` 성공, `git diff --check` 오류 없음을 확인했다. 빌드에는 기존 1 MB 초과 번들 경고가 있다.
- DB MCP: `list_tables`, `tb_electronic_approval_main` 및 `tb_electronic_approval_line_info`의 `describe_table`로 컬럼 계약을 확인했다. 행 데이터는 조회하지 않았으며 스키마 변경은 없다.

## 후속 확인

인증된 브라우저 세션에서 문서현황 그리드 및 상세검색을 확인하고, 375px·768px·1280px에서 페이지 overflow가 없는지 검증한다. 문서 행/본문을 포함하지 않는 테스트 데이터 화면에서만 스크린샷을 남긴다.
