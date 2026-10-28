# 전자결재 문서번호 발급 및 표시 결과

## 구현 결과

- 최초 임시저장 시 서버가 tenant/발급일 기준 `EA-YYYYMMDD-NNNN` 문서번호를 발급하고, 기존 문서는 물론 수정·상신 흐름에서도 같은 번호를 유지한다.
- 문서 상세와 문서현황에 실제 문서번호를 표시하고, 문서번호 검색·정렬을 연결했다. 상세 화면 진입은 계속 내부 `electronicApprovalId`를 사용한다.
- 수주 상세 제목 아래에 `수주번호: {orderNo}`를 표시한다.
- DB 컬럼, backfill, sequence 초기화 및 tenant별 유일 제약을 포함한 마이그레이션과 롤백 스크립트를 작성했다. **DB에는 적용하지 않았다.**

## 검증

| 검증 | 결과 |
|---|---|
| `backend`에서 `mvn test -q` | 성공. Surefire 보고서 기준 628 tests, failures 0, errors 0, skipped 2 |
| `backend`에서 `mvn "-Dmaven.test.skip=true" package -q` | 성공 |
| `frontend`에서 `npm run build` | 성공 |
| 전자결재 현황 페이지/서비스 및 응답 검증 집중 테스트 | 3 files, 63 tests 통과 |
| 상세 패널 문서번호 표시 테스트 | 1 test 통과 |
| 수주 상세 수주번호 표시 테스트 | 1 test 통과 |
| DB 마이그레이션 대응 파일 비교 | `docs/database`와 `backend/DATABASE`의 SQL/변경이력/롤백 3개 쌍 모두 동일 |
| `git diff --check` | 오류 없음. 기존 변경 파일의 줄바꿈 변환 경고만 출력 |

`mvn -q -DskipTests package`는 별도 문서공유 작업의 미추적 테스트 파일 `backend/src/test/java/egovframework/let/groupware/approval/shared/service/DocumentApprovalShareServiceTest.java:57`의 Java 구문 오류로 test-compile 단계에서 실패했다. 전자결재 문서번호 작업과 무관한 파일은 수정하지 않았으며, 테스트 컴파일을 생략한 production package는 성공했다.

문서작성 페이지의 기존 전체 페이지 경로 테스트는 목록 로딩 오류 화면에서 실패해 상세 동작까지 도달하지 못했다. 새로 추가한 고립된 상세 패널 문서번호 표시 테스트는 통과했고, 실제 화면에서도 아래 폭별 결과를 확인했다.

## 브라우저 확인

375px, 768px, 1280px 뷰포트에서 문서현황, 문서 상세, 수주 상세를 확인했다. 화면 확인에는 합성 fixture만 사용했으며 개인정보나 실제 tenant 행은 포함하지 않았다.

| 화면 | 375px | 768px | 1280px |
|---|---|---|---|
| 문서 상세 | [스크린샷](screenshots/document-detail-375.png) | [스크린샷](screenshots/document-detail-768.png) | [스크린샷](screenshots/document-detail-1280.png) |
| 문서현황 | [스크린샷](screenshots/document-status-375.png) | [스크린샷](screenshots/document-status-768.png) | [스크린샷](screenshots/document-status-1280.png) |
| 수주 상세 | [스크린샷](screenshots/sales-order-detail-375.png) | [스크린샷](screenshots/sales-order-detail-768.png) | [스크린샷](screenshots/sales-order-detail-1280.png) |

## DB 확인 범위

구현 전 PostgreSQL MCP로 테이블 및 컬럼 메타데이터를 확인했으며, 데이터 행은 조회하지 않았다. 마이그레이션은 작성 및 파일 간 일치 여부만 확인했고 적용하지 않았다.
