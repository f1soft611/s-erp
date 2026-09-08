# F1Workflow Java 8 기본 호환성 규칙 추가 상세 사양서

## 1. 문서 정보

- 작업지시서: `docs/directions/20260908/20260908_003_f1workflow_java8_compatibility_작업지시서.md`
- 계획서: `docs/plan/20260908/20260908_003_f1workflow_java8_compatibility_계획서.md`
- 작업 분류: `bounded`
- 대상 영역: F1Workflow Markdown 및 YAML 문서
- DB 스키마 변경: 없음

## 2. 기준 정의

- F1Workflow가 감지한 S-ERP 백엔드와 일반 Java 백엔드의 기본 언어 표기는 `Java 8+`이다.
- 이 기준은 Java 8 호환 바이트코드 또는 Java 8 런타임을 대상으로 하는 모듈의 코드 작성 규칙이다.
- 실제 프로젝트의 Maven Compiler, JDK 실행 환경, 라이브러리 기준을 이 문서 변경만으로 조정하지 않는다. 각 구현 작업은 해당 모듈의 `pom.xml` 설정을 별도로 확인한다.

## 3. 변경 파일별 사양

### 3.1 `.github/f1workflow/README.md`

- S-ERP 백엔드의 `언어/런타임`을 `Java 8+`로 표시한다.
- 일반 Java 기술 스택의 `언어`를 `Java 8+`로 표시한다.
- 프로젝트 분석 JSON 예시의 `backend.language`를 `Java 8+`로 표시한다.
- 인라인 `s-erp-java-egov.yml` 예시의 `language`를 `Java 8+`로 표시한다.
- S-ERP 백엔드 특화 규칙 목록에 Java 8 호환 규칙의 목적과 Maven Compiler 설정 확인을 포함한다.

### 3.2 `.github/f1workflow/tech-stacks/s-erp-java-egov.yml`

- `language: 'Java 8+'`를 사용한다.
- `rules`에 다음 정책을 추가한다.

| 구분        | 규칙                                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 금지 문법   | `var`, `record`, `sealed`, switch 표현식, text block 등 Java 10 이상 문법을 Java 8 대상 코드에서 사용하지 않는다.                                                        |
| 금지 API    | `List.of()`, `Set.of()`, `Map.of()`, `Stream.toList()`, 무인자 `Optional.orElseThrow()`, `Path.of()` 등 Java 9 이상 API를 사용하지 않는다.                               |
| 대체 방식   | 명시 타입, 일반 클래스 또는 enum, 기존 switch 문, `Collectors.toList()`, Java 8 컬렉션 생성 방식, 예외 공급자가 있는 `Optional.orElseThrow()`, `Paths.get()`을 사용한다. |
| 컴파일 확인 | 구현 전후 Maven Compiler의 `source`/`target` 또는 `release` 값이 Java 8 대상과 일치하는지 확인한다.                                                                      |

### 3.3 `.github/f1workflow/skills/01-project-analysis.md`

- S-ERP 백엔드의 주요 스택을 `Java 8+`로 표시한다.
- 프로젝트 분석 절차에 다음 확인 항목을 추가한다.
  - `pom.xml`의 Maven Compiler `source`/`target` 또는 `release` 값
  - Java 8 대상 코드에서 Java 9 이상 API 또는 Java 10 이상 문법이 도입되지 않았는지 여부

## 4. API, UI, 권한 정책

- API 계약 변경: 없음.
- UI 변경: 없음.
- 권한 정책 변경: 없음.

## 5. 예외 및 판단 기준

- 모듈이 실제로 Java 8이 아닌 더 높은 JDK를 요구하더라도, 해당 사실은 기술 분석 결과와 구현 작업의 사양에 명시한다. 문서의 `Java 8+` 기준만으로 Maven 설정을 낮추지 않는다.
- 외부 라이브러리가 Java 9 이상 API를 요구하면 호환 규칙을 우회하지 않는다. 호환 대상과 의존성 변경 필요성을 별도 작업지시서로 분리한다.
- Java 8 호환이 필요하지 않은 모듈도 F1Workflow 기본 표기를 따르되, 해당 모듈의 실제 컴파일 타깃이 우선한다.

## 6. 검증 기준

1. README, 프로젝트 분석 스킬, S-ERP Java 기술 스택 YAML의 언어 기준이 모두 `Java 8+`이다.
2. 기술 스택 YAML에 금지 문법, 금지 API, 대체 방식, Maven Compiler 설정 확인 기준이 모두 있다.
3. README 및 분석 스킬에서 Java 17 또는 Java 11을 S-ERP/일반 Java의 기본 기준으로 안내하지 않는다.
4. 변경 문서에 Markdown/YAML 진단 오류가 없다.
5. 애플리케이션 코드, Maven 설정, DB 스키마, API 계약이 변경되지 않는다.
6. 결과 문서에 `DB 스크립트: 해당 없음, 기존 스키마 영향 검토 완료`를 기록한다.
