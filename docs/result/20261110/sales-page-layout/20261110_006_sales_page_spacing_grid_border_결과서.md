# 영업 화면 여백 및 메시지 폭 정합 결과

## 작업 내용

- 수주·출하·출하계획·거래명세서 등록 화면의 본문 좌우·상하 패딩을 대응하는 현황 화면 기준(`xs 8px / sm 16px`, 위 8px, 아래 16px)에 맞췄다.
- 공통 메시지의 기본 패딩은 유지하고, 영업 현황의 오류/검색결과 메시지만 그리드 거터에 맞췄다. 출하계획현황 메시지는 이미 거터가 적용된 본문 안에서 추가 좌우 패딩을 제거했다.
- 출하계획현황 그리드 바깥의 중복 outlined Paper를 제거하고 F1Grid 자체 테두리를 유지했다.
- 검색결과 메시지의 위·아래 간격, 등록 화면 embedded 레이아웃, 수주 저장 오류 간격 예외는 유지했다.

## 검증 결과

- 공통 메시지 테스트: 11/11 통과.
- 수주등록 21/21, 수주현황 19/19, 출하등록/현황 18/18, 거래명세서 2/2 통과.
- 출하계획등록/현황 테스트: 21/22 통과. 기존 `matches shipment form row height and basic information spacing` 검증에서 그리드 행 높이가 기대값 `32px` 대신 `28.8px`로 계산되는 기존 실패가 남아 있다. 나머지 테스트는 통과했다.
- 프런트엔드 빌드와 타입 검사는 통과했다. 변경 파일 lint는 오류 없이 종료했으며, 출하/거래명세서 현황의 기존 `react(set-state-in-effect)` 경고가 출력됐다.
- 실제 브라우저에서 출하계획현황을 빈 결과 및 오류 응답 fixture로 확인했다. 375px, 768px, 1280px 모두 페이지 가로 overflow가 없고 오류/검색결과 메시지의 좌우 경계가 F1Grid 경계와 일치했다(측정 차이 0px).

## 스크린샷

- [375px 출하계획현황](screenshots/delivery-plan-status-375.png)
- [768px 출하계획현황](screenshots/delivery-plan-status-768.png)
- [1280px 출하계획현황](screenshots/delivery-plan-status-1280.png)
- [375px 오류 메시지 정렬](screenshots/delivery-plan-status-error-375.png)

브라우저 검증은 실제 `SalesDeliveryPlanStatusPage`에 로컬 가짜 인증 세션과 빈/오류 API fixture를 사용했다. 계정 정보나 실제 테넌트 데이터는 사용하지 않았다.

## 커밋 제목/내용 제안

```text
fix: align sales page spacing and status messages

Match sales registration spacing to status pages, align status messages
with their grids, and remove the duplicate delivery-plan grid border.
```
