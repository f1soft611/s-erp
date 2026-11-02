# S-ERP Backend

![java](https://img.shields.io/badge/java-007396?style=for-the-badge&logo=JAVA&logoColor=white)
![Spring_boot](https://img.shields.io/badge/Spring_Boot-F2F4F9?style=for-the-badge&logo=spring-boot)
![maven](https://img.shields.io/badge/Maven-C71A36?style=for-the-badge&logo=apache-maven&logoColor=white)
![swagger](https://img.shields.io/badge/swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)

이 백엔드는 로그인/인증 전용 최소 구조로 정리된 S-ERP 백엔드입니다. 레거시 업무 모듈, 멀티테넌트 운영 화면, 플랫폼 관리자 전용 기능, 타 프로젝트 명칭은 제거된 상태를 기준으로 유지합니다.

## 환경

| 프로그램 명 | 버전    |
| :---------- | :------ |
| 개발·테스트 JDK | 17 이상 |
| 운영 코드 호환성 | Java 8 |
| Maven       | 3.8.x   |

Java 코드를 신규 작성하거나 수정할 때는 **Java 8 문법·표준 API 및 Java 8 지원 의존성**만 사용합니다. 개발 JDK 버전이 높더라도 `List.of`, `String.isBlank`, `Stream.toList` 등 Java 9+ API·문법을 사용하지 않습니다.

`pom.xml`의 `source/target=1.8`만으로 최신 JDK API 사용을 막을 수 없습니다. Java 변경 시 관련 Maven 테스트와 별도로 `javac --release 8`(JDK 9+) 또는 JDK 8 컴파일 등 API 호환 검증을 수행합니다. 상세 기준은 [백엔드 에이전트 지침](AGENTS.md#java-8-호환성-필수)을 따릅니다. 이 기준은 기존 전체 코드·의존성의 Java 8 운영 검증 완료를 의미하지 않습니다.

## 현재 유지 범위

- 공통 설정: `egovframework.com`
- 로그인/인증: `egovframework.let.uat.uia`
- 권한/메뉴 공통: `egovframework.let.uss.auth`
- 공개 엔드포인트: `/`, `/auth/login`, `/auth/login-jwt`, `/auth/refresh`, `/v3/api-docs/**`, `/swagger-ui/**`
- 그 외 요청은 기본적으로 차단

## 실행

```bash
cd backend
mvn spring-boot:run
```

## Swagger

- Swagger UI: `http://localhost:8080/swagger-ui/index.html`
- 로그인 API는 공개 접근 허용
- 나머지 API는 JWT 인증이 필요

## 운영 설정

운영 환경에서 민감값은 외부 프로퍼티에서 관리합니다.

```bash
cp src/main/resources/application-dev.properties src/main/resources/application-prod.properties
```

실제 운영 값은 `JWT_SECRET`, `POSTGRES_PASSWORD`, `MAIL_*`, `MINIO_*` 등 환경변수로 주입하는 것을 권장합니다.
