# F1Workflow Java 8 기본 호환성 규칙 추가 계획서

## 1. 문서 정보

- 작업지시서: `docs/directions/20260908/20260908_003_f1workflow_java8_compatibility_작업지시서.md`
- 작업 분류: `bounded`
- 대상 영역: F1Workflow 문서 및 기술 스택 정의
- DB 스키마 변경: 없음

## 2. 목적 및 요구사항 분석

F1Workflow가 S-ERP 백엔드를 Java 17로 안내하는 기존 기준을 Java 8 이상으로 전환한다. Java 8 대상 모듈에서 Java 9 이상 API 또는 Java 10 이상 문법을 선택하지 않도록 금지 항목과 대체 방식을 명시한다.

애플리케이션의 실제 런타임, `backend/pom.xml` Maven Compiler 설정, Java 소스, 의존성은 이번 작업에서 변경하지 않는다. 이 작업은 이후 백엔드 작업자가 Java 8 호환성 요구를 구현 전에 확인하도록 하는 워크플로 문서 개선이다.

## 3. 변경 대상과 책임

### `.github/f1workflow/README.md`

- S-ERP 백엔드의 언어/런타임 기준을 `Java 8+`로 변경한다.
- 일반 Java 기술 스택의 언어 기준을 `Java 8+`로 변경한다.
- 프로젝트 분석 결과 예시의 백엔드 언어를 `Java 8+`로 변경한다.
- 인라인 S-ERP Java 기술 스택 YAML 예시를 Java 8 기준 및 호환 규칙과 일치시킨다.

### `.github/f1workflow/tech-stacks/s-erp-java-egov.yml`

- `language`를 `Java 8+`로 변경한다.
- `rules`에 Java 8 호환 금지 항목, 대체 방식, Maven Compiler `source`/`target` 또는 `release` 점검 기준을 추가한다.

### `.github/f1workflow/skills/01-project-analysis.md`

- S-ERP 백엔드 감지 결과를 Java 8 이상으로 갱신한다.
- 분석 시 Maven Compiler 설정과 Java 8 호환 API/문법 사용 여부를 확인하도록 추가한다.

### 결과 문서

- `docs/result/20260908/f1workflow-java8-compatibility/`에 작업 원장과 결과 문서를 작성한다.
- DB 스크립트는 생성하지 않으며, 결과에 `DB 스크립트: 해당 없음, 기존 스키마 영향 검토 완료`를 기록한다.

## 4. 구현 태스크

### Task 1: README의 언어 기준 통일

- [ ] S-ERP 백엔드, 일반 Java, 프로젝트 프로필, 인라인 YAML 예시의 Java 버전을 `Java 8+`로 맞춘다.
- [ ] S-ERP 백엔드 특화 규칙에 Java 8 호환성 요약을 추가한다.

### Task 2: 기술 스택 정의에 실행 규칙 추가

- [ ] `s-erp-java-egov.yml`의 언어 기준을 `Java 8+`로 변경한다.
- [ ] Java 9 이상 API 및 Java 10 이상 문법 금지 규칙을 추가한다.
- [ ] 명시 타입, 기존 switch, `Collectors.toList()`, `Paths.get()`, 예외 공급자가 있는 `Optional.orElseThrow()` 등 Java 8 대체 방식을 추가한다.
- [ ] Maven Compiler의 `source`/`target` 또는 `release` 설정 점검 규칙을 추가한다.

### Task 3: 프로젝트 분석 단계 보완

- [ ] `01-project-analysis.md`의 백엔드 주요 스택을 Java 8 이상으로 갱신한다.
- [ ] 분석 절차에 Maven Compiler 호환 타깃과 Java 8 비호환 API/문법 확인 항목을 추가한다.

### Task 4: 문서 검증 및 결과 기록

- [ ] 변경 문서의 Markdown/YAML 진단을 실행한다.
- [ ] `Java 17`, `Java 11` 잔존 여부와 Java 8 호환 규칙 및 대체 방식 포함 여부를 텍스트 검색으로 확인한다.
- [ ] 결과 문서에 변경 파일, 검증 명령 및 결과, DB 영향 없음 판단을 기록한다.

## 5. 영향 범위와 위험 관리

- 프론트엔드 영향: 없음.
- 백엔드 애플리케이션 영향: 없음. 코드와 Maven 설정을 변경하지 않는다.
- DB 영향: 없음. 테이블, 컬럼, 데이터, SQL 스크립트를 변경하지 않는다.
- 위험: 워크플로 문서와 기술 스택 YAML의 언어 기준이 불일치할 수 있다. README, 분석 스킬, YAML의 세 위치를 함께 검증해 방지한다.
- 위험: Java 8 일반 규칙이 현재 프로젝트의 실제 Java 실행 요구사항을 변경하는 것으로 오해될 수 있다. 규칙은 Java 8 호환 대상 모듈의 코드 작성 제약이며, 실제 Maven 런타임 변경은 제외 범위임을 명시한다.

## 6. 검증 계획

- 문서 진단: 수정한 Markdown 및 YAML 파일의 VS Code 진단 확인.
- 텍스트 검증: `.github/f1workflow`에서 `Java 17|Java 11` 검색 결과가 의도적으로 남긴 역사/외부 예시가 아닌지 확인.
- 규칙 검증: `var`, `record`, `List.of()`, `Stream.toList()`, `Paths.get()`, `Collectors.toList()`, Maven Compiler 설정 키워드가 규칙에 포함되었는지 확인.
- Maven 검증: 애플리케이션 코드와 Maven 설정을 변경하지 않으므로 이번 작업에서는 실행하지 않는다.

## 7. 제외 범위

- `backend/pom.xml` 또는 Maven 플러그인의 Java 버전 변경
- 백엔드 소스의 Java 8 하향 변환
- 라이브러리, Spring Boot, eGovFrame, MyBatis 버전 변경
- API, DB 스키마, SQL 스크립트, 프론트엔드 변경
