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
- 메뉴별 허용 버튼/기능 권한만 저장하며, 역할별 권한인 `tb_role_menu_permission`과 분리

역할:

- 리프 메뉴가 사용할 수 있는 권한 코드를 관리
- 후속 역할 관리 화면에서 역할별로 부여할 수 있는 권한의 기준 제공

---

## 변경 이력

- 2026-09-01: 메뉴 설명 연동 작업으로 `tb_menu.menu_dc` 컬럼 추가. 적용 스크립트는 [backend/DATABASE/20260901](../../backend/DATABASE/20260901) 참고.
- 2026-08-31: 로그인/JWT 연동 작업(`docs/directions/20260831/20260831_001_로그인_JWT_백엔드_연동_작업지시서.md`)으로 `tb_department`, `tb_role`, `tb_login_account_role` 3개 테이블 추가. 적용 스크립트는 [backend/DATABASE/20260831](../../backend/DATABASE/20260831) 참고.
- 2026-08-31: 모듈/메뉴/권한관리 백엔드 연동 작업(`docs/directions/20260831/20260831_002_모듈_메뉴_권한관리_백엔드_연동_작업지시서.md`)으로 `tb_module`, `tb_menu` 2개 테이블 추가. 적용 스크립트는 [backend/DATABASE/20260831](../../backend/DATABASE/20260831) 참고.
- 2026-08-31: 모듈별 메뉴 버튼 권한 관리 작업으로 `tb_permission`, `tb_menu_permission` 2개 테이블과 `READ`/`CREATE`/`UPDATE`/`DELETE`/`EXCEL` 초기 권한을 추가. 적용 스크립트는 [20260831_004_create_menu_permission_schema.sql](../../backend/DATABASE/20260831/20260831_004_create_menu_permission_schema.sql) 참고.
