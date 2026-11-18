# Backend configuration fixtures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 비공개 profile 없이 실제 MinIO 설정 주입과 공개 Swagger 기본 설정을 재현 가능하게 검사한다.

**Architecture:** 운영 코드는 그대로 둔다. MinIO factory parameter의 실제 Value annotation과 Spring의 dependency resolver를 사용해 인메모리 가상 값의 상위 설정/환경변수 fallback 해석을 검사하고 실제 client bean을 생성하되 연결하지 않는다. Swagger는 추적 중인 공통 application.properties의 공개 설정만 읽는다.

**Tech Stack:** Java 8 문법, JUnit 5, Spring MockEnvironment/AnnotationConfigApplicationContext, Maven.

---

### Task 1: 계약과 RED

- [x] 오류 두 개와 private profile 읽기 지점을 확인했다. 운영 source의 민감한 기본값은 출력하지 않았다.
- [x] 공통 application.properties의 springdoc.packages-to-scan은 기존 두 공개 패키지다.
- [x] 소유 격리 환경에 최신 tracked backend 1,235개만 반영했다. 기존 두 파일 집중 실행은 5개 중 오류 2개를 재현했다. private profile은 복사하지 않았다.

### Task 2: 최소 테스트 변경

**Files:**
- `backend/src/test/java/egovframework/com/config/MinioStorageConfigTest.java`
- `backend/src/test/java/egovframework/com/security/SecurityConfigTest.java`

- [x] 실제 factory parameter의 네 storage 설정과 환경변수 fallback annotation을 검사했다. 실제 default 값을 출력하거나 기대값으로 복제하지 않았다.
- [x] MockEnvironment 두 시나리오에서 Spring의 실제 dependency resolver로 primary 우선과 fallback을 검증했다. 값은 실패 메시지에 출력하지 않는다.
- [x] 실제 MinioStorageConfig client bean 생성과 기존 SDK 단일 버전 검증을 확인했다.
- [x] Swagger 검증을 공개 common 설정의 정확한 패키지 집합으로 옮겼다. whitelist·component scan 검증은 유지했다.

### Task 3: 전체 검증과 동기화

- [x] 집중 5/5 통과, 최종 전체 clean test 1,286개 중 failure 0/error 0/기존 skip 3이다. Java 8 API clean compile도 exit 0이다.
- [x] 운영 Java/설정/POM/API/DB 변경과 source skip 추가는 0이다.
- [x] 결과에 배포 profile 검증 한계·실 storage 미접속과 격리 snapshot 정합성 보정을 기록했다.
- [ ] 사용자 승인 범위에서 이 단위만 커밋·non-force push한다.
