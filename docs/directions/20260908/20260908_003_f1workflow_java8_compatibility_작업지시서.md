# 작업지시서

## 제목

F1Workflow 백엔드 Java 8 기본 호환성 규칙 추가

## 작업 분류

- 경로: `bounded`
- 사유: F1Workflow의 S-ERP 백엔드 기술 기준과 프로젝트 분석 안내에 Java 8 호환 제약을 명시한다. 애플리케이션 소스, Maven 의존성, 런타임을 변경하지 않는 워크플로 문서 범위의 작업이다.

## 배경

현재 F1Workflow는 S-ERP 백엔드를 Java 17+로 기술하고 있어, Java 8 환경 또는 Java 8 바이트코드 호환을 요구하는 백엔드 작업에서 최신 문법과 API를 선택할 여지가 있다. 워크플로 단계에서 호환성 기준을 명확히 해야 계획과 구현 시점의 판단이 일관된다.

## 목표

1. F1Workflow의 S-ERP 백엔드 기본 언어 기준을 Java 8 이상으로 통일한다.
2. Java 8 대상 코드에서 사용하면 안 되는 Java 9 이상 API와 Java 10 이상 문법을 명시한다.
3. Java 8 호환 대체 방식과 Maven 컴파일 타깃 확인 방법을 제공한다.
4. 프로젝트 분석 단계가 Java 8 호환 제약을 기술 스택 결과에 포함하도록 한다.

## 요구사항

### 1. 적용 범위

- `.github/f1workflow/README.md`의 S-ERP 백엔드 및 일반 Java 기술 스택 기준을 Java 8 이상으로 갱신한다.
- `.github/f1workflow/skills/01-project-analysis.md`에서 백엔드 분석 결과의 Java 기준을 Java 8 이상으로 갱신한다.
- Java 8 호환 규칙은 S-ERP 백엔드 특화 규칙에 포함한다.

### 2. Java 8 호환 규칙

- Java 8 대상 모듈에서는 `var`, `record`, `sealed`, switch 표현식, text block 등 Java 9 이상 문법 또는 API를 사용하지 않는다.
- `List.of()`, `Set.of()`, `Map.of()`, `Stream.toList()`, `Optional.orElseThrow()` 무인자 형태, `Path.of()` 등 Java 9 이상 API를 사용하지 않는다.
- 대체 방식으로 명시 타입, 일반 클래스 또는 enum, 기존 switch 문, `Collectors.toList()`, Java 8 컬렉션 생성 방식, 예외 공급자가 있는 `orElseThrow`, `Paths.get()`을 안내한다.
- 코드 변경 전후 Maven Compiler의 `source`/`target` 또는 `release` 설정이 Java 8과 일치하는지 확인하도록 명시한다.

### 3. 검증

- 변경된 Markdown 문서의 링크, 경로, Markdown 구조를 검토한다.
- Java 8 금지 API와 대체 방식이 문서에 모두 포함되었는지 텍스트 기반으로 확인한다.
- 애플리케이션 코드 및 빌드 설정을 변경하지 않으므로 Maven 빌드/테스트는 이번 변경의 검증 범위에서 제외한다.

## 변경 범위

### 워크플로 문서

- `.github/f1workflow/README.md`
- `.github/f1workflow/skills/01-project-analysis.md`
- 필요 시, 백엔드 규칙을 직접 안내하는 기존 F1Workflow 스킬 문서 1개

### 결과 문서

- `docs/plan/20260908/`
- `docs/spec/20260908/`
- `docs/result/20260908/f1workflow-java8-compatibility/`

## 제외 범위

- `backend/pom.xml`의 Java 컴파일 버전 변경
- 백엔드 Java 소스의 Java 8 변환 또는 리팩터링
- Spring Boot, eGovFrame, MyBatis 및 라이브러리 버전 변경
- 데이터베이스 스키마, SQL 스크립트, API 계약 변경
- 프론트엔드 코드 및 설정 변경

## 완료 기준

- F1Workflow S-ERP 백엔드 및 일반 Java 기준이 Java 8 이상으로 일관되게 안내된다.
- Java 8 비호환 문법/API와 대체 방식이 백엔드 규칙에 명시된다.
- 프로젝트 분석 단계에서 Java 8 호환성 확인 항목을 제공한다.
- 계획서, 상세 사양서, 결과 문서에 변경 범위와 검증 결과가 기록된다.
- DB 스크립트: 해당 없음, 기존 스키마 영향 검토 완료를 결과 문서에 기록한다.

## 승인 필요 사항

이 작업지시서의 목표와 범위가 승인되면 다음 단계에서 계획서와 상세 사양서를 작성한다. 명시 승인 전에는 규칙 파일 수정, 테스트 실행, 빌드, 배포를 진행하지 않는다.
