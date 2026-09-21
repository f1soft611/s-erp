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

| 컬럼          | 타입      | 설명           |
| ------------- | --------- | -------------- |
| user_id       | bigint    | 사용자 PK      |
| tenant_id     | bigint    | 소속 테넌트    |
| login_id      | bigint    | 로그인 계정 FK |
| user_nm       | varchar   | 사용자명       |
| email_addr    | varchar   | 이메일         |
| department_id | bigint    | 부서 FK        |
| mobile_no     | varchar   | 휴대폰 번호    |
| use_at        | char      | 사용 여부      |
| created_at    | timestamp | 생성 일시      |
| updated_at    | timestamp | 수정 일시      |

역할:

- 사용자 프로필정보
- 로그인 계정과 사용자 실명/부서 연결

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
| board_type_code       | varchar   | 게시판 유형 코드             |
| title                 | varchar   | 제목                         |
| contents              | text      | legacy 본문 호환용           |
| contents_html         | text      | 렌더링용 HTML 본문           |
| contents_json         | json      | Tiptap JSON 본문             |
| contents_text         | text      | 검색/요약용 평문             |
| writer_id             | varchar   | 작성자 ID                    |
| writer_name           | varchar   | 작성자 명                    |
| notice_gubun_code     | varchar   | 공지 구분 공통코드 상세 코드 |
| view_count            | int       | 조회수                       |
| is_notice             | char      | 중요공지 여부 (`Y`/`N`)      |
| is_deleted            | char      | 삭제 여부 (`Y`/`N`)          |
| created_at            | timestamp | 생성 일시                    |
| updated_at            | timestamp | 수정 일시                    |
| last_modified_by      | varchar   | 마지막 수정자 ID             |
| last_modified_by_name | varchar   | 마지막 행위자 이름           |
| last_comment_count    | int       | 마지막 댓글 수               |

역할:

- 공지사항/게시판/자료실 게시글의 원본 데이터 저장
- 목록/상세 조회와 삭제 처리의 기본 테이블

### 2-18. tb_board_file

| 컬럼             | 타입      | 설명                     |
| ---------------- | --------- | ------------------------ |
| board_file_id    | bigint    | 첨부 PK                  |
| post_id          | bigint    | 게시글 FK                |
| file_name        | varchar   | 원본 파일명              |
| file_path        | varchar   | legacy 저장 경로(호환용) |
| file_size        | bigint    | 파일 크기                |
| mime_type        | varchar   | MIME 타입                |
| object_key       | varchar   | MinIO object key         |
| bucket_name      | varchar   | MinIO 버킷명             |
| storage_provider | varchar   | 저장소 타입 (`minio`)    |
| checksum_sha256  | varchar   | 파일 해시                |
| content_type     | varchar   | 파일 컨텐츠 타입         |
| uploaded_by      | varchar   | 업로더 ID                |
| deleted_yn       | char      | 삭제 여부 (`Y`/`N`)      |
| created_at       | timestamp | 생성 일시                |
| updated_at       | timestamp | 수정 일시                |

역할:

- 첨부 파일 메타데이터를 보관
- 실제 파일 바이너리는 MinIO에 저장하고 DB에는 경로/메타정보를 기록

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

---

## 변경 이력

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
