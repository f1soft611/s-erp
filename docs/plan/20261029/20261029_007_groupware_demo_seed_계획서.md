# Groupware Demo Seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 기존 업무를 보존하면서 댓글까지 연결된 가상 그룹웨어 데이터를 추가하는 실행 가능 SQL을 제공한다.

**Architecture:** 필수 psql 인자를 임시 테이블로 전달하고, 단일 트랜잭션에서 선행조건을 검사한 뒤 시드 마커로 식별되는 데이터만 생성한다. 문서번호는 기존 `ELECTRONIC_APPROVAL_NO` 생성기의 같은 키를 예약한다. 롤백은 사용자 변경·실제 댓글·첨부·조회 등 상호작용이 있으면 중단한다.

**Tech Stack:** PostgreSQL, psql, Node 내장 테스트, 격리 PGlite PostgreSQL 엔진.

## 기준과 파일

- [작업지시서](../../directions/20261029/20261029_007_groupware_demo_seed_작업지시서.md)
- SQL/이력: `backend\DATABASE\20261029\20261029_003_*` 및 `docs\database\20261029\20261029_003_*`
- 테스트: `tools\tests\test_groupware_demo_seed.cjs`
- 결과: `docs\result\20261029\groupware-demo-seed`

## Task 1: 계약 및 상세사양

- [x] MCP 메타데이터와 Service의 기안자 login code / 결재자 user ID 구분, 업무연락의 참조자 전용 흐름을 상세사양서에 명시한다.
- [x] 공지 8건/문서 12건, 3명 인자, 댓글 3건씩, 상태 전이 시각, 보수적 롤백 조건을 확정한다.

## Task 2: 실패 테스트와 SQL

- [x] Node 테스트에서 파일 존재·사본 일치 및 격리 DB 실행을 검증한다. 먼저 `node --test tools\tests\test_groupware_demo_seed.cjs`로 누락 실패를 확인한다.
- [x] psql 변수 전달부와 SQL 본문을 나눠 테스트하고, 저장소의 기준 DDL 및 최신 후속 제약을 격리 엔진에 로드한다.
- [x] 단일 BEGIN/COMMIT, 테넌트 잠금, 활성 사용자/공지 분류 검증, 본문 JSON/HTML/text 동기화, 번호 예약, 결재선/댓글/이벤트를 구현한다.
- [x] 재실행 시 중단하여 중복·사용자 변경 덮어쓰기를 막는다. 롤백은 마커가 있는 부모의 데이터만 제거하고 실제 상호작용은 보호한다.

## Task 3: 검증 및 결과

- [x] 정상 행 수와 부모/대댓글 관계, 모든 상태·번호 충돌 회피, 잘못된 사용자/비활성/테넌트 입력 실패, 오류 후 원자성을 확인한다.
- [x] 재실행 중단, 타 테넌트 보존, 미수정 시드 롤백, 실제 댓글·좋아요·첨부·조회·문서 수정 시 롤백 거부를 확인한다.
- [x] 양쪽 SQL/변경 이력 SHA-256 일치, `git diff --check` 후 결과 보고서에 실제 수행한 검증과 미적용 범위를 기록한다.

실DB 적용, 계정 데이터 출력, 기존 변경의 커밋은 하지 않는다. 관련 스키마 변경이 없으므로 누적 스키마 문서의 구조 항목은 변경하지 않는다.
