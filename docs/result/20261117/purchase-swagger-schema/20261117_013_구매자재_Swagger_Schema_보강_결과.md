# 20261117_013 구매자재·품질 API 모델 Swagger @Schema 보강 결과

관련: [작업지시서](../../../directions/20261117/20261117_013_구매자재_Swagger_Schema_보강_작업지시서.md) · [계획서](../../../plan/20261117/20261117_013_구매자재_Swagger_Schema_보강_계획서.md) · [상세사양서](../../../spec/20261117/20261117_013_구매자재_Swagger_Schema_보강_상세사양서.md)

## 작업 내용
- 구매자재(`materials`)·품질(`quality`) `domain/model` 54개 파일의 클래스와 모든 필드에 `@Schema(description, example)` 추가. 구매요청 모델 기준 형식, `required`/`allowableValues` 미사용.
- 같은 이름의 필드는 같은 설명(필드 사전 171개), 뜻이 다른 곳(상태 검색 조건, 매입마감 행·요청)은 클래스별 재정의.
- 기존 필드 한 줄 주석은 설명으로 옮기고 삭제. 오래된 "상태 없으면 전체" 설명은 현재 계약(없으면 `ACTIVE`, `ALL`은 취소 포함 전체)으로 정정.
- 필드·타입·Lombok·API·DB·동작 변경 없음. 파일별 줄바꿈(CRLF/LF) 유지, `Schema` import는 `lombok` import 앞.
- 생성 설명 전체 목록(약 860줄)을 검토한 뒤 적용.

## 검증
- 신규 테스트 `PurchaseModelSchemaTest`: 대상 모델(중첩 클래스 포함) 클래스·필드의 `@Schema` 설명 존재, `required`/`allowableValues`/`VO 클래스` 표현 미사용 확인. 적용 전 실패(red) → 적용 후 통과.
- 전체 백엔드 테스트: 1286건, 실패 0, 오류 1(기존 `MinioStorageConfigTest` — 파일 경로 문제, 이번 변경과 무관), 스킵 3.
- 컴파일 대상은 Maven `target 1.8` 설정으로 수행. 추가한 것은 `io.swagger.v3.oas.annotations.media.Schema`(기존 의존성)뿐이라 Java 8 호환.

## 한계
- `/v3/api-docs` 화면 노출은 서버 재구동 후 확인 필요(테스트는 어노테이션 존재만 검증).
- 설명은 사전 기반 생성 후 목록 검토. 이후 필드 추가 시 같은 형식으로 작성해야 하며 위 테스트가 누락을 막는다.
- DB 변경 없음. 스크린샷 대상 화면 변경 없음.

## 커밋 메시지 예시
```
docs(api): 구매자재·품질 API 모델 Swagger @Schema 보강

- 가입고·발주·입고·확정·검사·매입마감 모델 54개에 @Schema 설명 추가
- 모델 @Schema 누락 방지 테스트 추가
```
