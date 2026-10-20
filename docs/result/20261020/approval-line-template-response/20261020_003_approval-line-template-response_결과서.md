# 자주 쓰는 결재선 저장 응답 오류 수정 결과

## 요청 및 원인

- [작업지시서](../../../directions/20261020/20261020_003_approval-line-template-response_작업지시서.md)
- [계획서](../../../plan/20261020/20261020_003_approval-line-template-response_계획서.md)
- [상세 사양서](../../../spec/20261020/20261020_003_approval-line-template-response_상세사양서.md)

재현 조건은 정상 저장 결과에 `updatedAt: null`이 포함되는 경우다. 생성 서비스는 응답 VO에 수정일을 설정하지 않지만 프론트엔드 공통 요약 검증은 문자열/생략만 허용하여 `자주 쓰는 결재선 저장 응답을 확인할 수 없습니다.`를 발생시켰다. 같은 검증을 사용하는 목록·상세·이름 변경도 숫자형 날짜를 거부했다.

## 변경 사항

- 템플릿 요약 타입과 공통 응답 검증에서 null 및 유한한 숫자형 날짜를 허용한다.
- 문자열/생략 날짜와 기존 ID·이름·문서 코드·참여자 검증을 유지한다.
- 객체/배열/불리언/NaN/Infinity는 계속 오류로 처리한다.
- 서버·DB·화면 구조, 결재선 임시 편집/적용/취소 및 소유권 정책은 변경하지 않는다.
- 사용자 작업 중인 다른 프론트엔드 파일과 문서는 수정하지 않았다.

## 자동 검증

1. 수정 전 서비스 테스트: 16개 중 2개 실패. null/숫자형 수정일이 보고된 저장 응답 오류 메시지로 거부되는 것을 확인했다.
2. 수정 후 서비스 테스트: 16개 통과.
3. 서비스 전체 및 저장/불러오기/목록 갱신 실패/취소 관련 다이얼로그 선별 실행: **21개 통과, 28개 제외**.

```powershell
Set-Location frontend
node .\node_modules\vitest\vitest.mjs run tests\approval-line-template-service.test.ts tests\document-approval-settings-dialog.test.tsx --testTimeout=20000 --reporter=dot --testNamePattern='approval line template service|saves the current draft|loads favorites on open|places favorite save|keeps a created favorite|discards the temporary edit'
```

4. `npm run build`: 종료 코드 0. 대용량 청크 경고가 출력되었다.
5. `git diff --check`: 오류 없음.

### 전체 다이얼로그 실행의 제한

전체 다이얼로그 실행은 통과하지 않았다. 기본 5초 제한에서 여러 테스트가 시간 초과되었고, 제한을 20초로 올린 실행에서는 기존 `preserves failed inline renames after partial batch failure for retry` 테스트가 `실패 후 재시도할 이름` gridcell을 찾지 못했다. 다이얼로그 테스트는 서비스 전체를 mock하므로 이번 날짜 검증 변경을 직접 실행하지 않는다. 해당 테스트/그리드 구현은 이 작업에서 변경하지 않았다. React `act(...)` 경고도 출력되었다. 전체 회귀 통과로 보고하지 않는다.

## 브라우저 검증

- 기존 S-ERP 개발 서버 `http://127.0.0.1:4173`을 확인하고 재사용했다. 직접 서버를 시작하거나 종료하지 않았다.
- Playwright의 별도 context에 실제 결재선 설정 컴포넌트와 API 서비스를 로드하고, 가상 사용자와 모의 API만 사용했다.
- 각 375/768/1280px 실제 브라우저 뷰포트에서 저장을 반복했다.
- POST는 `201` 및 `updatedAt: null`, 후속 목록은 숫자형 `updatedAt`을 반환하도록 했다.
- 모든 크기에서 저장창이 닫히고 `Response regression` 항목이 선택되었으며 오류 alert는 0개였다.
- 고정 기안자를 제외한 결재자 1명이 요청에 포함되었다. 결재선 설정창은 유지되었다.
- 각 크기에서 `innerWidth`가 설정 폭과 일치했고 페이지 전체 가로 overflow가 없었다.
- 브라우저 인스턴스는 검증 후 종료했다. 실제 계정 인증 및 운영 서버/DB 저장은 실행하지 않았다.

| 폭 | 저장 후 화면 |
|---|---|
| 375px | [모바일 캡처](screenshots/saved-375.png) |
| 768px | [태블릿 캡처](screenshots/saved-768.png) |
| 1280px | [데스크톱 캡처](screenshots/saved-1280.png) |

## DB MCP 및 변경 관리

기본 `s-erp-postgresql-readonly`의 `list_tables` → `describe_table(tb_electronic_approval_line_template)`을 직접 호출해 관련 테이블과 `updated_at: timestamp without time zone, NOT NULL`을 확인했다. 생성 응답 VO의 null은 DB null을 의미하지 않는다. 데이터 행, 계정, 인증 정보는 조회하지 않았다. DDL/데이터/백엔드 변경이 없으므로 SQL·롤백·스키마 이력 변경은 불필요하다.

## 최종 범위

요구된 저장 응답 오류를 실패 테스트로 재현하고 수정했으며, 관련 자동 테스트·빌드·모의 API 브라우저 저장 검증을 완료했다. 실제 배포 환경에서의 저장 재확인과 전체 다이얼로그 테스트의 별도 실패는 미확인/잔여 항목이다. 커밋은 생성하지 않았다.
