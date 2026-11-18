# 제한적 호환 의존성 업데이트 상세사양서

## 근거와 적용

- [계획서](../../plan/20261118/20261118_013_compatible-dependencies_계획서.md)
- 프론트엔드: react-router-dom/react-router 7.18.2→7.18.5, @testing-library/react 16.3.2→16.3.3. React/MUI/Tiptap/TypeScript/Vitest는 유지한다.
- lock 생성에 따라 router의 기존 허용 범위 안에서 set-cookie-parser 2.7.2→2.7.3도 동반 갱신한다. 총 네 package이며 override는 추가하지 않는다.
- 백엔드: Tomcat 다섯 artifact 9.0.91→9.0.124, pgJDBC 42.6.0→42.7.14, FileUpload 1.5→1.6.0. Java 8 기준과 javax/Spring/eGovFrame 계층을 유지한다.
- 공개 props/API/DB/SQL·데이터 구조·권한은 변경하지 않는다.

## 보안 잔존

- [picomatch advisory](https://github.com/advisories/GHSA-fc5q-39xc-vjpf): 2026-11-18 확인 시 patched version 없음, npm 최신 4.0.7도 영향 범위다.
- [uuid advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq): ExcelJS 간접 의존성에 남는다. 강제 major override/ExcelJS downgrade는 제외한다.
- npm advisory의 영향을 받는 package 수와 독립 advisory 수를 구별한다. update 후에도 잔존 위험을 숨기지 않는다.

## 검증과 안전

- 새 exact-lock에서 프론트엔드 타입·lint·build·전체 회귀를 수행한다.
- 새 lock의 전체/문서 파일 비교가 timeout으로 실패하여, 격리 환경에 한해 기존 lock 동일 파일·동일 worker 비교를 한 번 수행한다. source·제한 시간은 고정하며 새 설치를 복원한다. 이 비교도 전체 실패를 통과로 바꾸는 근거로 사용하지 않는다.
- 백엔드는 비공개 profile 파일 없는 bf6cf0bb baseline과 동일한 환경으로 전후 비교한다. 기존 두 환경설정 파일 오류를 통과나 업데이트 회귀로 표현하지 않는다.
- 전체 운영 Java를 --release 8로 컴파일하고 업데이트 jar 기본 class version을 확인한다.
- 실제 Commons IO는 기존 eGov 경로의 2.16.1로 유지된다. FileUpload 선언의 2.19.0과 차이를 기록하고, 실제 참조 API 및 메모리/디스크 multipart 파싱을 격리 확인한다. 전체 업로드 저장소 연결 시험을 대신하지 않는다.
- 기본 read-only DB MCP의 테이블 목록과 공통 자료형 metadata만 조회했다. 행·연결 문자열·자격증명은 조회/기록하지 않는다. driver 실 DB 시험과 별개다.
- 스키마·데이터 변경이 없어 마이그레이션/롤백 SQL은 만들지 않는다.
- 공유 node_modules와 비공개 properties는 변경하지 않는다. 실제 Java 8 런타임·실 DB 연결은 별도 검증 범위다.
