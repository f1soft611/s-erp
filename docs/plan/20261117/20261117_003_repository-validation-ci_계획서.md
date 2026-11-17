# Repository Validation CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 잠금 파일 기준 검증을 재현하고 확인된 테스트 실패를 최소 수정한 뒤 프론트엔드 CI를 추가한다.

**Architecture:** 공유 서버를 보존하면서 무시된 격리 worktree에 기존 잠금 파일을 설치한다. 격리 공간에서 회귀 검증하고 자신이 수정한 파일만 원래 작업 공간에 반영한다. CI는 DB나 인증 정보 없이 프론트엔드 검사만 수행한다.

**Tech Stack:** Node.js 22, npm, React, TypeScript, Vite, Vitest, oxlint, GitHub Actions.

## 근거와 변경 파일

- [작업지시서](../../directions/20261117/20261117_003_repository-validation-ci_작업지시서.md)
- 최종 운영 소스 변경: 없음. 구매 선택기 저장키의 임시 변경은 후속 사용자 지시에 따라 철회하고 담당자 전달 내용만 남긴다.
- 테스트: `frontend/tests/theme-settings.test.tsx`를 실제 설정 헤더에 집중하도록 격리한다. 문서작성은 단독 실행 결과로 수정 필요 여부를 결정하고 원인 없이 제품 코드를 변경하지 않는다.
- CI: `.github/workflows/frontend-ci.yml`.
- 명령: `frontend/package.json`에 `typecheck`와 `test:ci`를 정의한다.
- 문서: F1-Grid 사용 문서와 결과 문서. 공유·격리 설치 상태와 기존 실패를 구별한다.

## Task 1: 잠금 파일 설치

- [x] 공유 서버가 실행 중이면 그대로 보존하고 격리 공간의 누락된 의존성을 확인한다.
- [x] 격리 `frontend`에서 `npm ci --no-fund --no-audit`를 실행한다.
- [x] 설치 전후 잠금 파일 SHA-256을 비교한다.
- [x] 실제 `node_modules/vite/package.json` 및 `vitest/package.json` 버전을 읽어 각각 `8.3.8`, `4.1.12`인지 확인한다.

## Task 2: 재현 및 원인 분리

- [x] 격리 공간에서 다음 명령으로 두 확정 실패를 재현한다.

```powershell
node .\node_modules\vitest\vitest.mjs run tests\f1-grid-storage-keys.test.ts tests\theme-settings.test.tsx --pool=threads --maxWorkers=1 --reporter=default --no-color
```

- [x] 문서작성 테스트는 별도 프로세스에서 `--pool=threads --maxWorkers=1 --reporter=verbose --no-color`로 실행해 마지막 테스트와 정상 종료 여부를 기록한다.
- [x] 단독 실행의 정상 종료와 시간 초과 29건을 구별했다. 한 실패를 이름으로 최소 재현했으며 정체·무한 루프나 통과로 표현하지 않는다.

## Task 3: 초기 검증의 최소 수정 이력

- [x] 초기 검증에서 아래 세 `F1Grid`에 고유한 값을 임시 추가했다. 최종 발행에서는 철회하고 담당자 요청으로 전환한다.

```tsx
// PurchaseOrderConfirmPicker.tsx
storageKey="purchase-order-confirm-picker"
// PurchaseConfirmPicker.tsx
storageKey="purchase-confirm-picker"
// PurchaseRequestSourcePicker.tsx
storageKey="purchase-request-source-picker"
```

- [x] `frontend/tests/theme-settings.test.tsx`는 로그인 화면의 lazy import·메뉴 fixture·업무 본문에 종속되어 실패한다. 실제 설정 헤더를 가진 `DashboardPage`를 공급자와 함께 직접 렌더링하고, 로그인 서비스의 테스트 응답 및 유효한 루트/하위 메뉴 fixture를 준비한다. `DashboardContent`만 격리하며 기존 테마·배율 단언은 그대로 유지한다.

```tsx
<MemoryRouter>
  <AppSettingsProvider>
    <NotificationProvider>
      <DashboardPage />
    </NotificationProvider>
  </AppSettingsProvider>
</MemoryRouter>
```

- [x] 같은 회귀 명령과 관련 구매 선택기 테스트를 실행한다. 기존 실패 테스트를 삭제·건너뛰기·약화하지 않는다. 집중 회귀 3개는 통과했고 관련 구매 화면의 잔여 시간 초과는 결과에 기록했다.

## Task 4: CI 검사

- [x] 다음 npm 스크립트를 추가한다.

```json
"typecheck": "tsc -b",
"test:ci": "vitest run --pool=threads --maxWorkers=2 --reporter=default"
```

- [x] PR, main·socra710 push, 수동 실행에 반응하는 `Frontend CI` workflow를 작성한다.
- [x] `contents: read`, Node.js 22, `npm ci`, 독립된 lint/build/tests job을 사용한다. 전체 실행이 20분을 초과한 측정에 따라 matrix 상한은 40분, 집계 상한은 1분으로 정한다.
- [x] 버전 고정된 checkout/setup-node action을 사용하고 upstream SHA를 확인한다.
- [x] job 실패를 무시하는 옵션과 테스트 제외 목록을 추가하지 않는다.
- [x] 세 matrix 검사 결과를 집계하는 `frontend-required` job은 모두 성공했을 때만 성공하게 한다.
- [x] YAML·Actions 문법을 검증하고 각 job의 실제 명령을 격리 공간에서 실행한다. 전체 테스트는 205개 파일을 완료했으나 120개가 실패하므로 녹색 상태는 아니다.

## Task 5: 반영과 결과

- [x] 동시 작업 파일을 보존하면서 자신이 변경한 파일만 원본에 반영한다.
- [x] 임시 구매 변경을 브라우저 9개 경우로 검증하고 스크린샷을 기록했다. 최종 발행에서는 적용 안내를 철회하고 자료는 제안 검증 이력으로만 보관한다.
- [x] 결과 문서에 설치 정합성, 집중·전체 테스트 결과, 정체 조사, CI 검증 및 원격 활성화의 한계를 남긴다.
- [x] 변경 내역과 `git diff --check`를 확인한다. 사용자 요청 없는 커밋은 만들지 않는다.

## 적용 보류와 잔여 실패

- 원본 설치 교체는 공유 서버 사용 종료를 확인하지 못해 보류했다. 격리 설치 완료와 구별한다.
- 원격 필수 검사 지정은 커밋·푸시·check 등록 이후의 적용 단계이며 수행하지 않았다.
- 초기 전체 실행의 120개 실패는 [결과 문서](../../result/20261117/repository-validation-ci/20261117_003_repository-validation-ci_결과.md)에 파일별로 기록했다. 구매 변경 철회 후 저장키 누락 실패도 다시 확인했다. 최종 전체 실행의 실패 수로 합산하거나 전체 통과로 표현하지 않는다.

## Task 6: 구매 담당자 요청으로 전환

- [x] 원본과 격리 worktree에서 이번 작업이 추가한 구매 저장키 세 개와 F1-Grid 문서의 적용 안내만 철회한다.
- [x] 담당자 요청 문서를 작성하고 기존 전체 테스트·스크린샷을 철회 전 참고 자료로 구별한다.
- [x] 구매 소스 diff가 없고 테마 테스트는 통과하며 저장키 누락은 그대로 검출되는지 확인한다.

## Task 7: 비구매 변경 발행 준비와 실행 정책

- [x] 비구매 커밋 파일 목록과 다른 담당자 변경 보존 정책을 정했다.
- [x] 원격을 fetch하고 현재 브랜치/upstream이 일치하는 상태에서 시작했다. 동시 진행된 다른 담당자의 커밋도 보존한다.
- [x] 구매 철회 후 집중 검사와 lint·타입·빌드·Actions 문법을 검증했다. 테마는 통과하고 구매 키 누락만 실패로 남는다.

이후 위 범위만 커밋·일반 push하고 현재 브랜치/upstream 해시와 GitHub CI 접수 상태를 확인한다. 실제 발행 해시와 동기화 결과는 최종 응답에 기록한다. 전체 통과·`main` 통합·원격 필수 검사 강제 적용을 주장하지 않는다.

## Task 8: Flow 게시와 기본 프로젝트 사용 규칙

- [x] 확인된 프로젝트 `3005724`에 구매 담당자 요청서 전문과 원문 링크를 포함하여 게시하고 재조회했다.
- [x] MCP 연결 설정의 지원 항목을 확인했다. 기본 프로젝트용 임의 연결 필드·헤더·URL 매개변수는 만들지 않는다.
- [x] `AGENTS.md`에 이 저장소의 Flow MCP 기본 인수 `projectId: "3005724"`와 사용자 명시 대상 우선 원칙을 추가했다.
- [x] 게시글 링크와 설정 방식의 한계를 결과 문서에 기록했다. 연결 JSON은 변경하지 않고 문서 변경 범위만 검증한다.
