# 품목·거래처 분류 관리 API 및 설정 UI 설계

## 상태

사용자가 구현을 요청했다. 승인된 스키마 초안(`20261027_002`)을 대상으로 tenant 격리 API와 각 마스터 화면의 설정 다이얼로그를 구현한다. DB 변경은 범위 밖이며 migration은 별도 승인 전까지 실행하지 않는다.

## 목표와 범위

- 품목분류(대/중/소) 및 거래처분류(대/소)의 테넌트별 조회·등록·수정·사용중지 API 제공
- 품목관리와 거래처관리 헤더에 설정 버튼을 추가하고 공통 반응형 계층 편집 다이얼로그를 제공
- DDL 적용 전이므로 애플리케이션 코드는 계약 기반으로 작성하되 DB 통합 실행은 claim하지 않는다.
- 마스터 등록/수정 폼의 분류 선택 연결, 검색/필터, 기존 데이터 backfill, DB 배포는 제외한다.

## 접근 방식

기존 common-code를 확장하지 않고, 분류 전용 Controller/Service/DAO/Mapper 계약과 프론트엔드 service/component를 둔다. 테이블과 부모 계층은 유사하지만 허용 레벨 수와 필드 이름이 달라 도메인 유형(`ITEM`, `PARTNER`)을 서비스 경계에서 명시적으로 처리한다. 프론트엔드 다이얼로그는 두 페이지가 공통 사용하고, 종류에 따라 API 경로·명칭·최대 레벨을 지정한다.

## API 및 권한 계약

Base path: `/api/v1/co/master/classifications`

| Method/path | 접근 | 동작 |
|---|---|---|
| `GET /items` | 인증 사용자 | 로그인 tenant의 품목분류 전체 목록 |
| `POST /items` | tenant/platform admin | root 또는 유효한 상위 분류 아래 신규 분류 등록 |
| `PUT /items/{id}` | tenant/platform admin | 이름, 정렬순서, 사용여부 수정 |
| `GET /partners` | 인증 사용자 | 로그인 tenant의 거래처분류 전체 목록 |
| `POST /partners` | tenant/platform admin | root 또는 유효한 상위 분류 아래 신규 분류 등록 |
| `PUT /partners/{id}` | tenant/platform admin | 이름, 정렬순서, 사용여부 수정 |

Tenant ID는 요청 payload/query/path에서 받지 않고 `LoginVO`에서 도출한다. 모든 조회/수정/상위 노드 확인은 `tenant_id` 조건을 포함한다. 물리 삭제 및 부모/레벨 변경 endpoint는 만들지 않는다.

노드 응답 필드는 도메인 독립형 `id`, `name`, `level`, `parentId`, `sortSeq`, `useAt`로 한다. 쓰기 payload는 생성 시 `name`, `parentId`, `sortSeq`, `useAt`; 수정 시 `name`, `sortSeq`, `useAt`이다. ID는 DB가 발급한다.

공통 검증: 이름 trim 후 필수, 최대 50자, `sortSeq >= 0`, `useAt`은 `Y` 또는 `N`. 생성 레벨은 서버가 계산한다: 품목은 1→2→3, 거래처는 1→2. 존재하지 않거나 다른 tenant인 부모, 사용 중지 부모, 최대 레벨 노드의 하위 생성은 거부한다. 자식이 사용 중인 노드는 비활성화할 수 없다. 기존 참조 분류의 비활성화는 허용한다. 부모와 레벨은 생성 후 고정한다.

## UI 동작

- 각 관리 페이지의 기존 권한 action group에 `품목분류 설정` 또는 `거래처분류 설정`을 추가한다. 페이지의 tenant-admin write 권한이 없으면 버튼과 쓰기 controls를 노출하지 않는다.
- 공통 Dialog는 열릴 때 전체 트리를 불러오고, 오류/로딩/저장 상태를 표시한다. 데스크톱은 분류 트리와 편집 폼을 나란히 표시하고 좁은 화면은 세로로 배치한다.
- 트리에서 노드를 선택해 이름, 정렬순서, 사용여부를 수정한다. 새 root 또는 선택 노드의 하위 분류를 추가한다. 최대 레벨에서는 하위 추가를 제공하지 않는다.
- 실제 삭제는 제공하지 않는다. 비활성은 기존 연결 레코드를 보존한다.
- 저장 성공 후 목록을 다시 조회하고, 실패는 다이얼로그 안에 오류 메시지로 보인다. 다이얼로그 닫기는 취소이며 저장하지 않은 입력을 폐기한다.
- 375/768/1280px에서 내부 영역만 스크롤하고 페이지 전체 가로 overflow를 만들지 않는다.

## 데이터 흐름과 오류 처리

프론트 service는 API client의 `apiGet`, `apiPost`, `apiPut`을 사용한다. 백엔드는 기존 `ResultVO` 응답 규칙 및 `EgovAccessControlHelper.isTenantAdmin`을 따른다. 입력/계층 오류는 400, tenant 관리자 이외 쓰기는 403, 요청 ID가 현재 tenant에 없으면 404로 응답한다. 예상하지 못한 DB 오류를 성공 응답으로 바꾸지 않는다.

DB가 DDL 초안 상태인 동안 API 요청 시 테이블 부재로 오류가 날 수 있다. DB migration 선적용 및 배포 순서는 운영 승인 대상이며, 이 작업에서는 실제 DB 연결 테스트나 DDL 실행을 하지 않는다.

## 검증

- Controller/Service 단위 테스트: tenant ID가 인증 객체에서 유래, admin 외 쓰기 거부, 허용 레벨, 잘못된/다른 tenant 부모, 최대 깊이, 자식 있는 부모 비활성 거부, 입력 경계 검증.
- 프론트엔드 테스트: 두 유형 API 경로, 트리 조회/계층 추가 및 수정, 권한별 버튼, 오류 표시, 다이얼로그 반응형 속성.
- Maven 테스트 및 frontend 테스트/build를 수행한다. 가능한 경우 브라우저에서 375/768/1280px을 확인한다.
- DB 통합 테스트 및 migration 적용 검증은 하지 않으며 결과 문서에 한계를 기록한다.
