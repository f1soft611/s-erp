# AGENTS

## 백엔드 작업 가이드

이 파일은 [backend](../backend) 영역에서 작업할 때 AI 에이전트가 따라야 할 규칙을 정리한 문서입니다.

## 기본 원칙

- 작업 전에 [docs](../docs) 의 요구사항 문서와 작업지시서를 먼저 확인합니다.
- 구현은 문서 기준으로 수행하고, API 설계나 동작을 추측하지 않습니다.
- 변경 범위는 [backend/src/main/java](src/main/java) 와 관련 리소스에만 제한합니다.
- 기존 Spring Boot / eGovFrame 구조와 레이어 분리를 우선 유지합니다.

## 작업 순서

1. 작업지시서와 요구사항 문서 확인
2. [docs/plan](../docs/plan) 에서 계획 수립
3. [docs/spec](../docs/spec) 에서 API/필드/검증 기준 정의
4. 실제 구현
5. 테스트 또는 빌드 검증
6. DB 변경이 있으면 스크립트와 이력 관리

## 백엔드 개발 규칙

- 서버 코드는 [backend/src/main/java](src/main/java) 에 작성합니다.
- Controller, Service, Mapper/DAO, Config, Resource 계층을 명확히 유지합니다.
- 비즈니스 로직을 UI와 섞지 않고 서버 책임을 분리합니다.
- 설정값과 보안 민감 정보는 하드코딩하지 않고 환경변수 또는 설정 파일을 사용합니다.
- 새로운 API는 기존 컨트롤러/서비스/매퍼 패턴과 일관되게 구성합니다.
- 신규·변경 기능은 같은 업무의 기존 구현(예: 창고관리)을 먼저 확인하고 기능별 `controller`, `service` 인터페이스와 `service/impl` 구현, `domain/model`, `domain/repository`로 책임을 분리합니다. 컨트롤러에 저장·검증 로직이나 도메인 모델·DAO를 몰아넣지 않으며 기존 계약과 트랜잭션 경계를 유지합니다.
- 응답 구조, 파라미터명, 상태 코드, 보안 정책은 기존 API 스타일과 맞춥니다.

### Java 8 호환성 (필수)

- 신규·수정 Java 운영 코드는 **Java 8 문법과 표준 API**만 사용합니다. 개발·테스트 도구용 JDK 버전과 운영 코드의 호환성 기준을 구분합니다.
- Java 9+ API인 `List.of`, `Set.of`, `Map.of`, `List.copyOf`, `String.isBlank`, `String.repeat`, `Stream.toList` 등을 사용하지 않습니다. `var`, record, text block, switch expression 등 Java 8 이후 문법도 사용하지 않습니다.
- 컬렉션은 `Arrays.asList`, `Collections.singletonList`, `Collections.emptyList`, `Collections.unmodifiableList` 등 Java 8 API로 처리합니다. 대체 시 변경 가능 여부, null 허용, 요소 순서 등 기존 의미를 보존합니다.
- 문자열 처리는 Java 8 API 또는 기존 호환 라이브러리를 사용합니다. `String.isBlank`를 무조건 `trim().isEmpty()`로 바꾸지 말고 null·Unicode 공백 처리 등 기존 동작을 확인합니다.
- 의존성을 추가·업데이트할 때 Java 8 지원 여부를 확인합니다. 호환성 문제를 피하려고 운영 JDK, 배포 설정 또는 컴파일 타깃을 임의 상향하지 않습니다.
- 현재 `pom.xml`의 `source/target=1.8`은 최신 JDK API 사용까지 차단하지 않습니다. Java 변경 시 관련 Maven 테스트 외에 JDK 9+의 `javac --release 8` 또는 JDK 8 컴파일 등으로 변경한 운영 코드의 Java 8 API 호환성을 검증합니다.
- 최신 JDK에서 빌드·테스트가 통과했다는 이유만으로 Java 8 운영 호환성을 단정하지 않습니다. 검증 범위와 미확인 사항을 결과 문서에 기록합니다.

## DB 변경 규칙

백엔드 작업에서 다음이 필요한 경우 반드시 스크립트를 생성합니다.

- 신규 테이블 생성
- 컬럼 추가/수정/삭제
- FK 변경
- 기본값 변경
- 데이터 마이그레이션

DB 변경은 코드 수정만으로 끝내지 않고, 날짜별 스키마 폴더에 이력을 누적 관리해야 합니다.

### 예시 구조

```text
docs/
  database/
    db-schema.md                # 전체 테이블 누적 스키마 문서(단일 파일)
    20260831/
      20260831_001_create_login_schema.sql
      20260831_001_change_login_schema.md
      20260831_001_rollback.sql

backend/
  DATABASE/
    20260831/
      20260831_001_create_login_schema.sql
      20260831_001_change_login_schema.md
      20260831_001_rollback.sql
```

규칙:

- 날짜별 폴더를 만들고 수정 내역을 별도 파일로 남깁니다.
- SQL 스크립트와 변경 이력 문서를 함께 보관합니다.
- 변경 시점/내용/영향 범위/롤백 여부를 기록합니다.

### db-schema.md 최신화 규칙

- [docs/database/db-schema.md](../docs/database/db-schema.md) 는 전체 테이블 구조를 한눈에 보는 누적 스키마 문서입니다. 날짜별 변경 이력 파일과 별개로 항상 최신 상태를 유지해야 합니다.
- 신규 테이블 생성, 컬럼 추가/수정/삭제, FK 변경 등 스키마에 영향을 주는 작업을 완료하면, 같은 작업 안에서 `db-schema.md`의 해당 테이블 항목을 반드시 함께 반영합니다(신규 테이블 추가, 컬럼 설명 갱신, 삭제된 컬럼/테이블 제거 등).
- 날짜별 SQL/변경 이력 문서만 남기고 `db-schema.md` 갱신을 누락하는 것은 DB 변경 작업 완료로 간주하지 않습니다.
- `db-schema.md` 갱신 여부는 [작업 종료 기준](../AGENTS.md) 체크리스트의 DB 변경 확인 항목에 포함해서 점검합니다.

## 검증 기준

```bash
cd backend
mvn test
mvn spring-boot:run
```

- 개발·테스트 도구 환경은 Java 17 이상, Maven 3.8.x를 기준으로 하되, 운영 코드는 Java 8 호환성을 유지하고 위의 별도 API 호환 검증을 수행합니다.
- 빌드와 테스트가 정상적으로 통과해야 작업을 완료로 간주합니다.

## 금지 사항

- 문서 없이 API 구조를 임의로 설계하지 않습니다.
- 기존 패턴을 무시한 대규모 리팩터링을 하지 않습니다.
- DB 변경을 스크립트 없이 코드만 수정하지 않습니다.
- DB 스키마 변경 후 [docs/database/db-schema.md](../docs/database/db-schema.md) 를 최신화하지 않은 채 작업을 완료로 간주하지 않습니다.
- 결과물을 문서화하지 않고 완료로 간주하지 않습니다.
