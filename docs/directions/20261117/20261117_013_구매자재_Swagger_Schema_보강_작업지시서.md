# 20261117_013 구매자재·품질 API 모델 Swagger @Schema 보강 작업지시서

## 작업 목적

팀 개발 규칙(`.github/instructions/team-rules.instructions.md`, "백엔드 전자정부프레임워크 패턴 통일")은 API 요청·응답 모델에 Swagger `@Schema` 같은 문서화 어노테이션을 같은 역할의 기존 모델을 기준으로 작성하고 실제 API·데이터 계약과 일치시키라고 한다. 구매자재 안에서도 구매요청 모델(6개 파일)에는 있지만 발주·가입고·입고·검사·마감 모델에는 없어서 Swagger 문서와 코드 일관성이 맞지 않는다. 구매자재와 품질 모듈 전체를 같은 방식으로 보강한다(2026-11-17 사용자 요청, 범위는 구매자재 전체 권장안 선택).

## 기준 모델
`materials/request/create/domain/model`의 구매요청 모델(`PurchaseRequestVO`, `PurchaseRequestSaveRequestVO` 등):
- 클래스: `@Schema(description = "… 모델")`
- 필드: `@Schema(description = "설명", example = "예시")`, 필드 사이는 빈 줄, 객체·목록 필드는 예시 없이 설명만.
- `required`·`allowableValues`는 쓰지 않는다(기준 모델도 쓰지 않고, 코드 값은 설명 문장에 적는다).

## 적용 대상 (`domain/model`, 54개 파일)
- 가입고(`materials/arrival`): 등록·현황 모델 8개
- 발주(`materials/order`): 등록·현황·출력 모델 14개
- 입고(`materials/receipt`): 등록·현황·마감 모델 12개
- 구매요청확정(`materials/request/confirm`): 확정 모델 10개
- 구매요청 요청자 모델 1개(`PurchaseRequestRequesterVO`, 기존 구매요청 모델 중 유일하게 빠져 있음)
- 수입검사(`quality/inspect`): 등록·현황 모델 8개
(이미 `@Schema`가 있는 구매요청 6개 모델과 구매요청현황 모델은 변경하지 않는다.)

## 규칙
- 설명은 모델의 실제 의미와 계약에 맞춘다. 상태 값(`ACTIVE`/`CANCELED`/`ALL`), 세금 구분(`TAXABLE`/`ZERO_RATED`/`EXEMPT`), 조회구분(`ALL`/`CLOSED`/`OPEN`) 같은 코드 값은 설명에 쓴다.
- 기존 필드 Javadoc 주석이 있으면 그 내용을 `@Schema` 설명으로 옮기고 같은 내용의 주석은 지운다(중복 제거). 최신 동작과 어긋난 오래된 주석(예: 상태 "없으면 전체")은 현재 계약(없으면 `ACTIVE`)으로 바로잡는다.
- 필드 이름, 타입, API 경로, 검증, DB는 바꾸지 않는다. 어노테이션과 import만 추가한다. 파일의 줄바꿈 형식(CRLF/LF)은 그대로 유지한다.
- Java 8 호환 유지(`io.swagger.v3.oas.annotations.media.Schema`는 이미 프로젝트 의존성).

## 범위
- 포함: 위 54개 모델 파일, 검증(Java 8 컴파일·백엔드 테스트·Swagger 설명 노출 확인), 결과 문서.
- 제외: 컨트롤러·서비스 변경, 응답 계약 변경, 이미 있는 `@Schema`의 재작성, 프론트엔드.
- DB 변경 없음.

## 구현 절차
1. 계획서, 상세 사양서(번호 `20261117_013`)
2. 모델 검증 테스트(모든 대상 모델의 클래스·필드에 `@Schema` 존재 확인) → 보강
3. 검증: `javac --release 8`, 관련 백엔드 테스트, 전체 `mvn test`, Swagger 문서 확인
4. 결과 문서 `docs/result/20261117/purchase-swagger-schema`

## 완료 조건
- 구매자재·품질 `domain/model`의 모든 API 모델 클래스와 직렬화 대상 필드(`serialVersionUID` 제외)에 `@Schema`가 있다.
- 설명이 실제 계약과 맞고 기존 동작·테스트가 바뀌지 않는다. Swagger 문서에서 모델 설명이 보인다.
