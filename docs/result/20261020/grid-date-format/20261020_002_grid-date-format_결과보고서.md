# F1-Grid date format 결과

## 요구사항 및 근거

- [작업지시서](../../../directions/20261020/20261020_002_grid-date-format_작업지시서.md)
- [계획서](../../../plan/20261020/20261020_002_grid-date-format_계획서.md)
- [상세 사양서](../../../spec/20261020/20261020_002_grid-date-format_상세사양서.md)
- 사용자 승인: 공통 date 컬럼에 적용, 상세 사양 승인, 기존 테스트 실패는 수정하지 않고 이번 작업 진행.

## 재현 및 원인

문서현황의 결재신청일과 최종 변경일은 `type: 'date'`지만 ISO timestamp 원문이 표시됐다. 공통 `getCellDisplayValue`에 date 표시 분기가 없었고, `format` 타입도 숫자 형식만 허용했다.

## 수정

- 컬럼 `format`을 문자열로 확장했다. 기존 공개 숫자 형식 타입은 유지했다.
- 공통 표시 함수에서 date에 지정 형식 또는 기본 `yyyy-mm-dd`를 적용한다.
- ISO timestamp 문자열은 날짜 부분을 사용하여 클라이언트 시간대로 날짜가 바뀌지 않는다.
- 빈 값은 빈 셀, 잘못된 날짜는 기존처럼 원문으로 표시한다.
- 원본, 날짜 편집/검색, 숫자 형식, datetime/time, 사용자 renderer 우선순위는 유지한다.
- 셀/자동 너비/Excel은 기존 공통 표시 함수 호출을 그대로 사용한다. Excel 파일 다운로드 자체는 별도 브라우저 검증하지 않았다.
- 문서현황 파일의 기존 미커밋 변경은 수정하지 않았다.
- F1-Grid 사용 문서에 형식 토큰과 예시를 추가했다.

## 검증

### 테스트

- 변경 전 기존 두 파일: 164건 중 113건 통과, 51건 실패.
  - 문서현황 5건: 기존 미커밋 변경에서 제거된 문서번호 컬럼 등을 기대한다.
  - 공통 그리드 46건: 문자 깨짐 기대값 및 편집/레이아웃 등 기존 실패.
  - 사용자 승인에 따라 기존 실패는 수정하지 않았다.
- 새 date format 테스트: 구현 전 23건 중 13건 실패, 구현 후 23건 통과.
- 관련 선별 실행: 새 23건 + 기존 숫자 소수점 표시/날짜 축약 입력 2건, 총 25건 통과. 기존 154건은 선별 실행에서 제외했다.
- VS Code 테스트 도구가 해당 테스트를 발견하지 못해 저장소 Vitest 실행기를 사용했다.
- `npm run test`에 전달한 이름 필터가 npm/PowerShell에서 올바르게 전달되지 않은 추가 실행은 중단하고, 아래 직접 실행으로 대체했다.

```powershell
Set-Location frontend
node .\node_modules\vitest\vitest.mjs run tests\f1-grid.test.tsx tests\f1-grid-date-format.test.tsx --testNamePattern 'F1-GRID date formatting|formats numeric values with a custom decimal precision|normalizes supported date input shortcuts'
npm run build
```

### 빌드 및 브라우저

- TypeScript + Vite 빌드 성공. 1000kB 초과 청크 경고는 있으나 빌드 오류는 없다.
- 변경한 TypeScript 3개 파일의 oxlint 및 `git diff --check` 통과.
- `http://127.0.0.1:4173`의 기존 S-ERP 서버(HTTP 200, title S-ERP)를 재사용했다. 기존 서버는 종료하지 않았다.
- 임시 HTML에서 실제 F1-Grid를 합성 데이터로 렌더링한 뒤 검증 파일을 제거했다. 로그인한 실제 문서현황이나 실데이터는 조회하지 않았다.
- 각 뷰포트에서 `2026-10-20`, `2026/10/20`, `2026-01-05`, `2026/01/05` 표시를 확인했다.
- 375/768/1280px에서 페이지 scrollWidth가 각각 뷰포트 너비와 같아 페이지 가로 overflow가 없었다.
- 문서현황의 두 date 컬럼을 실제 컬럼 생성 함수로 가져와 기본 형식이 적용되는 것을 회귀 테스트로 확인했다.

| 너비 | 결과 | 스크린샷 |
|---:|---|---|
| 375px | 기본/지정 형식 정상, 페이지 가로 overflow 없음 | [mobile](screenshots/date-format-375.png) |
| 768px | 기본/지정 형식 정상, 페이지 가로 overflow 없음 | [tablet](screenshots/date-format-768.png) |
| 1280px | 기본/지정 형식 정상, 페이지 가로 overflow 없음 | [desktop](screenshots/date-format-1280.png) |

## 영향 및 제약

- 공통 date 컬럼의 기본 표시는 이제 날짜만 포함한다. timestamp 원문을 표시하던 다른 date 컬럼도 동일하게 적용된다.
- 전체 기존 테스트가 통과한 상태는 아니다. 위 기준 실패와 이번 변경 검증을 구분한다.
- 프런트엔드 표시 변경만 수행했다. 백엔드/API/DB 변경이 없어 DB MCP 및 SQL 스크립트는 해당하지 않는다.
