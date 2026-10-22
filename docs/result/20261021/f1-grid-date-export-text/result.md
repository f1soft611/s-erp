# F1-Grid date text and alignment export result

## 변경 내용

- `type: 'date'` 값은 `getCellDisplayValue` 결과를 문자열로 저장해 Excel에서도 Grid의 `format`과 동일하게 보이도록 했다. date 값은 Excel 날짜 serial이 아니므로 날짜 계산/정렬은 제공하지 않는다.
- Excel 헤더는 `headerAlign`을 적용하고, 미지정 시 Grid 기본과 같이 가운데 정렬한다.
- Excel 데이터 셀은 `align`을 적용하고, 미지정 시 Grid 기본과 같이 `number`/`rownumber`는 오른쪽, 그 외 타입은 왼쪽 정렬한다. 명시한 값은 기본값보다 우선한다.
- 빈 날짜는 빈 셀로 유지하며, 유효하지 않은 날짜는 Grid가 표시하는 원문 문자열을 유지한다. 두 경우도 컬럼 정렬을 적용한다.
- `datetime`, `time`, numeric, Boolean 등 다른 타입의 기존 셀 값과 number format은 유지했다.

## 브라우저 참고 화면

셀 정렬은 XLSX 셀 메타데이터 변경이며 웹 UI 레이아웃은 바뀌지 않았다. 기존 Excel export 메뉴 브라우저 확인 스크린샷을 참고로 연결한다.

![F1-Grid Excel export context menu](../f1-grid-excel-export-types/screenshots/f1-grid-excel-export-context-menu.png)

## 검증

| 항목 | 명령 | 결과 |
| --- | --- | --- |
| XLSX export / 날짜 / F1-GRID docs | `npx vitest run --maxWorkers=1 tests/f1-grid-excel-export.test.ts tests/f1-grid-date-format.test.tsx tests/f1-grid-docs.test.tsx` (`frontend`) | PASS: 3개 파일, 62개 테스트 |
| Frontend build | `npm run build` (`frontend`) | PASS. 1,000 kB 초과 번들 경고 표시 |
| Red/Green 확인 | export 회귀 테스트를 먼저 추가한 뒤 기존 exporter에서 실행 / 구현 후 재실행 | 기존 Date 값 및 누락된 정렬로 실패 확인 후 1개 테스트 통과 |

기본 worker 설정의 통합 실행에서는 F1-GRID docs의 검색 테스트가 5초 제한을 초과했다(61/62). 해당 docs 테스트 파일 단독 실행과 `--maxWorkers=1` 통합 실행에서 통과해 병렬 worker 스케줄링 중 제한 시간 초과로 확인했다.

## 범위

- 프론트엔드 exporter, export 테스트, F1-GRID 문서 및 날짜별 작업 문서를 변경했다.
- 백엔드/API/DB는 변경하지 않았다.
- 기존 작업 트리의 무관한 변경은 보존했다.
