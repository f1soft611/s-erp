# 20261117_013 구매자재·품질 API 모델 Swagger @Schema 보강 상세 사양서

기준: [작업지시서](../../directions/20261117/20261117_013_구매자재_Swagger_Schema_보강_작업지시서.md), [계획서](../../plan/20261117/20261117_013_구매자재_Swagger_Schema_보강_계획서.md)
API·DB·동작 변경 없음. 모델 클래스에 문서화 어노테이션만 추가한다.

## 1. 작성 형식 (구매요청 모델 기준)

```java
@Schema(description = "구매요청 저장 요청 모델")
@Getter
@Setter
public class PurchaseRequestSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "요청일", example = "2026-11-12")
    private LocalDate requestDt;

    @Schema(description = "구매요청 상세 목록")
    private List<PurchaseRequestDetailSaveRequestVO> details;
}
```

- 클래스: 모델 역할을 한 줄로 설명한다("… 요청 모델", "… 조회 결과 모델", "… 검색 조건 모델"). 클래스 Javadoc의 첫 문장을 바탕으로 하되 `VO 클래스` 표현은 `모델`로 바꾸고 화면 위치(예: 왼쪽·오른쪽 그리드)는 쓰지 않는다.
- 필드: `description`은 항상, `example`은 값이 있는 스칼라 필드에만(객체·목록은 예시 없음). 설명의 코드 값은 `ACTIVE 정상, CANCELED 취소`처럼 값과 뜻을 함께 쓴다.
- `required`, `allowableValues`는 쓰지 않는다.
- `io.swagger.v3.oas.annotations.media.Schema` import를 `lombok` import 앞에 둔다.
- 필드의 기존 한 줄 Javadoc은 설명으로 옮기고 지운다. 중첩 정적 클래스도 클래스와 필드에 같은 형식으로 적용한다.

## 2. 필드 설명 사전 (같은 이름은 같은 설명)

| 종류 | 필드 | 설명 / 예시 |
| --- | --- | --- |
| 식별자 | `…Id` | 해당 대상의 ID. 예: `materialReceiptId`=입고 ID(900), `materialInspectionDetailId`=수입검사 상세 ID(31) |
| 번호 | `…No` | 업무번호. 접두어: 구매요청 `MR`, 확정 `MC`, 발주 `PO`, 가입고 `MP`, 검사 `QI`, 입고 `MI` (예: `MI-20261117-0001`) |
| 날짜 | `…Dt`, `…DtFrom`, `…DtTo` | 일자(`YYYY-MM-DD`)와 검색 시작·종료 |
| 수량 | `…Qty` | 해당 수량. 발주 잔량, 입고 가능량(합격량 − 유효 입고 합), 검사 대기량(가입고량 − 유효 검사량 합) 등은 계산 근거를 설명에 쓴다 |
| 금액 | `supplyAmt`, `vatAmt`, `totalAmt`, `unitPrice` | 공급가액, 부가세액, 합계금액, 단가 |
| 코드 값 | `status`, `taxType`, `vatIncludedAt`, `sourceType`, `closeType`, `useAt` | `ACTIVE`/`CANCELED`/`ALL`, `TAXABLE`/`ZERO_RATED`/`EXEMPT`, `Y`(포함)/`N`(별도), `CONFIRM`/`DIRECT`, `ALL`/`CLOSED`/`OPEN`, `Y`/`N` |
| 마감 | `closingMonth`, `closed`, `closedAt`, `closedBy` | 매입마감월(`YYYYMM`), 마감 여부·일시·마감자 |
| 출력 | `company…`, `vendor…` | 발주서 출력용 회사·구매처 정보 |

## 3. 클래스별 재정의(사전과 뜻이 다른 곳)
- 상태 검색 조건 모델(가입고·발주·입고·수입검사 현황): `status`는 "상태 조건. `ACTIVE` 정상(기본), `CANCELED` 취소, `ALL` 전체(취소 포함). 값이 없으면 `ACTIVE`로 본다". `keyword`는 화면별 통합검색 컬럼(번호·구매처·품목코드·품목명·담당자 등)을 쓴다.
- 매입마감 행 모델: 단가·세금 구분·포함 여부·공급가·부가세·합계는 "마감 행은 마감 값, 미마감 행은 입고 값"으로 설명한다. `useAt`은 입고 헤더 사용 여부.
- 매입마감 요청 행: 마감 단가(입고 단가와 별도), 마감 세금 구분·부가세 포함 여부(`Y`는 과세만).

## 4. 검증 항목
- 대상 54개 모델의 클래스와 모든 직렬화 대상 필드(`serialVersionUID`·`static` 제외)에 `@Schema`와 비어 있지 않은 `description`이 있다.
- `required`·`allowableValues` 미사용, 클래스 설명에 `VO 클래스`·화면 위치 표현이 없다.
- 구매요청 기존 모델은 변경 없음(`@Schema` 개수 동일).
- `javac --release 8` 통과, 관련·전체 백엔드 테스트 결과가 변경 전과 같다(기존 `MinioStorageConfigTest` 1건 오류 외 통과).
- 서버의 `/v3/api-docs`에서 모델 설명이 노출된다.
