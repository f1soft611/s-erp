# 공통코드 중복 저장 오류 메시지 결과

## 변경 내용

- 원인은 공통코드 API가 상세 검증 메시지를 `result.message`에만 두고, 최상위 `resultMessage`는 `입력값 무결성 오류 입니다.`로 고정한 것이었다. 프론트 API 클라이언트는 최상위 `resultMessage`를 표시한다.
- `CommonCodeGroupApiController.badRequest`에서 메시지를 전달하는 `ResultVoHelper.buildFromMap` overload를 사용하도록 수정했다. HTTP 400, 입력 오류 코드, `result.message`는 유지하면서 최상위 `resultMessage`도 서비스가 던진 구체 메시지를 반환한다.
- 실제 화면 저장 경로인 `save-batch`에서 상세코드 중복 메시지와 기존 오류 코드를 확인하는 컨트롤러 회귀 테스트를 추가했다.

## 검증

- RED: 회귀 테스트가 구체 메시지 대신 공통 입력 무결성 문구를 받는 것을 확인했다.
- GREEN: `mvn "-Dtest=CommonCodeApiControllerTest,CommonCodeItemServiceImplTest,CommonCodeBatchServiceImplTest" test` 통과, 11 tests, 0 failures, 0 errors.
- PostgreSQL MCP 읽기 전용 확인: `tb_common_code_group`, `tb_common_code_item` 컬럼 메타데이터 확인. 스키마 변경은 없어 DDL/롤백은 작성하거나 실행하지 않았다.

## 영향 및 제한

- API 경로, 응답 코드, 상세 메시지 필드, DB 스키마는 변경하지 않았다.
- 프론트엔드 코드는 수정하지 않았다. 오류 메시지 표시는 기존 API 클라이언트의 최상위 `resultMessage` 처리를 그대로 이용한다.
- 화면 변경이 없어 브라우저 확인 및 스크린샷은 대상이 아니다.
