# Dependency remediation boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 경고 숫자가 아닌 실제 사용 artifact까지 수정할 수 있는 신뢰 가능한 의존성 경로를 판정한다.

**Architecture:** 소스·lock은 유지하며 registry/GitHub 공식 metadata와 설치된 vendor browser entry만 읽는다. 공식 패치/지원 경로가 없거나 실제 bundle 수정을 보장하지 못하는 후보는 적용하지 않는다.

**Tech Stack:** npm metadata, gh CLI, Node read-only package/bundle metadata.

---

### Task 1: 공식 배포와 upstream

- [x] picomatch latest 4.0.7과 공식 권고의 first_patched_version 부재를 확인했다.
- [x] 권고 참조 micromatch/picomatch PR 194는 OPEN/미병합이며 채택된 수정 버전으로 취급할 수 없다.
- [x] ExcelJS latest 4.4.0 및 공식 prerelease 4.4.1-prerelease.0은 둘 다 uuid ^8.3.0이다.
- [x] uuid 11 전환 PR 3085는 OPEN/미병합이고, 패치 11.1.1 제안 PR 3073도 병합되지 않았다.

### Task 2: 실제 브라우저 artifact 경계

- [x] 설치된 ExcelJS의 browser entry는 dist/exceljs.min.js다.
- [x] 그 prebundle에서 uuid v3/v5 export marker와 namespace constant가 존재함을 문자열 노출 없이 확인했다.
- [x] npm top-level override만으로 vendor가 사전 빌드한 이 artifact를 재생성하지 못한다. 설치 graph의 audit 변화만으로 실제 browser 수정 완료를 판정하지 않는다.

### Task 3: 판정

- [x] 현재 적용 가능한 공식 호환 경로를 확보하지 못했다. 코드/manifest/lock 변경 없이 결과에 BLOCKED와 재개 조건을 기록한다.
- 안전한 패치가 발표되거나 별도 검토된 vendor 소스/브라우저 rebuild·호환성 계획이 승인되면 신규 구현 단위로 진행한다. 해당 조건 없이 이 gate를 통과시켰다고 표시하지 않는다.
