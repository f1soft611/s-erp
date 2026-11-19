# 제한적 호환 의존성 업데이트 결과

- [계획서](../../../plan/20261118/20261118_013_compatible-dependencies_계획서.md)
- [상세사양](../../../spec/20261118/20261118_013_compatible-dependencies_상세사양서.md)
- 상태: **검증 종료·통합 보류 후보**. 프론트엔드 전체 회귀 실패가 남아 있으며 아래 백엔드 결과와 혼합해 전체 통과로 표현하지 않는다.

## 변경 범위

| 구분 | 이전 → 이후 |
| --- | --- |
| react-router-dom / react-router | 7.18.2 → 7.18.5 |
| @testing-library/react | 16.3.2 → 16.3.3 |
| set-cookie-parser, router 간접 patch | 2.7.2 → 2.7.3 |
| Tomcat embed core/el/jasper/websocket 및 annotations-api | 9.0.91 → 9.0.124 |
| pgJDBC | 42.6.0 → 42.7.14, minor 이동 |
| Commons FileUpload | 1.5 → 1.6.0 |

manifest는 두 항목, lock은 네 package만 바뀌었다. 강제 override·다운그레이드는 없다. React/MUI/Tiptap minor 묶음과 TypeScript/Vitest major는 별도 화면 회귀 범위이므로 보류했다. 공유 설치를 교체하지 않고 소유 검증 worktree에서 새 lock으로 `npm ci --ignore-scripts --no-audit`했다.

## 프론트엔드 최종 검사와 통제 비교

Node 22.17.1/npm 11.9.0, 고정 소유 소스와 새 exact-lock에서 typecheck/build exit 0, lint 오류 0·경고 206이다. CI와 같은 worker 2의 전체 검사는 **226파일 중 225 통과·1 실패, 2,641개 중 2,629 통과·12 실패·제외 0**, 1,422.69초다.

실패는 모두 document-write-page.test.tsx다. 승인·합의 4개, 템플릿 로딩 1개, 닫기/재열기·저장 2개, 이미지·첨부 5개가 timeout이다. 10개는 기존 5초, 각각 한 개는 기존 10초/15초 제한이며 제한을 바꾸지 않았다.

| 별도 진단 실행 | 결과 | 의미 |
| --- | --- | --- |
| 새 lock, 문서작성+승인필드 전체, worker 1 | 160개 중 151 통과·9 실패 | timeout 8개와 분리된 DOM 노드 단언 1개 |
| 기존 lock으로 같은 소스·두 파일·worker 1, 한 번 통제 비교 | 160개 중 155 통과·5 실패 | 구 버전에서도 timeout 5개 재현 |

기존 lock에서도 불안정성이 재현되므로 새 dependency만을 유일한 원인으로 단정할 수 없다. 반대로 실패 수 차이가 있어 업데이트의 성능 영향이 없다고 확정할 수도 없다. 앞선 단일 실행 160 통과를 최신 결과로 대체하지 않는다. 후속 단언·준비 비용 계측과 통제된 환경의 전후 비교가 필요하며 **변경을 병합 가능한 것으로 승인하지 않는다**.

실패를 감추기 위한 skip·재시도·시간 제한 상향은 없다. 통제 비교 후 새 manifest/lock과 격리 설치를 다시 복원했으며 설치 exit 0이다. 성공할 때까지 반복하지 않았다.

## 백엔드 전후 비교와 Java 8

tracked bf6cf0bb backend/database 소스에 pom만 반영한 격리 환경이다. 비공개 application-dev/prod.properties는 열람·복사·생성하지 않았다.

| 검사 | 업데이트 전 | 업데이트 후 |
| --- | --- | --- |
| Maven 전체 테스트 | 1,286개, 실패 0·오류 2·제외 3 | 동일 |
| 오류 | 비공개 설정 파일을 직접 읽는 기존 두 케이스 | 동일 두 케이스, 새 실패 없음 |
| 전체 운영 Java `--release 8 clean compile` | 별도 비교 대상 아님 | exit 0 |

남은 오류는 `MinioStorageConfigTest.minioDefaultsMatchProjectCredentials`, `SecurityConfigTest.swaggerScanShouldBeLimitedToLoginAndSharedAuthModules`의 NoSuchFile이다. 테스트 전체가 통과한 것은 아니다. 기존 세 skip도 이번에 추가한 것이 아니다.

실제 classpath의 업데이트 일곱 jar와 Commons IO/checker-qual, 총 아홉 jar의 **기본 class major는 모두 52 이하**다. module-info/multi-release 전용 class는 별도 분리했다. [Tomcat 9](https://tomcat.apache.org/whichversion.html), [pgJDBC](https://jdbc.postgresql.org/documentation/setup/), [FileUpload 1.6](https://commons.apache.org/proper/commons-fileupload/changes.html)의 Java 8 지원 문서도 확인했다.

FileUpload 1.6은 Commons IO 2.19.0을 선언하지만 실제 선택 버전은 기존 eGov crypto의 **2.16.1**이다. 추가 pin은 하지 않았다. 참조하는 builder/getPath/Uncheck API가 존재함을 확인하고 실제 선택 jar 조합으로 합성 multipart의 메모리 필드, 디스크 전환 파일, byte 접근, 파일 쓰기와 정리 경로를 실행해 통과했다. 이는 전체 업로드 저장소 연결이나 모든 전이 API 호환성을 보증하는 검사는 아니다.

개발 JDK 19에서 실행했으며 실제 Java 8 runtime, 새 JDBC의 실 DB 연결, 실제 업로드 저장소는 시험하지 않았다. bytecode/API compile 결과를 그 검증으로 대체하지 않는다.

## 잔여 advisory

업데이트 전후 npm audit 모두 **독립 advisory 2개, 영향 package 9개(high 7/moderate 2)**다. 취약점 아홉 종류라는 의미가 아니며 이번 patch로 이를 제거했다고 주장하지 않는다.

- [picomatch ReDoS](https://github.com/advisories/GHSA-fc5q-39xc-vjpf): 확인 시 npm 최신 4.0.7도 영향 범위이며 공식 patched version이 없다. Vite/Vitest 구버전 강제 변경은 하지 않았다.
- [uuid](https://github.com/advisories/GHSA-w5hq-g745-h8pq): ExcelJS 간접 경로에 남는다. upstream 호환 갱신을 기다리며 uuid major 강제 override나 ExcelJS 3.4 downgrade는 보류했다.

사용자가 제어하는 glob을 빌드 도구에 공급하거나 ExcelJS 간접 uuid 동작을 재사용하는 경로가 있는지는 배포 맥락에 맞는 별도 도달성 검토가 필요하다. advisory 잔존을 운영 공격 가능성 확정이나 무위험으로 단정하지 않는다.

## DB·화면·공유 환경

- 기본 read-only DB MCP에서 list_tables → describe_table(tb_id_sequence) 순서로 자료형 metadata만 확인했다. 행·연결 문자열·자격증명은 조회하지 않았다. 새 driver의 실제 DB 연결 시험은 아니다.
- API·SQL·스키마 변경이 없으므로 마이그레이션/롤백 SQL 대상이 아니다.
- 새 화면 변경은 없다. 기존 동작 수정의 합성 화면 증거는 [결과 012](20261118_012_quick-date-race_결과.md)와 앞선 단계에 있다.
- 커밋·푸시·공유 node_modules 교체는 하지 않았다. 공유 개발 서버는 기존 설치이므로 새 lock의 검증 근거는 격리 설치다.

## 복사용 커밋 문구

```text
chore: 호환 범위의 라우터와 Java 의존성 업데이트

- 프론트 patch 네 package와 Tomcat·JDBC·FileUpload 갱신
- Java 8 API/bytecode 및 기존 백엔드 오류 전후 비교
- 미패치 advisory와 런타임 검증 한계 기록
```

커밋은 생성하지 않았다.
