# Compatible dependencies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 화면 프레임워크·Java 운영 기준을 바꾸지 않는 제한된 의존성 업데이트를 검증한다.

**Architecture:** 프론트엔드는 router/testing-library patch만 manifest와 lock에 반영한다. 백엔드는 Tomcat 9.0 계열 다섯 artifact, PostgreSQL 42.7, FileUpload 1.x만 갱신한다. 공유 설치·비공개 profile·원격 브랜치는 건드리지 않는다.

**Tech Stack:** npm lockfile v3, Vitest, Maven, Java 8 API compile.

---

## 사전 근거와 제한

- [작업지시서](../../directions/20261118/20261118_001_repository-remediation_작업지시서.md)
- picomatch 최신 4.0.7도 GHSA-fc5q-39xc-vjpf 영향 범위이며 first patched version이 없다. npm이 제시하는 Vite/Vitest/React plugin 다운그레이드는 적용하지 않는다.
- uuid <11.1.1 advisory는 ExcelJS 경로에 남는다. ExcelJS 3.4.0 다운그레이드나 uuid major 강제 override는 하지 않는다.
- React/MUI/Tiptap minor 묶음, TypeScript/Vitest major는 별도 화면 회귀 범위이므로 보류한다.
- 현재 bf6cf0bb backend/database tracked snapshot을 소유 worktree에 반영했다. 기존 checkout에서 삭제된 파일은 없었다.
- 변경 전 Maven: 1,286개 중 failure 0/error 2/skip 3. 오류 둘은 gitignored application-dev/prod.properties를 직접 읽는 테스트다. 해당 설정을 읽거나 복사하지 않으며 이 기존 오류를 업데이트 회귀로 오인하지 않는다.
- DB MCP 기본 서버 list_tables → describe_table(tb_id_sequence)로 varchar/bigint/timestamp metadata만 확인했다. 행 데이터는 조회하지 않았다. 이 확인은 새 JDBC 드라이버의 실 DB 연결 시험이 아니다.

### Task 1: 프론트엔드 patch

**Files:**
- Modify: `frontend/package.json`
- Generate: `frontend/package-lock.json`

- [x] 아래 두 항목만 manifest에서 변경한다.

```json
"react-router-dom": "^7.18.5"
"@testing-library/react": "^16.3.3"
```

- [x] 소유 worktree에 manifest를 복사하고 다음 명령으로 lock만 생성한다.

```powershell
npm update react-router-dom @testing-library/react --package-lock-only --ignore-scripts --no-audit
```

- [x] old/new lock의 package별 version을 대조한다. router 두 package와 testing-library 이외 변경이 있으면 이유를 확인한 후 범위를 좁힌다.
- lock 생성은 router의 기존 `^2.6.0` 범위 안에서 set-cookie-parser 2.7.2→2.7.3도 갱신했다. 이 간접 patch를 포함한 네 package만 허용하며 강제 override는 추가하지 않는다.
- [x] 확인한 lock을 root에 복사하고 소유 worktree에서만 `npm ci --ignore-scripts --no-audit`를 실행한다.
- [x] audit 재실행으로 잔여 advisory를 공개한다. typecheck/lint/build와 최종 전체 frontend 검사를 새 exact-lock에서 수행한다. 전체는 12개 실패로 종료해 통합 승인은 보류한다.
- 새 lock 전체 실행은 12개 timeout, 동일 두 문서 파일의 1-worker 비교는 8개 timeout과 DOM 분리 단언 1개로 실패했다. 인과를 추측하지 않기 위해 소유 검증 worktree만 기존 manifest/lock으로 일시 복원·재설치하여 동일 두 파일을 한 번 비교했다. 기존 lock도 5개 timeout으로 실패했다. 두 결과를 보존한 뒤 새 manifest/lock과 설치를 복원했다(exit 0). 공유 설치·시간 제한·소스 단언은 바꾸지 않았으며 성공할 때까지 재실행하지 않았다.

### Task 2: 백엔드 동일 호환 계열

**Files:**
- Modify: `backend/pom.xml`

- [x] 아래 7개 기존 version 값을 변경한다.

```xml
<!-- Tomcat embed core/el/jasper/websocket 및 annotations-api 각각 -->
<version>9.0.124</version>
<!-- org.postgresql:postgresql -->
<version>42.7.14</version>
<!-- commons-fileupload:commons-fileupload -->
<version>1.6.0</version>
```

- [x] 다른 artifact·scope·프레임워크·배포 JDK는 변경하지 않는다. pgJDBC는 42.6→42.7 minor 이동임을 결과에 명시한다.
- [x] 소유 backend snapshot에 pom만 복사한 뒤 `mvn -B -q clean test`를 실행한다. baseline과 같은 두 환경설정 오류인지 XML 결과를 대조한다. 새 실패는 해결하거나 해당 업데이트를 철회한다.
- [x] `mvn -B -q -Dmaven.compiler.release=8 clean compile`로 운영 코드 전체의 Java 8 API 컴파일을 확인한다.
- [x] 업데이트한 jar들의 기본 class major가 52 이하인지 확인한다. multi-release 전용 class는 별도 구분한다.
- FileUpload가 선언한 Commons IO 2.19.0과 달리 기존 eGov 의존 경로가 2.16.1을 선택한다. 실제 선택 버전의 API 참조와 메모리/디스크 multipart 파싱을 별도 확인하고 미검증 조합으로 숨기지 않는다.
- [x] Tomcat 9 Java 8+, pgJDBC Java 8, FileUpload 1.6 Java 8 지원 문서와 actual jar 증거를 기록한다. 실제 Java 8 런타임/실 DB 연결까지 시험했다고 표현하지 않는다.

### Task 3: 결과

**Files:**
- Create: `docs/spec/20261118/20261118_013_compatible-dependencies_상세사양서.md`
- Create: `docs/result/20261118/repository-remediation/20261118_013_compatible-dependencies_결과.md`

- [x] 변경 목록·advisory 잔존·Maven baseline·Java 8 검증 범위를 기록한다.
- [x] 라이브러리/검증 작업으로 신규 화면 변경은 없으며 날짜 경합의 화면 증거는 결과 012를 참조한다.
- [x] SQL/스키마/API 변경 없음과 MCP metadata 조회 범위를 기록한다. 커밋·푸시·공유 설치 변경은 하지 않는다.

검증 실행과 문서화는 종료했으나 frontend 전체 안정성은 확보되지 않았다. 의존성 변경은 통합 보류 후보이며 전체 통과·무영향을 승인한 것이 아니다.
