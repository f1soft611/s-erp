# 문서작성 피드형·리스트형 서버 페이징 상세 사양서

## 1. 목적 및 승인 범위

문서작성 화면의 피드형과 리스트형 일반 문서 목록을 서버 기준으로 20건씩 조회하고, 실제 문서 스크롤 영역에서 자동으로 다음 페이지를 불러온다. 개인별 고정 문서는 전체 목록을 별도 조회하며 일반 문서 페이지의 건수에 포함하지 않는다.

피드형·리스트형의 기존 필터, 상세 동작, 요약 영역, 초기 로딩 스켈레톤과 오류 재시도는 유지한다. 파일형 로딩은 변경하지 않는다. 사용자 승인 통합 설계는 [문서 개인별 고정 및 피드·리스트 페이징 설계](../../superpowers/specs/2026-10-20-document-pin-and-feed-list-pagination-design.md)를 따른다.

## 2. API 계약

### 일반 문서 페이지

`GET /api/v1/groupware/approvals/documents`는 문서작성 화면의 목록 조회를 담당한다. 문서 현황의 기간·필터 검색은 별도 `GET /api/v1/groupware/approvals/documents/search`로 분리하며, 기존 `DocumentStatus` 응답과 검색 동작을 유지한다. 두 화면의 API 계약을 혼용하지 않는다.

문서작성 화면은 다음 query parameter로 일반 문서 페이지를 요청한다.

| Query parameter | 요구사항 |
|---|---|
| `scope` | 기존 scope를 유지하며 생략 시 `ALL` |
| `documentType` | 기존 업무구분 필터를 유지한다 |
| `electronicApprovalId` | 기존 선택 문서 필터를 유지한다 |
| `includeDetails` | `true`이면 현재 페이지 문서만 feed 상세로 만든다 |
| `offset` | 0 이상의 정수이며 기본값은 `0` |
| `limit` | 1~20 정수이며 화면에서는 항상 `20`을 요청한다 |

페이지 요청 시의 응답은 기존 ResultVO envelope 안에 다음을 포함한다.

- `resultList`: 현재 페이지에 속한 문서만 반환한다. 리스트형은 기존 경량 문서 목록 항목, 피드형은 기존 feed 항목 형태를 유지한다.
- `totalRowCount`: 같은 사용자·tenant·scope·업무구분·문서 필터에 일치하는 **고정되지 않은 일반 문서 전체 건수**다.

페이지는 사용자 인증 정보로 계산한 현재 tenant와 읽기 권한 범위 안에서 조회한다. 사용자가 고정한 문서는 `tb_electronic_approval_pin`의 현재 tenant/user 관계에 따라 일반 페이지 결과와 건수에서 제외한다. 사용자 ID는 query parameter로 받지 않는다. 정렬은 `updated_at DESC, electronic_approval_id DESC`로 고정해 페이지 경계를 안정화한다. DB 스키마 변경은 이 하위 작업에 포함하지 않는다.

offset 또는 limit가 있으면 문서작성 페이지 응답 계약을 사용한다. 둘 다 생략된 기존 전체 목록 소비자는 기존 응답 동작을 유지한다. 잘못된 scope/필터, 음수 offset, 1 미만 또는 20 초과 limit는 기존 API 오류 관례에 맞춰 HTTP 400으로 처리한다. 문서 현황 검색은 `/documents/search`에서 현재 필터와 조회 범위 동작을 유지하고 이 20건 상한을 적용하지 않는다.

### 문서 현황 검색 API 분리

기존 `/documents`를 호출하던 문서 현황 데이터소스는 `/documents/search`를 호출하도록 변경한다. `offset`, `limit`, 기간·상태·담당자 등 검색 조건 및 정렬 파라미터와 `resultList`/`totalRowCount` 응답은 현행 그대로 유지한다. 이 라우트는 현황 목록 검색 전용이며 문서작성 피드/리스트 응답이나 고정 문서 제외 규칙을 적용하지 않는다.

### 고정 목록과의 분리

선행 개인별 고정 API `GET /documents/pinned`는 현재 인증 사용자에게 접근 가능한 고정 문서를 scope·업무구분·선택 문서 조건에 따라 전체 조회한다. 피드 모드에서는 고정 결과를 먼저 표시하고, 리스트 모드에서는 기존 고정 패널에 표시한다. 고정 결과는 일반 페이지의 `totalRowCount`, offset 또는 limit에 포함하지 않는다.

## 3. 피드 데이터 범위

`includeDetails=true` 페이지 응답의 결재선, 첨부, 상세 본문 및 최초 댓글 스트림은 현재 페이지의 일반 문서 ID에 대해서만 조회한다. 고정 피드는 선행 고정 목록 결과에 대해서만 별도로 조회한다. 전체 일반 목록을 먼저 읽고 클라이언트에서 20개만 자르는 방식은 허용하지 않는다.

## 4. 화면 및 상태 동작

- 최초 목록 조회는 기존 피드/리스트 스켈레톤을 표시한다.
- 성공한 첫 페이지는 기존 목록을 교체하고, 다음 페이지 성공 시 기존 항목 뒤에 추가한다.
- 피드와 리스트의 실제 공통 스크롤 root를 `IntersectionObserver` sentinel에 연결한다. sentinel이 root에 진입하면 다음 페이지를 자동 요청한다.
- 한 페이지 요청 중 발생한 중복 observer 이벤트는 추가 요청을 만들지 않는다.
- 다음 페이지 로딩 중 현재 카드와 행은 유지하고, 페이지 하단에는 접근성 label이 있는 스피너만 표시한다. 로딩 문구를 표시하지 않는다.
- 더 이상 결과가 없으면 sentinel 요청을 중지한다. `hasNext`는 `offset + resultList.length < totalRowCount`로 계산한다.
- 페이지 요청이 실패하면 이미 받은 항목을 유지하고 자동 재요청을 중지한다. 실패한 offset을 재시도할 수 있는 명시적 오류/재시도 UI를 표시한다.
- scope, 업무구분, 선택 문서 필터 또는 명시적 새로고침이 바뀌면 이전 요청을 무효화하고 첫 페이지부터 다시 시작한다. 이전 응답이 현재 상태를 덮어쓰면 안 된다.
- 피드/리스트 모드를 바꾸어도 각 요청은 해당 모드에서 필요한 응답 형태를 사용한다. 파일형의 기존 커서 페이징 상태와 동작은 유지한다.
- 고정/해제 성공 시 고정 목록 및 일반 첫 페이지를 다시 조회해 중복이나 누락을 방지한다.

## 5. 구성 책임

- 백엔드 controller/service/DAO/mapper는 페이지 크기·offset을 검증하고 현재 사용자 권한·필터가 반영된 일반 페이지와 건수를 반환한다.
- 프론트 API 서비스는 query 직렬화 및 `resultList`/`totalRowCount` 응답 형식을 검증한다.
- 문서작성 훅은 페이지 누적, generation 기반 stale 응답 무시, 중복 요청 차단, 실패 offset 재시도, 필터/새로고침 reset을 관리한다.
- 공유 `FeedView`와 `ListView`는 페이지 로딩 기능을 선택적 prop으로 제공한다. paging prop이 없는 기존 소비자의 렌더 및 기본 동작을 바꾸지 않는다.
- 문서작성 화면은 실제 scroll root와 훅 상태를 두 공통 보기 컴포넌트에 전달한다.

## 6. 검증 기준

### 백엔드

- Mapper: tenant/user 읽기권한, scope·업무구분·선택 문서 조건, pinned ID 제외, 최신 수정일/문서 ID 정렬, offset/limit 경계를 검사한다.
- Service/API: 인증 사용자 전달, limit 상한 20, invalid offset/limit 거부, 정확한 `totalRowCount`와 ResultVO 응답 형식을 검사한다.
- Feed: 현재 페이지 ID만 detail, approval-line, attachment, initial-comment enrichment에 전달되는지 검사한다.
- 비페이지 요청의 기존 목록 API 회귀를 검사한다.

### 프론트엔드

- 서비스: offset 증가와 limit 20 직렬화, 페이지 응답 검증 및 잘못된 건수/형식 거부를 검사한다.
- 훅: 최초 조회, offset 20 append, 전체 건수 기반 종료, 고정 문서 일반 페이지 제외, 필터·새로고침 초기화, stale 응답 무시, 중복 요청 방지, 실패 offset 재시도를 검사한다.
- 공통 보기: paging prop이 없을 때 기존 동작 보존, 지정 scroll root의 sentinel, 추가 로딩 스피너, 기존 항목 유지, 오류 상태에서 자동 재요청 방지를 검사한다.
- 문서작성 페이지: 피드/리스트 연결과 초기 스켈레톤 회귀를 검사한다.
- 프론트엔드 build와 지정 테스트를 실행한다.

### 브라우저

기존 S-ERP 개발 서버 `http://127.0.0.1:4173`을 확인 후 재사용한다. 합성 데이터를 사용해 375px, 768px, 1280px에서 첫 페이지, 다음 페이지 append, 스피너, 오류 재시도, 고정 패널 분리 및 가로 넘침을 검증한다. 화면 캡처와 결과는 `docs/result/20261020/document-feed-list-pagination`에 기록한다.

## 7. 제외 범위

- 개인별 pin/unpin 저장소와 API: 선행 작업 범위다.
- 파일형 파일 cursor 페이지 로직 변경: 제외한다.
- DB migration 또는 운영 DB 직접 적용: 제외한다.
- 무한히 많은 고정 문서의 별도 페이징: 승인된 선행 사양대로 고정 결과 전체를 별도 조회한다.
