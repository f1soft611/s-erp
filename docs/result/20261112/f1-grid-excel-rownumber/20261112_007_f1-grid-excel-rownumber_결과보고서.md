# F1-Grid 엑셀 행번호 결과

- 재현: `rownumber`가 실제 필드값이거나 빈 값인 행을 엑셀로 내보내면 화면 순번과 달랐다.
- 원인: 화면은 표시 행의 인덱스를 사용하지만 내보내기는 필드값 또는 `getValue`를 사용했다.
- 수정: 필터·정렬된 내보내기 데이터의 인덱스를 1부터 숫자 셀로 기록한다. 집계 행은 번호에 포함하지 않는다.
- 검증: 엑셀·집계 Vitest 11개, 빌드, 변경 파일 lint 통과. 수주현황 브라우저에서 내림차순 및 필터 후 화면과 다운로드 파일의 번호, 하단 집계의 빈 번호 셀을 확인했다. 데이터는 테스트 fixture다.
- 백엔드 및 DB 변경은 없다.

## 스크린샷

- [375px](screenshots/sales-order-status-summary-375.png)
- [768px](screenshots/sales-order-status-summary-768.png)
- [1280px](screenshots/sales-order-status-summary-1280.png)

## 커밋 메시지

제목: `엑셀 내보내기 행번호 표시 수정`

내용: `F1-Grid 행번호를 화면 표시 순서대로 엑셀에 기록한다.`
