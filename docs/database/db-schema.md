# DB 스키마 상세 정리

### 1-1. tb_tenant

| 컬럼                         | 타입      | 설명                                     |
| ---------------------------- | --------- | ---------------------------------------- |
| tenant_id                    | bigint    | 테넌트 PK                                |
| tenant_code                  | varchar   | 테넌트 식별 코드 (예: TENANT_2133453253) |
| tenant_nm                    | varchar   | 테넌트명                                 |
| admin_email                  | varchar   | 관리자 이메일                            |
| admin_name                   | varchar   | 관리자 이름                              |
| business_registration_number | varchar   | 사업자등록번호                           |
| corporate_number             | varchar   | 법인번호                                 |
| business_type                | varchar   | 업종                                     |
| business_category            | varchar   | 업태                                     |
| registration_date            | date      | 등록일                                   |
| logo_image                   | text      | 로고 이미지                              |
| onboarding_status            | varchar   | 온보딩 상태                              |
| use_at                       | char      | 사용 여부 (Y/N)                          |
| created_at                   | timestamp | 생성 일시                                |
| updated_at                   | timestamp | 수정 일시                                |
| created_by                   | bigint    | 생성자                                   |

역할:

- 테넌트 기본 정보 관리
- 플랫폼 다중 테넌트 식별의 기준

### 2-4. tb_login_account

| 컬럼                | 타입      | 설명               |
| ------------------- | --------- | ------------------ |
| login_id            | bigint    | 로그인 계정 PK     |
| tenant_id           | bigint    | 소속 테넌트        |
| login_code          | varchar   | 로그인 코드/아이디 |
| password_hash       | varchar   | 암호화 비밀번호    |
| profile_image       | text      | 프로필 이미지      |
| stamp_image         | text      | 도장 이미지        |
| login_attempt_count | int       | 실패 횟수          |
| locked_at           | timestamp | 잠금 시점          |
| password_changed_at | timestamp | 비밀번호 변경 시점 |
| use_at              | char      | 사용 여부          |
| created_at          | timestamp | 생성 일시          |
| updated_at          | timestamp | 수정 일시          |

역할:

- 실제 로그인 인증의 기준
- 사용자 식별과 비밀번호 검증 수행

### 2-5. tb_user

| 컬럼          | 타입      | 설명                  |
| ------------- | --------- | --------------------- |
| user_id       | bigint    | 사용자 PK             |
| tenant_id     | bigint    | 소속 테넌트           |
| login_id      | bigint    | 로그인 계정 FK        |
| user_nm       | varchar   | 사용자명              |
| email_addr    | varchar   | 이메일                |
| department_id | bigint    | 부서 FK               |
| level_id      | bigint    | 직급 공통코드 항목 FK |
| mobile_no     | varchar   | 휴대폰 번호           |
| use_at        | char      | 사용 여부             |
| created_at    | timestamp | 생성 일시             |
| updated_at    | timestamp | 수정 일시             |

역할:

- 사용자 프로필정보
- 로그인 계정과 사용자 실명/부서/직급 연결
- `level_id`는 `tb_common_code_item.common_code_item_id`를 참조하며 `LEVEL` 그룹 항목만 사용

### 2-6. tb_department

| 컬럼                 | 타입      | 설명                   |
| -------------------- | --------- | ---------------------- |
| department_id        | bigint    | 부서 PK                |
| tenant_id            | bigint    | 소속 테넌트            |
| department_nm        | varchar   | 부서명                 |
| parent_department_id | bigint    | 상위 부서 FK(자기참조) |
| sort_order           | int       | 정렬 순서              |
| use_at               | char      | 사용 여부              |
| created_at           | timestamp | 생성 일시              |
| updated_at           | timestamp | 수정 일시              |

역할:

- 테넌트별 부서 조직도 관리
- `tb_user.department_id`가 참조하는 대상

### 2-6-1. tb_common_code_item 직급 참조

- `tb_user.level_id`는 `tb_common_code_item.common_code_item_id`를 참조한다.
- 직급 항목은 `tb_common_code_group.group_code = 'LEVEL'`인 그룹에 속한 활성 항목을 사용한다.

### 2-7. tb_role

| 컬럼           | 타입      | 설명                                                  |
| -------------- | --------- | ----------------------------------------------------- |
| role_id        | bigint    | 역할 PK                                               |
| tenant_id      | bigint    | 소속 테넌트                                           |
| role_code      | varchar   | 역할 코드(PLATFORM_ADMIN/TENANT_ADMIN/TENANT_USER 등) |
| role_nm        | varchar   | 역할명                                                |
| role_dc        | varchar   | 역할 설명                                             |
| use_at         | char      | 사용 여부                                             |
| is_system_role | char      | 시스템 기본 역할 여부                                 |
| created_at     | timestamp | 생성 일시                                             |
| updated_at     | timestamp | 수정 일시                                             |

역할:

- 테넌트별 권한 역할 정의
- 로그인 시 `tb_login_account_role`을 통해 계정에 부여된 역할로 JWT의 `roleCode`/`groupNm`을 결정

### 2-8. tb_login_account_role

| 컬럼                  | 타입      | 설명           |
| --------------------- | --------- | -------------- |
| login_account_role_id | bigint    | 매핑 PK        |
| login_id              | bigint    | 로그인 계정 FK |
| role_id               | bigint    | 역할 FK        |
| created_at            | timestamp | 생성 일시      |

역할:

- 로그인 계정과 역할의 N:M 매핑
- 로그인 조회 시 계정에 부여된 역할(우선순위: PLATFORM_ADMIN > TENANT_ADMIN > TENANT_USER)을 결정하는 데 사용

### 2-9. tb_module

| 컬럼        | 타입      | 설명                      |
| ----------- | --------- | ------------------------- |
| module_id   | bigint    | 모듈 PK                   |
| tenant_id   | bigint    | 소속 테넌트               |
| module_code | varchar   | 모듈 코드(테넌트 내 유일) |
| module_nm   | varchar   | 모듈명                    |
| icon_nm     | varchar   | 아이콘명                  |
| module_url  | varchar   | 모듈 루트 경로            |
| sort_order  | int       | 정렬 순서                 |
| use_at      | char      | 사용 여부                 |
| created_at  | timestamp | 생성 일시                 |
| updated_at  | timestamp | 수정 일시                 |

역할:

- 대시보드 좌측 최상위 모듈(그룹웨어/환경설정 등) 정의
- 테넌트별로 별도 구성 가능

### 2-10. tb_menu

| 컬럼           | 타입      | 설명                               |
| -------------- | --------- | ---------------------------------- |
| menu_id        | bigint    | 메뉴 PK                            |
| tenant_id      | bigint    | 소속 테넌트                        |
| module_id      | bigint    | 소속 모듈 FK                       |
| parent_menu_id | bigint    | 상위 메뉴 FK(자기참조)             |
| menu_code      | varchar   | 메뉴 코드(테넌트 내 유일)          |
| menu_nm        | varchar   | 메뉴명                             |
| menu_dc        | varchar   | 메뉴 설명(페이지 헤더/설명 표시용) |
| menu_url       | varchar   | 라우팅 경로                        |
| icon_nm        | varchar   | 아이콘명                           |
| sort_order     | int       | 정렬 순서                          |
| use_at         | char      | 사용 여부                          |
| created_at     | timestamp | 생성 일시                          |
| updated_at     | timestamp | 수정 일시                          |

역할:

- 모듈 하위 메뉴 트리 구성(다단계, `parent_menu_id`로 자기참조)
- 메뉴명, 설명, 경로를 함께 관리해 실제 페이지 제목/설명과 대시보드 메뉴를 일관되게 표시
- `/api/v1/menus/my` 응답의 원천 데이터, `role_code` 기준 기본 권한 정책과 결합해 대시보드 좌측 메뉴 생성

### 2-11. tb_permission

| 컬럼            | 타입      | 설명                       |
| --------------- | --------- | -------------------------- |
| permission_id   | bigint    | 버튼/기능 권한 PK          |
| permission_code | varchar   | 전역 고유 권한 코드        |
| permission_nm   | varchar   | 권한 표시명                |
| sort_order      | int       | 메뉴 관리 화면의 표시 순서 |
| use_at          | char      | 활성 여부(Y/N)             |
| created_at      | timestamp | 생성 일시                  |
| updated_at      | timestamp | 수정 일시                  |

역할:

- 메뉴가 제공하는 버튼/기능 권한 마스터 관리
- 초기 권한: `READ`, `CREATE`, `UPDATE`, `DELETE`, `EXCEL`
- 권한 코드를 추가하면 메뉴 관리 화면이 활성 권한을 동적 열로 표시

### 2-12. tb_menu_permission

| 컬럼          | 타입      | 설명                                 |
| ------------- | --------- | ------------------------------------ |
| menu_id       | bigint    | 메뉴 FK, `tb_menu` 삭제 시 함께 삭제 |
| permission_id | bigint    | 버튼/기능 권한 FK                    |
| created_at    | timestamp | 생성 일시                            |
| updated_at    | timestamp | 수정 일시                            |

제약:

- 복합 PK: `(menu_id, permission_id)`
- 메뉴별 허용 가능한 기본 버튼/기능 권한만 저장하며, 역할별 선택 권한인 `tb_role_menu_permission`과 분리

역할:

- 리프 메뉴가 지원할 수 있는 권한 코드를 관리
- 역할 관리 화면에서 선택 가능한 기본 권한의 기준 제공

### 2-13. tb_role_menu_permission

| 컬럼          | 타입      | 설명              |
| ------------- | --------- | ----------------- |
| role_id       | bigint    | 역할 FK           |
| menu_id       | bigint    | 메뉴 FK           |
| permission_id | bigint    | 버튼/기능 권한 FK |
| created_at    | timestamp | 생성 일시         |
| updated_at    | timestamp | 수정 일시         |

제약:

- 복합 PK: `(role_id, menu_id, permission_id)`
- `tb_role(role_id)`, `tb_menu(menu_id)`, `tb_permission(permission_id)`를 모두 참조
- 역할별 실제 메뉴 활성화 여부 및 버튼 권한을 저장하는 실사용 매핑 테이블

역할:

- 선택된 역할(Role) 관점에서 어떤 메뉴를 노출할지와 어떤 버튼 권한을 활성화할지 저장
- 백엔드 `GET /api/v1/system/menus?moduleId={moduleId}&roleId={roleId}` 및 `PUT /api/v1/system/roles/{roleId}/menu-permissions`의 최종 저장소
- 대시보드 좌측 메뉴와 페이지 헤더 액션 버튼의 권한 계산이 이 테이블을 기준으로 동기화된다

### 2-14. tb_common_code_group

| 컬럼                 | 타입      | 설명                   |
| -------------------- | --------- | ---------------------- |
| common_code_group_id | bigint    | 공통코드 그룹 PK       |
| tenant_id            | bigint    | 소속 테넌트            |
| group_code           | varchar   | 그룹 코드              |
| group_nm             | varchar   | 그룹명                 |
| group_dc             | varchar   | 그룹 설명              |
| parent_group_id      | bigint    | 상위 그룹 FK(자기참조) |
| sort_order           | int       | 정렬 순서              |
| use_at               | char      | 사용 여부              |
| created_at           | timestamp | 생성 일시              |
| updated_at           | timestamp | 수정 일시              |
| created_by           | bigint    | 생성자                 |
| updated_by           | bigint    | 수정자                 |

역할:

- 공통코드 그룹 계층을 저장하는 기준 테이블
- 부모-자식 계층을 자기참조로 관리
- 공통코드 관리 화면의 그룹 트리 원천 데이터

### 2-15. tb_common_code_item

| 컬럼                | 타입      | 설명                       |
| ------------------- | --------- | -------------------------- |
| common_code_item_id | bigint    | 공통코드 상세 PK           |
| tenant_id           | bigint    | 소속 테넌트                |
| group_id            | bigint    | 그룹 FK                    |
| item_code           | varchar   | 상세코드                   |
| item_nm             | varchar   | 상세코드명                 |
| item_dc             | varchar   | 상세코드 설명              |
| parent_item_id      | bigint    | 상위 상세코드 FK(자기참조) |
| sort_order          | int       | 정렬 순서                  |
| use_at              | char      | 사용 여부                  |
| created_at          | timestamp | 생성 일시                  |
| updated_at          | timestamp | 수정 일시                  |
| created_by          | bigint    | 생성자                     |
| updated_by          | bigint    | 수정자                     |

역할:

- 그룹 하위 상세코드 데이터를 저장
- 자식 그룹의 상위코드 선택을 제한하는 기준 테이블
- F1Grid 상세 목록과 상위코드 선택 목록의 백엔드 원천 데이터

### 2-16. tb_common_file

| 컬럼             | 타입      | 설명                                                       |
| ---------------- | --------- | ---------------------------------------------------------- |
| file_id          | bigint    | 공통 첨부 파일 PK                                          |
| tenant_id        | bigint    | 소속 테넌트                                                |
| owner_type       | varchar   | 소유자 타입 (`NOTICE`, `BOARD`, `APPROVAL`, `FEED`)        |
| owner_id         | bigint    | 소유 객체 PK                                               |
| file_name        | varchar   | 원본 파일명                                                |
| file_path        | varchar   | 파일 경로/URL                                              |
| object_key       | varchar   | MinIO object key                                           |
| bucket_name      | varchar   | MinIO 버킷명                                               |
| storage_provider | varchar   | 저장소 타입 (`minio`)                                      |
| file_size        | bigint    | 파일 크기                                                  |
| mime_type        | varchar   | MIME 타입                                                  |
| checksum_sha256  | varchar   | 파일 SHA-256 해시                                          |
| content_type     | varchar   | 파일 content type                                          |
| file_usage_type  | varchar   | 파일 용도 (`ATTACHMENT` 일반 첨부, `EMBEDDED` 본문 이미지) |
| uploaded_by      | varchar   | 업로더 ID                                                  |
| deleted_yn       | char      | 삭제 여부 (`Y`/`N`)                                        |
| created_at       | timestamp | 생성 일시                                                  |
| updated_at       | timestamp | 수정 일시                                                  |

역할:

- 공통 첨부 파일 메타데이터를 저장하는 범용 테이블
- notice, board, approval, feed 등 여러 도메인이 동일한 첨부 API를 공유하도록 설계
- 실제 바이너리는 MinIO에 저장하고 DB에는 경로와 메타만 보관

### 2-17. tb_common_comment

| 컬럼                  | 타입      | 설명                                        |
| --------------------- | --------- | ------------------------------------------- |
| comment_id            | bigint    | 공통 댓글 PK                                |
| tenant_id             | bigint    | 소속 테넌트                                 |
| owner_type            | varchar   | 소유자 타입 (`NOTICE`, `BOARD`, `APPROVAL`) |
| owner_id              | bigint    | 소유 객체 PK                                |
| parent_comment_id     | bigint    | 상위 댓글 FK(대댓글)                        |
| content               | text      | 댓글 내용                                   |
| comment_type          | varchar   | 댓글 유형 (`USER`, `SYSTEM`), 기본값 `USER`  |
| event_type            | varchar   | SYSTEM 이벤트 코드(`APPROVED`, `REJECTED`, `RETURNED`, `DRAFT_SAVED`, `SUBMITTED`, `RESUBMITTED`, `COMPLETED`, `DELETED`, `SUBMISSION_CANCELED`, `APPROVAL_CANCELED`, `REFERENCE_CONFIRMED`), USER에서는 NULL |
| writer_id             | varchar   | 작성자 ID                                   |
| writer_name           | varchar   | 작성자 이름                                 |
| deleted_yn            | char      | 삭제 여부 (`Y`/`N`)                         |
| last_modified_by      | varchar   | 마지막 행위자 ID                            |
| last_modified_by_name | varchar   | 마지막 행위자 이름                          |
| created_at            | timestamp | 생성 일시                                   |
| updated_at            | timestamp | 수정 일시                                   |

역할:

- 댓글/답글을 범용적으로 보관하는 공통 테이블
- 도메인별 댓글이 서로 다른 API에 묶이지 않도록 `owner_type + owner_id` 기준으로 조회
- DB를 통해 공통 댓글 API의 목록/등록/수정/삭제를 영속화한다
- 현재 PostgreSQL MCP의 `chk_tb_common_comment_event_type`은 위의 SYSTEM 이벤트 11종과 USER의 NULL `event_type` 조건을 허용한다. 결재 처리 및 임시저장/취소/참조확인 메시지는 `owner_type='APPROVAL'`, `comment_type='SYSTEM'`으로 같은 타임라인에 표시하며 서비스/API에서 수정·삭제·답글·좋아요를 차단한다.
- `(tenant_id, comment_id)` unique 키는 댓글 좋아요의 tenant 일치 FK를 지원한다.

### 2-18. tb_board_type

| 컬럼             | 타입      | 설명                                            |
| ---------------- | --------- | ----------------------------------------------- |
| board_type_code  | varchar   | 게시판 유형 코드 (`NOTICE`, `BOARD`, `ARCHIVE`) |
| board_name       | varchar   | 게시판 이름                                     |
| menu_id          | bigint    | 커뮤니티 메뉴 FK                                |
| board_kind       | varchar   | 게시판 종류 (`notice`, `board`, `archive`)      |
| read_auth_level  | varchar   | 읽기 권한 레벨                                  |
| write_auth_level | varchar   | 쓰기 권한 레벨                                  |
| file_upload_yn   | char      | 첨부파일 업로드 허용 여부                       |
| use_yn           | char      | 사용 여부                                       |
| sort_order       | int       | 정렬 순서                                       |
| created_at       | timestamp | 생성 일시                                       |
| updated_at       | timestamp | 수정 일시                                       |

역할:

- 공지사항/게시판/자료실 유형을 통합 관리
- 게시글 API에서 `board_type_code`를 기준으로 조회 범위 분기

### 2-17. tb_board_post

| 컬럼                  | 타입      | 설명                         |
| --------------------- | --------- | ---------------------------- |
| post_id               | bigint    | 게시글 PK                    |
| tenant_id             | bigint    | 소속 테넌트 FK (필수)         |
| board_type_code       | varchar   | 게시판 유형 코드             |
| title                 | varchar   | 제목                         |
| contents              | text      | legacy 본문 호환용           |
| contents_html         | text      | 렌더링용 HTML 본문           |
| contents_json         | json      | Tiptap JSON 본문             |
| contents_text         | text      | 검색/요약용 평문             |
| writer_id             | varchar   | 작성자 ID                    |
| writer_name           | varchar   | 작성자 명                    |
| category_code         | varchar   | 게시판 종류별 공통 분류 코드 |
| view_count            | int       | 조회수                       |
| is_pinned             | char      | 상단 고정 여부 (`Y`/`N`)     |
| login_popup_yn        | char(1)   | 로그인 팝업 여부, 기본 N |
| popup_end_date        | date      | 팝업 종료일, 해당 한국 날짜까지 유효 |
| is_deleted            | char      | 삭제 여부 (`Y`/`N`)          |
| created_at            | timestamp | 생성 일시                    |
| updated_at            | timestamp | 수정 일시                    |
| last_modified_by      | varchar   | 마지막 수정자 ID             |
| last_modified_by_name | varchar   | 마지막 행위자 이름           |
| last_comment_count    | int       | 마지막 댓글 수               |

역할:

- 공지사항/게시판/자료실 게시글의 원본 데이터 저장
- 목록/상세 조회와 삭제 처리의 기본 테이블
- `tenant_id`는 `tb_tenant.tenant_id`를 참조하며, tenant + 게시판 종류 + 최신 등록순 인덱스로 목록 조회를 지원
- `category_code`는 NOTICE의 `NOTICE_GUBUN`, ARCHIVE의 `WF_ARCHIVE_CATEGORY` tenant별 활성 항목으로 서비스에서 검증
- `login_popup_yn`은 `Y/N` CHECK를 가지며 `Y`이면 `popup_end_date`가 필수다. 현재 MCP에서 컬럼과 CHECK 제약을 확인했다.
- 첨부 메타데이터는 공유 테이블 `tb_common_file`을 사용한다. `tb_board_file`은 현재 public 스키마에 존재하지 않는다.

### tb_notice_popup_dismissal (현재 public 스키마 확인)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| tenant_id | bigint | tenant FK, 복합 PK |
| post_id | bigint | 공지 FK, 복합 PK, 삭제 시 cascade |
| login_id | bigint | 로그인 FK, 복합 PK, 삭제 시 cascade |
| dismissed_on | date | Asia/Seoul 기준 마지막 하루 숨김 날짜 |

제약:

- 복합 PK: `(tenant_id, post_id, login_id)`
- `tenant_id`는 `tb_tenant`, `post_id`는 `tb_board_post`, `login_id`는 `tb_login_account`를 참조한다.
- 게시글 또는 로그인 계정 삭제 시 해당 닫기 이력은 cascade 삭제된다.
- 현재 MCP에서 테이블 및 제약 메타데이터를 확인했다. DDL 이력은 `20261022_004_notice_login_popup.sql`에 있다.

기존 최초 조회수 이력과 별개이며 과거 숨김 일자는 다음 날짜 팝업 노출을 막지 않는다.

### 2-19. tb_board_post_view_history

| 컬럼            | 타입      | 설명           |
| --------------- | --------- | -------------- |
| view_history_id | bigserial | 조회 이력 PK   |
| tenant_id       | bigint    | 테넌트 FK      |
| post_id         | bigint    | 게시글 FK      |
| login_id        | bigint    | 로그인 계정 FK |
| viewed_at       | timestamp | 최초 조회 일시 |

제약:

- 복합 유니크: `(tenant_id, post_id, login_id)`
- `tb_tenant`, `tb_board_post`, `tb_login_account`를 참조

역할:

- 인증 사용자별 공지사항 최초 조회를 기록
- 동일 사용자의 반복·동시 조회로 인한 조회수 중복 증가 방지

### 2-20. tb_drafting_work_category_group

| 컬럼                            | 타입        | 설명                   |
| ------------------------------- | ----------- | ---------------------- |
| drafting_work_category_group_id | bigserial   | 분류 그룹 PK           |
| tenant_id                       | bigint      | 소속 테넌트 FK         |
| cata_code                       | varchar(3)  | 분류 그룹 코드         |
| cata_name                       | varchar(20) | 분류 그룹명            |
| view_seq                        | integer     | 표시 순서              |
| use_at                          | char(1)     | 사용 여부 (`Y`/`N`)    |
| delete_status                   | varchar     | 삭제 상태              |
| created_by / updated_by         | bigint      | 생성/수정 로그인 ID FK |
| created_at / updated_at         | timestamp   | 생성/수정 시각         |

제약/역할:

- `tb_tenant`, `tb_login_account` 참조, 테넌트별 `cata_code` unique
- HACCP 원본 호환용 분류 그룹 테이블. 신규 화면의 분류 옵션은 공통코드 `WF_FORM_CATEGORY`에서 조회

### 2-21. tb_drafting_work_category

| 컬럼                            | 타입         | 설명                                |
| ------------------------------- | ------------ | ----------------------------------- |
| drafting_work_category_id       | bigserial    | 기안양식 기준정보 PK                |
| tenant_id                       | bigint       | 소속 테넌트 FK                      |
| drafting_work_category_group_id | bigint       | 원본 분류 그룹 FK                   |
| category_item_id                | bigint       | 분류 공통코드 항목 ID FK (추가)     |
| cata_type_code                  | varchar(3)   | 양식 구분코드                       |
| code_name                       | varchar(50)  | 양식명                              |
| view_seq                        | integer      | 표시 순서                           |
| type_cnt                        | text         | 원본 업무 텍스트                    |
| reviewer_id / approver_id       | bigint       | 검토/승인 로그인 ID FK              |
| user_type                       | varchar(10)  | 원본 사용자 유형                    |
| haccp_cp_status                 | varchar(10)  | 원본 HACCP 상태                     |
| reg_term                        | varchar(6)   | 등록주기 표시명 호환 컬럼           |
| reg_term_id                     | bigint       | 등록주기 공통코드 항목 ID FK (추가) |
| drafting_work_template_json     | jsonb        | 문서 템플릿 JSON                    |
| drafting_work_template_html     | text         | 문서 템플릿 HTML                    |
| duty_charge_code                | varchar(10)  | 원본 담당 코드                      |
| cata_code                       | varchar(3)   | 원본 분류코드 호환 컬럼             |
| use_at / delete_status          | char/varchar | 사용/삭제 상태                      |
| created_by / updated_by         | bigint       | 생성/수정 로그인 ID FK              |
| created_at / updated_at         | timestamp    | 생성/수정 시각                      |

제약/역할:

- `tb_tenant`, 원본 분류 그룹, `tb_common_code_item`, reviewer/approver 및 감사 사용자 참조
- `category_item_id`는 `WF_FORM_CATEGORY`, `reg_term_id`는 `WF_FORM_CYCLE` 그룹 항목을 서비스에서 검증
- `code_name`은 양식명이다. `reg_term`은 `reg_term_id`가 가리키는 항목명과 동기화
- `cata_type_code`는 `EgovConfigAppIdGen.codeIdGnrService`의 `tb_drafting_work_category` 3자리 설정으로 생성
- 현재 MCP에서 확인한 인덱스는 tenant/group/reviewer/approver/type/use/category/reg-term 조회용 인덱스다. `delete_status` 조건의 `(tenant_id, cata_type_code)` 부분 unique index는 현재 스키마 메타데이터에 없다.

### 2-22. tb_drafting_work_category_authority

| 컬럼                                | 타입         | 설명                   |
| ----------------------------------- | ------------ | ---------------------- |
| drafting_work_category_authority_id | bigserial    | 담당자 매핑 PK         |
| tenant_id                           | bigint       | 소속 테넌트 FK         |
| drafting_work_category_id           | bigint       | 기안양식 FK            |
| cata_type_code                      | varchar(3)   | 원본 양식 구분코드     |
| employee_no                         | varchar(10)  | 담당 사용자 식별값     |
| use_at / delete_status              | char/varchar | 사용/삭제 상태         |
| created_by / updated_by             | bigint       | 생성/수정 로그인 ID FK |
| created_at / updated_at             | timestamp    | 생성/수정 시각         |

제약/역할:

- `tb_tenant`, `tb_drafting_work_category`, `tb_login_account`를 참조
- `(tenant_id, drafting_work_category_id, employee_no)` unique
- 양식 담당자 매핑을 보존하는 HACCP 원본 테이블

### 2-23. tb_id_sequence

| 컬럼              | 타입      | 설명                 |
| ----------------- | --------- | -------------------- |
| generator_key     | varchar   | 발번 목적 키         |
| scope_key_1       | varchar   | 첫 번째 발번 범위 키 |
| scope_key_2       | varchar   | 두 번째 발번 범위 키 |
| last_issued_value | bigint    | 마지막 발급 숫자     |
| created_at        | timestamp | 생성 일시            |
| updated_at        | timestamp | 갱신 일시            |

제약/역할:

- `(generator_key, scope_key_1, scope_key_2)` 복합 PK로 조건별 발번 카운터를 분리
- `tenant_id` 없이 범위 키로 카운터를 구분
- 공통코드 상세코드는 그룹 ID를 `scope_key_1`로 사용하며, 기존 숫자 코드의 그룹별 최댓값을 초기값으로 사용
- `last_issued_value`는 0 이상

### 2-24. tb_electronic_approval_main

| 컬럼 | 타입 | 설명 |
|---|---|---|
| electronic_approval_id | bigserial | 결재 문서 PK |
| tenant_id | bigint | 소속 테넌트 FK |
| drafting_work_category_id | bigint | 선택 작성 양식 FK, 선택값 |
| document_type | varchar(40) | 문서 유형 코드 |
| document_no | varchar(40) | 사용자용 문서번호 (`EA-YYYYMMDD-NNNN`), tenant별 유일 |
| eabus_no | varchar(3) | 문서 유형별 번호 코드 (`DRAFTING=001`, `BUSINESS_CONTACT=008`, `EXPENSE_RESOLUTION=004`, `ATTENDANCE_APPLICATION=031`) |
| document_status | varchar(30) | 문서 상태 코드 |
| title | varchar(300) | 문서 제목 |
| contents_json | jsonb | Tiptap JSON 본문 |
| contents_html | text | 화면 렌더링/양식 호환 HTML |
| contents_text | text | 검색/요약용 평문 |
| drafter_id / updated_by | varchar(100) | 작성자/마지막 갱신 사용자 키 |
| drafter_name | varchar(150) | 작성자 이름 스냅샷 |
| drafter_department_name | varchar(150) | 작성 당시 부서명 |
| created_at / updated_at / submitted_at | timestamp | 생성/수정/최초 상신 시각 |
| deleted_yn | varchar(1) | 문서 논리 삭제 여부 (`N` 기본값, `Y` 삭제) |
| view_count | integer | 인증 사용자별 최초 상세 조회 누적 수 (`0` 이상) |

제약/역할:

- tenant와 기존 `tb_drafting_work_category` 양식을 참조한다. 양식의 tenant 일치는 서비스에서 검증한다.
- `(tenant_id, electronic_approval_id)` 복합 unique 키로 결재선의 tenant 일치를 강제한다.
- `(tenant_id, document_no)` unique로 tenant별 문서번호 중복을 방지한다. `ELECTRONIC_APPROVAL_NO`는 기존 `tb_id_sequence`에서 tenant/발급일별로 관리한다.
- `document_type`: `DRAFTING`, `BUSINESS_CONTACT`, `EXPENSE_RESOLUTION`, `ATTENDANCE_APPLICATION`
- `document_status`: `DRAFT`, `PENDING`, `IN_PROGRESS`, `REVISION_REQUESTED`, `COMPLETED`, `REJECTED`
- 현재 MCP에서 `eabus_no` NOT NULL 및 문서 유형별 일치 CHECK, `deleted_yn`의 Y/N CHECK, `view_count >= 0` CHECK를 확인했다.
- `view_count`는 인증 사용자가 상세 문서를 최초 조회할 때만 증가하며, 사용자별 중복 방지는 `tb_electronic_approval_view_history`에서 관리한다.
- 본문 원본은 문서작성 편집기의 JSON이며 HTML/평문은 렌더링/검색을 위한 파생 표현이다.

### 2-25. tb_electronic_approval_line_info

| 컬럼 | 타입 | 설명 |
|---|---|---|
| electronic_approval_line_id | bigserial | 결재선 행 PK |
| tenant_id / electronic_approval_id | bigint | tenant 및 결재 문서 복합 FK |
| stage_order / participant_order | integer | 결재 단계 및 단계 내 순서(1부터) |
| participant_type | varchar(20) | 참여 유형 (`APPROVAL`, `AGREEMENT`, `REFERENCE`) |
| participant_user_id | varchar(100) | 작성 화면에서 선택한 사용자 키 |
| participant_name | varchar(150) | 참여자 이름 스냅샷 |
| participant_department_name | varchar(150) | 참여자 부서명 스냅샷 |
| action_status | varchar(20) | 처리 상태; 참조 행은 미확인 NULL, 확인 완료 `CONFIRMED` |
| pending_at | timestamp | 해당 결재 단계가 활성화된 시각; 대기 전·참조 행은 NULL |
| action_at | timestamp | 결재 처리 또는 참조 확인 시각 |
| action_comment | text | 결재 처리 의견; 참조 행은 NULL |
| created_at | timestamp | 생성 시각 |

제약/역할:

- 결재 본문과 `(tenant_id, electronic_approval_id)` FK로 연결되며 본문 삭제 시 결재선은 cascade 삭제된다.
- 단계/참여자 순서와 문서 내 참여자 중복을 unique로 제한한다.
- `action_status`: 결재/합의 `WAITING`, `PENDING`, `APPROVED`, `REJECTED`, `RETURNED`; 참조 `CONFIRMED`
- 현재 MCP에서 `PENDING` 행은 `pending_at` 필수, `WAITING` 및 `REFERENCE` 행은 NULL인 검사 제약을 확인했다.
- `REFERENCE` 미확인 행은 처리 필드가 모두 NULL이다. 확인 완료 행은 `action_status='CONFIRMED'`, `action_at` NOT NULL이며 `pending_at`, `action_comment`는 NULL이다.
- 승인/반려/보완요청 처리의 구조화된 값이 원본이며 공통 댓글 SYSTEM 행은 화면 타임라인 표시용이다.
- 참조 확인은 참조 행별 `CONFIRMED`/`action_at`에 저장하고 SYSTEM 이벤트 `REFERENCE_CONFIRMED`를 타임라인에 추가한다.

### 2-26. tb_common_comment_like

| 컬럼 | 타입 | 설명 |
|---|---|---|
| comment_like_id | bigserial | 댓글 좋아요 PK |
| tenant_id | bigint | 소속 테넌트 FK |
| comment_id | bigint | 공통 댓글 FK |
| user_id | varchar(100) | 인증된 사용자 키 |
| created_at | timestamp | 좋아요 생성 시각 |

제약/역할:

- `(tenant_id, comment_id, user_id)` unique로 사용자별 중복 좋아요를 방지한다.
- `(tenant_id, comment_id)` 복합 FK로 다른 tenant의 댓글을 참조할 수 없다.
- unlike는 본인이 소유한 관계 행을 삭제한다. 좋아요 수는 관계 행을 집계한다.
- SYSTEM 댓글 좋아요는 서비스/API에서 거부한다.

### 2-27. tb_electronic_approval_line_template

| 컬럼 | 타입 | 설명 |
|---|---|---|
| template_id | bigserial | 사용자 결재선 템플릿 PK |
| tenant_id | bigint | 소속 tenant FK |
| owner_user_id | varchar(100) | 인증된 템플릿 소유 사용자 ID |
| eabus_no | varchar(3) | 문서번호 코드 (`001`, `008`, `004`, `031`) |
| template_name | varchar(100) | 사용자별 템플릿 이름 |
| created_at / updated_at | timestamp | 생성/수정 시각 |

제약/역할:

- `(tenant_id, owner_user_id, eabus_no, template_name)` unique로 같은 사용자의 같은 문서 종류에서 이름 중복을 방지한다.
- tenant FK 및 `(tenant_id, template_id)` unique 키로 템플릿 상세의 tenant 일치를 강제한다.
- 지원 문서 코드는 기안 `001`, 업무 `008`, 지출 `004`, 근태 `031`이다.
- 사용자 소유권은 API에서 인증 `LoginVO`의 tenant 및 사용자 ID로 제한한다.
- 현재 PostgreSQL MCP에서 해당 테이블, 제약 및 인덱스를 확인했다.

### 2-28. tb_electronic_approval_line_template_info

| 컬럼 | 타입 | 설명 |
|---|---|---|
| template_line_id | bigserial | 템플릿 참여자 행 PK |
| tenant_id / template_id | bigint | 템플릿 마스터 복합 FK |
| stage_order / participant_order | integer | 단계 및 단계 내 참여 순서(1부터) |
| participant_type | varchar(20) | `APPROVAL`, `AGREEMENT`, `REFERENCE` |
| participant_user_id | varchar(100) | 참여자 사용자 ID |

제약/역할:

- `(tenant_id, template_id)` 복합 FK로 동일 tenant 템플릿을 참조하고 마스터 삭제 시 상세를 cascade 삭제한다.
- `(tenant_id, template_id, stage_order, participant_order)` unique 및 양수 CHECK로 참여자 순서를 보호한다.
- 템플릿 내 participant user ID는 중복될 수 없다.
- 참여자 활성/tenant 검증은 템플릿 저장 및 불러오기 서비스에서 수행한다.
- 기안자 고정 단계는 상세에 저장하지 않으며 참조자는 결재/합의 단계 뒤에 정렬한다.
- 현재 PostgreSQL MCP에서 해당 테이블, 제약 및 인덱스를 확인했다.

### 2-29. tb_electronic_approval_view_history

| 컬럼 | 타입 | 설명 |
|---|---|---|
| view_history_id | bigserial | 조회 이력 PK |
| tenant_id | bigint | 소속 테넌트 FK |
| electronic_approval_id | bigint | 전자결재 문서 FK |
| login_id | bigint | 로그인 계정 FK |
| viewed_at | timestamp | 최초 상세 조회 시각 |

제약/역할:

- `(tenant_id, electronic_approval_id, login_id)` unique로 사용자별 문서 최초 조회만 기록한다.
- `(tenant_id, electronic_approval_id)` 복합 FK로 동일 tenant의 문서를 참조하며 문서 삭제 시 이력을 cascade 삭제한다.
- 상세 조회수 컬럼은 `tb_electronic_approval_main.view_count`에 저장한다.
- 현재 PostgreSQL MCP에서 해당 테이블, 제약 및 인덱스를 확인했다.

---

### 2-30. tb_electronic_approval_pin

| 컬럼 | 타입 | 설명 |
|---|---|---|
| tenant_id | bigint | 소속 tenant FK |
| user_id | bigint | 고정한 사용자 FK |
| electronic_approval_id | bigint | 고정한 전자결재 문서 FK |
| created_at | timestamp | 고정 생성 시각 |

제약/역할:

- `(tenant_id, user_id, electronic_approval_id)` 복합 PK로 사용자별 중복 고정을 차단한다. PK 인덱스의 `(tenant_id, user_id)` 선두 컬럼은 현재 사용자의 전체 고정 목록 조회를 지원한다.
- `tenant_id`와 `user_id`는 각각 `tb_tenant`와 `tb_user`를 참조하며, `(tenant_id, electronic_approval_id)` 복합 FK는 동일 tenant의 문서를 참조한다.
- 문서·사용자 또는 tenant가 실제 삭제되면 해당 pin 관계도 cascade 삭제한다.
- `idx_electronic_approval_pin_document`는 문서 FK 조회를 지원한다.
- 현재 PostgreSQL MCP에서 해당 테이블, FK 및 인덱스를 확인했다. 생성 이력은 [backend/DATABASE/20261020](../../backend/DATABASE/20261020) 및 [docs/database/20261020](20261020)에서 확인할 수 있다.

---

### tb_customer_info (MCP 확인: 2026-10-22)

| 컬럼 | 타입 | NULL | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| customer_id | bigint | 불가 | `nextval('tb_customer_info_customer_id_seq')` | 거래처 PK |
| tenant_id | bigint | 불가 | 없음 | 소속 tenant |
| customer_code | varchar | 불가 | 없음 | 거래처 코드 |
| customer_name | varchar | 불가 | 없음 | 거래처명 |
| cust_name_abbr | varchar | 가능 | 없음 | 거래처 약칭 |
| president_name | varchar | 가능 | 없음 | 대표자명 |
| business_no | varchar | 가능 | 없음 | 사업자등록번호 |
| jurid_no | varchar | 가능 | 없음 | 법인등록번호 |
| business_status_1 | varchar | 가능 | 없음 | 업태 |
| business_item_1 | varchar | 가능 | 없음 | 종목 |
| post_code | varchar | 가능 | 없음 | 우편번호 |
| address | varchar | 가능 | 없음 | 주소 |
| telephone_no | varchar | 가능 | 없음 | 전화번호 |
| facsimile_no | varchar | 가능 | 없음 | 팩스번호 |
| cust_memo | varchar | 가능 | `''` | 메모 |
| use_at | char(1) | 불가 | `'Y'` | 사용 여부 (`Y`/`N`) |
| created_by | bigint | 가능 | 없음 | 생성 사용자 ID |
| created_at | timestamp without time zone | 불가 | `CURRENT_TIMESTAMP` | 생성 일시 |
| updated_by | bigint | 가능 | 없음 | 최종 수정 사용자 ID |
| updated_at | timestamp without time zone | 불가 | `CURRENT_TIMESTAMP` | 최종 수정 일시 |

제약 및 관계:

- `tb_customer_info_pkey`: `PRIMARY KEY (customer_id)`
- `uq_customer_id_tenant_id`: `UNIQUE (customer_id, tenant_id)`
- `uq_tb_customer_info_tenant_code`: `UNIQUE (tenant_id, customer_code)`
- `tb_customer_info_tenant_id_fkey`: `tenant_id`가 `tb_tenant(tenant_id)`를 참조하며 tenant 삭제 시 cascade 된다.
- `tb_customer_info_use_at_check`: `use_at`은 `Y` 또는 `N`만 허용한다.

`tb_customer_info_customer_id_seq`는 기존 customer ID 기본값이며 그대로 유지한다. 거래처 코드는 기존 전자정부 ID Generator의 `public.ids` 카운터 중 `table_name = 'tb_customer_info'` 행을 사용한다. `20261022_005` migration은 기존 1~6자리 숫자 거래처 코드의 최댓값보다 큰 `next_id`를 설정하고, 기존 카운터가 더 크면 그 값을 보존한다. 앱의 `customerCodeIdGnrService`는 `IDS` 테이블/`tb_customer_info` 키, 6자리 zero-padding, block size 1을 사용한다. 신규 테이블이나 시퀀스는 만들지 않는다. migration은 작성 완료 상태이며 실제 DB에는 적용하지 않았다. 상세 스크립트는 [backend/DATABASE/20261022](../../backend/DATABASE/20261022) 및 [docs/database/20261022](20261022) 참고.

#### 거래처명 고유성 추가 (2026-10-23, 적용 예정)

- `20261023_001`은 `uq_tb_customer_info_tenant_name` unique index on `(tenant_id, btrim(customer_name))`를 정의한다. 사용/미사용을 모두 포함하고 대소문자는 구분한다. 기존 NULL 허용 계약은 바꾸지 않으며 저장 API의 이름 필수 검사를 유지한다.
- 기본 DB `s-erp-postgresql-readonly`의 테이블/컬럼/인덱스 metadata 확인 결과 이름 unique index는 없고 코드 unique index는 `uq_tb_customer_info_factory_customer_code`였다. 이 DB의 `customer_name`은 nullable이다. 위 2026-10-22 tenant 전용 DB 정보와 구분하며 현재 DB 계약을 동일하다고 간주하지 않는다.
- 실제 DB 미적용. 현재 이름 중복 데이터 유무는 업무 행을 조회하지 않아 미확인이다. 중복이 있으면 migration은 명시적 오류로 중단하고 데이터는 자동 변경하지 않는다.
- [변경 이력 및 배포/롤백 절차](20261023/20261023_001_change_customer_name_unique.md), [backend 사본](../../backend/DATABASE/20261023) 참고.

### 2026-10-23 사업자번호 고유 인덱스 추가 계획 (미적용)

- `20261023_002`는 `uq_tb_customer_info_tenant_business_no` on `(tenant_id, regexp_replace(business_no, '[^0-9]', '', 'g'))`를 정의한다. 같은 tenant의 사용/미사용 번호를 숫자로 비교하고 앞자리 0을 유지한다.
- 숫자 정규화 결과가 빈 문자열인 행과 NULL은 부분 인덱스에서 제외한다. 기존 nullable 계약과 저장 표기는 바꾸지 않는다.
- 기본 DB MCP metadata에서 사업자번호 고유 인덱스가 없는 것을 확인했다. 업무 행은 조회하지 않아 현재 중복 여부는 미확인이다. migration은 잠금 후 기존 중복이 있으면 데이터 변경 없이 중단한다.
- 실제 DB에 적용하지 않았다. 인덱스 적용 전에는 서버 사전 조회만으로 동시 중복을 완전히 방어할 수 없다.
- [변경 이력 및 배포/롤백 절차](20261023/20261023_002_change_customer_business_no_unique.md), [backend 사본](../../backend/DATABASE/20261023) 참고.

### tb_material_info (MCP 확인: 2026-10-22)

기존 테이블을 변경하지 않고 품목관리 API를 연결한다. 다음은 지정 tenant MCP의 컬럼·주석·제약 메타데이터 확인 결과이며 업무 데이터 행은 조회하지 않았다.

테이블이 없는 신규 환경용 [생성 SQL](20261022/20261022_010_create_material_schema.sql)을 추가했다. `public.tb_tenant` 준비 후 생성 SQL을 실행하고, 기존 `public.ids`가 준비된 상태에서 [채번 초기화 SQL](20261022/20261022_010_material_code_id_generator.sql)을 적용한다. 이미 테이블이 있는 환경에서는 생성 SQL을 실행하지 않는다. [생성 롤백](20261022/20261022_010_rollback_material_schema.sql)은 신규 생성한 빈 테이블만 삭제하며 데이터가 있거나 외부 의존 객체가 있으면 실패한다. IDS 카운터는 보존한다. 실제 DB에 실행하지 않았다.

| 컬럼 | 타입 | NULL/기본값 | 설명 |
| --- | --- | --- | --- |
| material_id | bigint | NOT NULL, 기본 sequence | PK |
| tenant_id | bigint | NOT NULL | tb_tenant FK |
| material_code | varchar(20) | NOT NULL | tenant 내 유일한 품목코드 |
| material_name | varchar(200) | NOT NULL | 품목명 |
| material_eng_name, material_model_name | varchar(200) | NULL | 영문명/모델명 |
| material_spec, material_spec2 | varchar(100) | NULL | 규격/규격2 |
| material_weight | bigint | NULL | 중량 |
| unit, material_quality | varchar(6) | NULL | 단위/재질 |
| material_type_code | varchar(14) | NOT NULL | 품목계정코드 |
| customer_code | varchar(10) | NULL | 제조사 코드 |
| safe_invoice | double precision | NULL | 안전재고(기존 컬럼명 유지) |
| accounting_code | varchar(7) | NULL | 회계코드 |
| warehouse_code, drawing | varchar(10) | NULL | 창고코드/도면번호 |
| etc, manufactory | varchar(100) | NULL | 비고/제조 |
| part_no | varchar(30) | NULL | Part No |
| deleted_at | timestamp | NULL | 삭제일시 |
| mat_cata_type | varchar(10) | NOT NULL, 빈 문자열 | 품목분류 |
| location | varchar(1000) | NULL | 위치정보 |
| item_type | varchar(10) | NULL | 품목계정 |
| search_item_name | varchar(200) | NULL | 통합검색명칭 |
| item_barcode, material_no, kfda_report_no | varchar(20) | NULL | 바코드/품목번호/품목보고번호 |
| delete_status | varchar(10) | NOT NULL, N | 삭제여부 |
| created_by, updated_by | varchar(10) | NULL | 감사 사용자 ID 문자열 |
| created_at, updated_at | timestamp | NULL | 감사 시각 |
| material_kind, store_method | varchar(50) | NULL | MATERIAL_TYPE/STORE_METHOD 공통코드 |
| expiryed_status | varchar(10) | NOT NULL, NONE | NONE/DAY/MONTH/YEAR CHECK |
| expiryed_count | integer | NULL | NULL 또는 양수 CHECK |

- 추가 CHECK `ck_tb_material_info_expiryed_pair`: `NONE`이면 `expiryed_count IS NULL`, `DAY`/`MONTH`/`YEAR`이면 양수여야 한다. 기존 기준/숫자 CHECK를 보완한다. [변경 이력과 적용/롤백 SQL](20261023/20261023_004_change_material_expiry_count.md)은 작성했으며 실제 DB에는 적용하지 않았다.
- PK: `material_id`; unique: `(material_id, tenant_id)`, `(tenant_id, material_code)`; FK: `tenant_id → tb_tenant`.
- 별도 B-tree 인덱스: `ix_tb_material_info_material_name (material_name)`, `ix_tb_material_info_tenant_id (tenant_id)`. 기본 시퀀스는 BIGSERIAL 소유 `tb_material_info_material_id_seq`다.
- 조회/수정은 인증 tenant 및 `delete_status = 'N' AND deleted_at IS NULL` 조건으로 제한한다. 코드 중복 검사는 삭제 행을 포함한다.
- 품목코드는 `materialCodeIdGnrService`의 기존 IDS/`tb_material_info` 키, 6자리, block size 1을 사용한다. `20261022_010`은 기존 1~6자리 숫자 품목코드 최댓값 다음 값으로 카운터를 초기화하며 더 높은 카운터를 유지한다. SQL은 작성만 했으며 현재 DB에 적용하지 않았다.

### ids (전자정부 ID Generator 관리 테이블)

| 컬럼 | 타입 | NULL | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| table_name | varchar | 불가 | 없음 | 전자정부 ID Generator의 테이블 키 |
| next_id | bigint | 불가 | `1` | 다음 발급 값 |
| created_at | timestamp without time zone | 불가 | `CURRENT_TIMESTAMP` | 생성 일시 |
| updated_at | timestamp without time zone | 불가 | `CURRENT_TIMESTAMP` | 갱신 일시 |

- MCP에서 확인한 PK는 `ids_pkey (table_name)`이다.
- eGov generator가 신규 키를 최초 요청에서 바로 생성하면 `0`을 반환하므로, 거래처 자동 코드는 migration에서 기존 코드 최댓값을 기준으로 미리 초기화한다.
- 테이블과 스키마는 기존 것을 사용하며 거래처/품목별 generator row만 추가/상향한다.

### tb_sales_order_hd / tb_sales_order_dt

`20261026_008` 생성 DDL을 기준으로 한다. 2026-10-28 기본 MCP 메타데이터에서 두 테이블의 존재와 컬럼을 확인했다.
아래 audit 타입은 `20261028_009` 변경 후 계약이며, 조회 당시 실제 DB의 `created_by`, `updated_by`는 아직 `varchar(10)`이다.
이번 확장 SQL은 실제 DB에 적용하지 않았다.

| 테이블 | 컬럼 | 타입 | NULL/기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `tb_sales_order_hd` | `sales_order_id` | `bigserial` | NOT NULL | 헤더 PK |
|  | `tenant_id` | `bigint` | NOT NULL | tenant FK |
|  | `order_no` | `varchar(30)` | NOT NULL | tenant별 고유 수주번호 |
|  | `order_dt` | `date` | NOT NULL | 수주일자 |
|  | `customer_id` | `bigint` | NOT NULL | 거래처 FK |
|  | `quot_no` | `varchar(30)` | NULL | 견적번호; 현 DB에 견적 테이블이 없어 FK 없음 |
|  | `delivery_dt` | `date` | NULL | 헤더 납기일자 |
|  | `delivery_place` | `varchar(200)` | NULL | 납품장소 |
|  | `delivery_method` | `varchar(50)` | NULL | 배송방법 |
|  | `status` | `varchar(20)` | NOT NULL, `수주등록` | 수주상태 |
|  | `total_amt` | `numeric(15,2)` | NULL, `0` | 수주 총금액 |
|  | `remark` | `varchar(500)` | NULL | 비고 |
|  | `use_at` | `char(1)` | NOT NULL, `Y` | 사용 여부 (`Y`/`N`) |
|  | `created_by`, `updated_by` | `varchar(100)` (변경 적용 후) | NULL | 생성/수정 로그인 코드; 원본 `tb_login_account.login_code`와 길이 일치 |
|  | `created_at` | `timestamp without time zone` | NOT NULL, `CURRENT_TIMESTAMP` | 생성 일시 |
|  | `updated_at` | `timestamp without time zone` | NULL | 수정 일시 |
| `tb_sales_order_dt` | `sales_order_detail_id` | `bigserial` | NOT NULL | 상세 PK |
|  | `sales_order_id` | `bigint` | NOT NULL | 헤더 FK |
|  | `tenant_id` | `bigint` | NOT NULL | 헤더와 동일 tenant인지 복합 FK로 보장 |
|  | `line_no` | `int` | NOT NULL | 수주 라인 번호 |
|  | `material_id` | `bigint` | NOT NULL | 품목 FK |
|  | `order_qty`, `unit_price`, `supply_amt`, `vat_amt`, `total_amt`, `shipped_qty` | `numeric(15,2)` | 주문/금액 NOT NULL, VAT/출하수량 NULL 기본 `0` | 수량 및 금액 |
|  | `delivery_dt` | `date` | NULL | 라인 납기일자 |
|  | `line_status` | `varchar(20)` | NULL, `대기` | 라인 상태 |

- 헤더는 `sales_order_id` 단일 PK이며 `(tenant_id, order_no)`를 unique로 제한한다. 상세도 독립된 `sales_order_detail_id` PK를 사용하고 `(sales_order_id, line_no)`를 unique로 제한한다.
- 거래처와 품목 FK는 각각 `(customer_id, tenant_id)` 및 `(material_id, tenant_id)`이며, 상세-헤더 FK `(sales_order_id, tenant_id)`가 tenant 경계를 보장한다. 헤더 삭제 시 상세는 cascade 삭제된다.
- 수주상태 허용값은 `수주등록`, `생산대기`, `생산중`, `출하완료`, `취소`이며 `use_at`은 `Y`/`N`이다.
- [생성 SQL](20261026/20261026_008_create_sales_order_schema.sql), [롤백 SQL](20261026/20261026_008_rollback_sales_order_schema.sql), [변경 이력](20261026/20261026_008_change_sales_order_schema.md) 및 [backend 사본](../../backend/DATABASE/20261026) 참고.
- 감사 사용자 길이 보정: [확장 SQL](20261028/20261028_009_expand_sales_order_audit_columns.sql), [안전 롤백](20261028/20261028_009_rollback_sales_order_audit_columns.sql), [변경 이력](20261028/20261028_009_change_sales_order_audit_columns.md). 신규 환경에서도 기존 생성 DDL 후 확장 SQL을 적용한다.

### 품목·거래처 분류 스키마 (DDL 초안, 미적용)

`20261027_002` 설계 초안이며 현재 central DB에 적용되지 않았다. 실제 현행 스키마로 오인하지 않도록 아래 정의는 제안 상태로만 기록한다.

| 테이블/컬럼 | 타입 | NULL/기본값 | 제안 의미 |
| --- | --- | --- | --- |
| `tb_cls_item.item_cls_id` | `bigserial` | NOT NULL | 품목분류 내부 PK |
| `tb_cls_item.tenant_id` | `bigint` | NOT NULL | 분류 소유 tenant |
| `tb_cls_item.item_cls_nm` | `varchar(50)` | NOT NULL | 품목분류명 |
| `tb_cls_item.item_cls_lvl` | `smallint` | NOT NULL | 대/중/소 레벨 1~3 |
| `tb_cls_item.upper_item_cls_id` | `bigint` | NULL | 같은 tenant 상위 분류 ID |
| `tb_cls_item.sort_seq`, `use_at` | `int`, `char(1)` | `0`, `Y` | 정렬순서 및 사용여부 |
| `tb_cls_partner.partner_cls_id` | `bigserial` | NOT NULL | 거래처분류 내부 PK |
| `tb_cls_partner.tenant_id` | `bigint` | NOT NULL | 분류 소유 tenant |
| `tb_cls_partner.partner_cls_nm` | `varchar(50)` | NOT NULL | 거래처분류명 |
| `tb_cls_partner.partner_cls_lvl` | `smallint` | NOT NULL | 대/소 레벨 1~2 |
| `tb_cls_partner.upper_partner_cls_id` | `bigint` | NULL | 같은 tenant 상위 분류 ID |
| `tb_cls_partner.sort_seq`, `use_at` | `int`, `char(1)` | `0`, `Y` | 정렬순서 및 사용여부 |
| 두 분류 테이블 감사 컬럼 | `varchar(10)`, `timestamp` | created_at은 current timestamp | created_by/created_at/updated_by/updated_at |
| `tb_material_info.item_cls_id` | `bigint` | NULL | 품목 소분류 내부 ID, tenant 복합 FK |
| `tb_customer_info.business_kind1` | `bigint` | NULL | 기존 central 컬럼을 전환할 거래처 대분류 ID |
| `tb_customer_info.business_kind2` | `bigint` | NULL | 기존 central 컬럼을 전환할 거래처 소분류 ID |

- 분류 ID와 tenant 복합 unique/FK로 parent 및 마스터 tenant 경계를 제한한다. 거래처 소분류 FK는 `(business_kind2, business_kind1, tenant_id)`를 자식 키의 `(partner_cls_id, upper_partner_cls_id, tenant_id)`에 연결한다.
- `tb_material_info.mat_cata_type` 및 `tb_customer_info.business_kind3`는 변경/이관하지 않는다. `business_kind1/2`에 공백 외 데이터가 있으면 migration guard가 중단한다.
- [설계](../superpowers/specs/2026-10-27-item-partner-classification-schema-design.md), [DDL](20261027/20261027_002_create_item_partner_classification_schema.sql), [rollback](20261027/20261027_002_rollback_item_partner_classification_schema.sql), [변경 이력](20261027/20261027_002_change_item_partner_classification_schema.md), [backend 사본](../../backend/DATABASE/20261027) 참고. DDL/rollback 모두 미적용.

### 품목·거래처별 단가 (DDL 초안, 미적용)

`20261029_002` 설계 초안이며 현재 DB 구조로 간주하지 않는다. central DB MCP에서 확인한 기존 품목·거래처의 `(id, tenant_id)` 복합 unique를 기반으로 테넌트 경계를 제한한다.

| 컬럼 | 타입 | NULL/기본값 | 제안 의미 |
|---|---|---|---|
| `price_id` | `bigserial` | NOT NULL, PK | 단가 내부 ID |
| `tenant_id` | `bigint` | NOT NULL | 소유 tenant |
| `material_id`, `customer_id` | `bigint` | NOT NULL | 기존 품목/거래처 내부 ID, tenant 복합 FK |
| `trade_type` | `varchar(10)` | NOT NULL | 매입/매출 |
| `unit_price` | `numeric(15,2)` | NOT NULL | 단가 |
| `currency` | `varchar(10)` | NOT NULL, `KRW` | 통화 코드 |
| `start_dt`, `end_dt` | `date` | 시작일 NOT NULL, 종료일 NULL | 단가 적용기간 |
| `moq` | `numeric(15,2)` | NULL | 최소주문수량 |
| `use_at` | `char(1)` | NOT NULL, `Y` | 사용여부 |
| audit columns | `varchar(10)`, `timestamp` | created_at은 current timestamp | S-ERP 등록/수정자 및 시각 |

- tenant 업무키 `(tenant_id, material_id, customer_id, trade_type, start_dt)`는 unique다. 기존 동일키는 insert/update/import에서 충돌로 처리하고 업서트하지 않는다. 다른 시작일의 기간 중첩은 허용한다.
- trade type, 사용여부, 비음수 단가/MOQ, 종료일-시작일 관계를 CHECK로 보장한다. 물리 삭제는 제공하지 않는다.
- [설계](../superpowers/specs/2026-10-29-item-partner-pricing-design.md), [상세사양](../spec/20261029/20261029_002_품목_거래처별_단가관리_상세사양서.md), [날짜별 DDL/이력](20261029/20261029_002_change_item_partner_price_schema.md) 및 [backend 사본](../../backend/DATABASE/20261029) 참고. DDL/rollback 모두 미적용.

---

## 변경 이력

- 2026-10-29: 참조자별 확인을 위해 `tb_electronic_approval_line_info` 참조 행의 `CONFIRMED`/`action_at` 상태와 `tb_common_comment` SYSTEM `REFERENCE_CONFIRMED` 이벤트를 허용하는 `20261029_001` migration 초안을 정의했다. 읽기 전용 PostgreSQL MCP의 테이블/컬럼 및 CHECK 제약 메타데이터를 확인했고, 행 데이터는 조회하지 않았다. 실제 DB에는 적용하지 않았다. [backend/DATABASE/20261029](../../backend/DATABASE/20261029) 및 [docs/database/20261029](20261029) 참고.
- 2026-10-28: 전자결재 문서 식별을 내부 PK와 분리하기 위해 `tb_electronic_approval_main.document_no`를 추가하고 기존 행을 tenant/생성일 순서로 backfill하며 tenant별 unique와 `tb_id_sequence` 초기화를 정의했다. 기본 PostgreSQL MCP의 테이블 목록 및 컬럼 메타데이터를 확인했고 데이터 행은 조회하거나 변경하지 않았다. 실제 DB에는 적용하지 않았다. [backend/DATABASE/20261028](../../backend/DATABASE/20261028) 및 [docs/database/20261028](20261028) 참고.

- 2026-10-27: 품목·거래처 분류 tenant schema DDL 초안 `20261027_002`를 정의했다. central DB `business_kind1/2` nonblank guard, tenant 복합 FK, 소분류-부모 일치 FK 및 데이터 존재 시 중단하는 rollback을 포함하며 실제 DB에는 적용하지 않았다. [backend/DATABASE/20261027](../../backend/DATABASE/20261027) 및 [docs/database/20261027](20261027) 참고.
- 2026-10-26: 수주 헤더/상세 신규 테이블 DDL 초안 `20261026_008`을 정의했다. 테넌트 범위 FK와 별도 상세 ID, guarded rollback을 포함하며 실제 DB에는 적용하지 않았다. [backend/DATABASE/20261026](../../backend/DATABASE/20261026) 및 [docs/database/20261026](20261026) 참고.

- 2026-10-22: 품목 테이블이 없는 환경의 DDL 누락을 보완했다. tenant MCP로 37개 컬럼과 기본값/주석/제약/인덱스를 재확인하고 `20261022_010_create_material_schema.sql`과 빈 신규 테이블 전용 롤백을 두 DB 이력 폴더에 추가했다. 기존 테이블 수정 및 실제 DB 적용은 수행하지 않았다.

- 2026-10-22: 지정 tenant MCP로 기존 `tb_material_info`의 타입/길이/주석/제약을 확인하고 품목관리와 IDS 초기화 `20261022_010`을 정의했다. DDL 변경과 SQL 적용은 수행하지 않았다.

- 2026-10-22: 신규 환경용 그룹웨어 기준 DDL 및 공통코드 시드를 작성했다. MCP로 확인한 현행 그룹웨어 스키마 13개 테이블과 공통코드 5개 그룹/23개 항목을 반영했으며 현재 DB에는 적용하지 않았다. [backend/DATABASE/20261022](../../backend/DATABASE/20261022) 및 [docs/database/20261022](20261022) 참고.
- 2026-10-22: 기존 eGov `ids` 테이블의 `tb_customer_info` generator counter를 기존 거래처 코드 최댓값 기준으로 초기화하는 `20261022_005` migration을 정의했다. tenant 전용 PostgreSQL MCP에서 `tb_customer_info`/`ids` 컬럼과 제약 메타데이터를 확인했고 업무 데이터 및 ID 카운터 행은 조회하지 않았다. 실제 DB에는 적용하지 않았다. [backend/DATABASE/20261022](../../backend/DATABASE/20261022) 및 [docs/database/20261022](20261022) 참고.

- 2026-10-20: 전자결재 문서의 개인별 고정 기능을 위해 `tb_electronic_approval_pin`과 사용자·tenant·문서 FK, 조회 인덱스를 추가하는 `20261020_007` migration 초안을 정의했다. 현재 MCP에서 테이블, FK 및 인덱스를 확인했으며 신규 기준선에도 반영했다. [backend/DATABASE/20261020](../../backend/DATABASE/20261020) 및 [docs/database/20261020](20261020) 참고.
- 2026-10-15: 사용자별 결재선 즐겨찾기 저장을 위해 `tb_electronic_approval_line_template` 및 `tb_electronic_approval_line_template_info` migration 초안을 정의했다. 현재 MCP에서 두 테이블과 제약/인덱스를 확인했으며 신규 기준선에도 반영했다. [backend/DATABASE/20261015](../../backend/DATABASE/20261015) 및 [docs/database/20261015](20261015) 참고.
- 2026-10-15: 커뮤니티 게시글의 tenant 격리 및 공유 분류 저장을 위해 `tb_board_post.tenant_id`와 `category_code` 전환 migration 초안을 정의했다. 현재 MCP에서 해당 컬럼을 확인했으며 신규 기준선에도 반영했다. [backend/DATABASE/20261015](../../backend/DATABASE/20261015) 및 [docs/database/20261015](20261015) 참고.
- 2026-10-14: 전자결재 기안 상신 취소 및 결재자 승인 취소 이력을 위해 `tb_common_comment` SYSTEM event CHECK에 `SUBMISSION_CANCELED`, `APPROVAL_CANCELED` 허용을 추가하는 `20261014_003` migration 초안을 정의했다. 읽기 전용 PostgreSQL MCP에서 기존 이벤트 계약을 확인했으며 USER NULL 조건과 기존 SYSTEM 이벤트를 보존했다. 실제 DB에는 적용하지 않았다. [backend/DATABASE/20261014](../../backend/DATABASE/20261014) 및 [docs/database/20261014](20261014) 참고.
- 2026-10-14: 전자결재 상세 사용자별 최초 조회 중복 방지를 위해 `tb_electronic_approval_main.view_count`와 `tb_electronic_approval_view_history`를 추가하는 `20261014_001` migration 초안을 정의했다. 현재 MCP에서 관련 컬럼, 테이블 및 제약을 확인했으며 신규 기준선에도 반영했다. [backend/DATABASE/20261014](../../backend/DATABASE/20261014) 및 [docs/database/20261014](20261014) 참고.
- 2026-10-12: 전자결재 상세의 기안자 제한 논리 삭제를 위해 `tb_electronic_approval_main.deleted_yn` 및 `tb_common_comment` SYSTEM `DELETED` 이벤트 허용을 `20261012_002` migration 초안으로 정의했다. 당시 메타데이터에는 main 논리 삭제 컬럼이 없었으나 현재 MCP에서 `deleted_yn`과 CHECK를 확인했으며 신규 기준선에 반영했다. [backend/DATABASE/20261012](../../backend/DATABASE/20261012) 및 [docs/database/20261012](20261012) 참고.
- 2026-10-08: `tb_common_comment` SYSTEM 이벤트 허용 목록에 `DRAFT_SAVED`를 추가하는 `20261008_004` migration 초안을 정의했다. 실제 DB 제약을 재확인하지 못했으며 적용하지 않았다. [backend/DATABASE/20261008](../../backend/DATABASE/20261008) 및 [docs/database/20261008](20261008) 참고.
- 2026-10-08: 문서 결재 본문/참여자 테이블, 공통 댓글 SYSTEM 이벤트 구분, 댓글 좋아요 테이블의 미적용 SQL 초안을 정의했다. [backend/DATABASE/20261008](../../backend/DATABASE/20261008) 및 [docs/database/20261008](20261008) 참고. 실제 DB에는 적용하지 않았다.
- 2026-10-01: HACCP 기안양식 기준정보 테이블 3종을 이관하고 `category_item_id`, `reg_term_id` 및 테넌트별 분류/주기 공통코드 seed를 정의했다. 적용 스크립트는 [backend/DATABASE/20261001](../../backend/DATABASE/20261001) 및 [docs/database/20261001](20261001) 참고. (미반영 SQL 초안)
- 2026-10-02: `tb_drafting_work_category`의 삭제되지 않은 양식 코드에 테넌트별 부분 unique index를 추가하는 SQL 초안을 정의했다. [backend/DATABASE/20261002](../../backend/DATABASE/20261002) 및 [docs/database/20261002](20261002) 참고. (미반영 SQL 초안)
- 2026-10-02: 조건별 숫자 발번을 위한 `tb_id_sequence`와 공통코드 그룹별 카운터 초기화를 추가했다. [backend/DATABASE/20261002](../../backend/DATABASE/20261002) 및 [docs/database/20261002](20261002) 참고.
- 2026-09-16: 공통 첨부/댓글 스키마 추가로 `tb_common_file`, `tb_common_comment` 신규 테이블 생성. 공통 서비스는 `owner_type + owner_id` 기준으로 notice, board, approval, feed를 모두 재사용할 수 있도록 정리. 적용 스크립트는 [backend/DATABASE/20260916](../../backend/DATABASE/20260916) 및 [docs/database/2026-09-16](2026-09-16) 참고.
- 2026-09-18: 공지사항 본문 이미지와 일반 첨부파일을 구분하기 위해 `tb_common_file.file_usage_type` 컬럼 및 허용값 제약을 추가. 적용 스크립트는 [backend/DATABASE/20260918](../../backend/DATABASE/20260918) 및 [docs/database/20260918](20260918) 참고.
- 2026-09-16: 공지사항 본문은 `contents_html`/`contents_json`/`contents_text` 3중 저장 구조로 정교화하고, MinIO 첨부 메타 연동을 위해 `tb_board_file` 및 `tb_board_post` 보강, NOTICE 타입 보장. 적용 스크립트는 [backend/DATABASE/20260916](../../backend/DATABASE/20260916) 및 [docs/database/2026-09-16](2026-09-16) 참고.
- 2026-09-18: 공지사항 구분 코드와 게시글/댓글 최신 행위자 감사 컬럼을 추가했다. 적용 스크립트는 [backend/DATABASE/20260918](../../backend/DATABASE/20260918) 및 [docs/database/20260918](20260918) 참고.
- 2026-09-21: 공지사항 사용자별 최초 조회수 중복 방지를 위해 `tb_board_post_view_history`를 추가했다. 적용 스크립트는 [backend/DATABASE/20260921](../../backend/DATABASE/20260921) 및 [docs/database/20260921](20260921) 참고.
- 2026-09-15: 그룹웨어 커뮤니티 게시판 스키마 추가로 `tb_board_type`, `tb_board_post`, `tb_board_file` 신규 테이블 생성. 적용 스크립트는 [backend/DATABASE/20260915](../../backend/DATABASE/20260915) 및 [docs/database/2026-09-15](2026-09-15) 참고.
- 2026-09-11: 공통코드 관리 기능을 위한 `tb_common_code_group`, `tb_common_code_item` 신규 테이블 추가. 적용 스크립트는 [backend/DATABASE/20260911](../../backend/DATABASE/20260911) 및 [docs/database/2026-09-11](2026-09-11) 참고.
- 2026-09-01: 메뉴 설명 연동 작업으로 `tb_menu.menu_dc` 컬럼 추가. 적용 스크립트는 [backend/DATABASE/20260901](../../backend/DATABASE/20260901) 참고.
- 2026-08-31: 로그인/JWT 연동 작업(`docs/directions/20260831/20260831_001_로그인_JWT_백엔드_연동_작업지시서.md`)으로 `tb_department`, `tb_role`, `tb_login_account_role` 3개 테이블 추가. 적용 스크립트는 [backend/DATABASE/20260831](../../backend/DATABASE/20260831) 참고.
- 2026-08-31: 모듈/메뉴/권한관리 백엔드 연동 작업(`docs/directions/20260831/20260831_002_모듈_메뉴_권한관리_백엔드_연동_작업지시서.md`)으로 `tb_module`, `tb_menu` 2개 테이블 추가. 적용 스크립트는 [backend/DATABASE/20260831](../../backend/DATABASE/20260831) 참고.
- 2026-08-31: 모듈별 메뉴 버튼 권한 관리 작업으로 `tb_permission`, `tb_menu_permission` 2개 테이블과 `READ`/`CREATE`/`UPDATE`/`DELETE`/`EXCEL` 초기 권한을 추가. 적용 스크립트는 [20260831_004_create_menu_permission_schema.sql](../../backend/DATABASE/20260831/20260831_004_create_menu_permission_schema.sql) 참고.
- 2026-08-31: 역할별 메뉴-버튼 권한 매핑 생성 작업으로 `tb_role_menu_permission` 테이블을 별도 신규 추가. 적용 스크립트는 [20260831_005_create_role_menu_permission_schema.sql](../../backend/DATABASE/20260831/20260831_005_create_role_menu_permission_schema.sql) 참고.
