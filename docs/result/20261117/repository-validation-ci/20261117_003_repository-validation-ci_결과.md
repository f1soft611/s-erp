# 저장소 검증 환경 정합성 및 CI 결과

## 범위와 진행 상태

- **최종 발행 범위:** 후속 사용자 요청에 따라 구매 코드와 F1-Grid 문서의 구매 적용 안내를 철회했다. 구매 내용은 [담당자 변경 요청](20261117_003_purchase-owner-request.md)으로만 정리하며, 테마 테스트·검증 스크립트·CI·이번 조사 문서와 참고 자료만 커밋·푸시한다.
- [작업지시서](../../../directions/20261117/20261117_003_repository-validation-ci_작업지시서.md) → [계획서](../../../plan/20261117/20261117_003_repository-validation-ci_계획서.md) → [상세사양서](../../../spec/20261117/20261117_003_repository-validation-ci_상세사양서.md) 순서로 진행했다.
- 공유 4173 서버가 계속 실행 중이므로 종료하거나 원본 `node_modules`를 교체하지 않았다. `.worktrees/validation-ci`에 격리 설치하여 먼저 검증했다. 원본 설치 교체 완료로 해석하면 안 된다.
- 초기 전체 검증 기준은 `45c5669d`와 임시 구매 변경을 포함한 당시 변경이다. 구매 철회 후 집중 검증은 원격과 일치하는 `108cc117`로 격리 worktree 기준을 갱신하여 실행했다. 원본에서 동시 진행되는 다른 미커밋 작업은 덮어쓰거나 이번 커밋에 포함하지 않았다.
- 백엔드, API 계약, DB, 스키마, 의존성 버전은 변경하지 않았다. 실 DB 접근 위험이 있는 백엔드 전체 테스트와 CI는 이번 범위에서 실행·추가하지 않았다.

## 1. 잠금 파일 설치

격리 worktree의 `frontend`에서 `npm ci --no-fund --no-audit`로 379개 패키지를 설치했다.

| 구분 | 실제 Vite | 실제 Vitest | 상태 |
|---|---|---|---|
| 원본 공유 설치 | 8.2.2 | 4.1.11 | 사용 중이므로 보존 |
| 격리 설치 | 8.3.8 | 4.1.12 | 잠금 파일과 일치 |

버전은 `npm ls` 표시가 아니라 실제 설치된 각 패키지의 `package.json`에서 확인했다. 원본과 격리 공간의 `package-lock.json`은 같고 HEAD 대비 변경되지 않았다. SHA-256은 다음과 같다.

```text
A4349AE351477C8D29EE8A9FA24B9A6B086661BD26736B5B151B79DFEA78A2A3
```

이번 작업은 버전 업그레이드가 아니다. 초기 리뷰에서 확인한 ExcelJS → uuid 경로의 moderate 2건과 직접 의존성 업데이트 후보는 별도 검토 대상으로 남는다.

## 2. 회귀 조사와 최종 반영 구분

| 항목 | 재현 조건과 원인 | 최소 수정 | 회귀 검증 |
|---|---|---|---|
| 구매 선택기 설정 미저장 | 세 선택기의 `F1Grid`에 저장키가 없어 저장 효과가 실행되지 않음 | 임시 검증 후 철회. 담당자 요청으로만 전달 | 임시 적용 때 검사·브라우저 검증 통과. 최종 소스는 키 누락 실패 유지 |
| 테마 설정 테스트 실패 | lazy 라우트의 비동기 렌더링, 하위 메뉴 없는 fixture, 무관한 업무 본문에 종속 | 실제 `DashboardPage`와 설정·알림 공급자를 직접 렌더링하고 유효한 테스트 메뉴 준비. 업무 본문만 mock | 기존 헤더·테마·화면배율 단언을 유지한 테스트 1개 통과 |

담당자에게 제안하는 키는 `purchase-order-confirm-picker`, `purchase-confirm-picker`, `purchase-request-source-picker`다. 최종 구매 소스와 구매 테스트는 변경하지 않았고, 공통 그리드 문서에 다른 담당자가 추가한 날짜 입력 안내도 보존했다.

임시 구매 변경이 있던 초기 집중 검증은 아래 명령으로 3개가 통과했다. **철회 후 같은 명령을 다시 실행한 최종 결과는 테마 1개·중복키 검사 1개 통과, 구매 키 누락 검사 1개 실패**다. 실패 출력은 철회한 세 구매 선택기만 정확히 가리킨다. 이 실패를 CI에서 제외하지 않는다.

```powershell
node .\node_modules\vitest\vitest.mjs run tests\f1-grid-storage-keys.test.ts tests\theme-settings.test.tsx --pool=threads --maxWorkers=1 --reporter=default --no-color
```

관련 구매 화면의 중간 실행에는 초기 리뷰에서도 관찰된 구매요청확정의 `replaces the grid on every request load instead of accumulating rows` 시간 초과가 남았다. 이를 해결했다고 표현하지 않는다.

## 3. 미완료 문서작성 테스트 조사

- 잠금 설치의 기본 fork 풀에서는 워커 시작 응답 시간 초과가 재현됐다. 이는 테스트 본문 실패와 구별하고 단일 threads 워커로 다시 실행했다.
- `document-write-page.test.tsx`는 **715.55초 후 정상적으로 결과를 반환**했다. 157개 중 **128개 통과, 29개 실패**이며 실패 29개는 모두 기존 5초 또는 15초 시간 제한 초과다.
- 앞선 전체 실행의 미완료만으로 제품의 무한 루프나 영구 정체라고 결론 내릴 수 없다.
- `marks an ambiguous upload as unknown and does not retry it automatically`는 단독 선택 실행에서도 5초 시간 초과를 재현했다. 따라서 파일 전체 누적이나 기본 병렬 풀만이 유일한 원인이라고 단정하지 않는다.
- 시간 초과가 발생하는 정확한 렌더링·대기 단계의 근본 원인은 아직 확정하지 못했다. 후속 프로파일링이 필요하며 문서작성 제품 코드·테스트와 본문의 시간 제한은 변경하지 않았다.
- 실패를 숨기는 테스트 제외, skip 추가, 전역 테스트 시간 제한 상향은 하지 않았다.

재현 명령:

```powershell
node .\node_modules\vitest\vitest.mjs run tests\document-write-page.test.tsx --pool=threads --maxWorkers=1 --reporter=verbose --no-color
node .\node_modules\vitest\vitest.mjs run tests\document-write-page.test.tsx --pool=threads --maxWorkers=1 --testNamePattern="marks an ambiguous upload as unknown and does not retry it automatically" --reporter=default --no-color
```

## 4. CI와 초기 전체 검증 이력

`.github/workflows/frontend-ci.yml`에 PR, `main`·`socra710` push, 수동 실행용 프론트엔드 CI를 추가했다.

- Node.js 22와 `npm ci`로 lint, 타입/빌드, 전체 테스트를 각각 실행한다.
- `frontend-required`는 세 검사 전체가 성공했을 때만 성공한다. 실패·취소·건너뜀을 성공으로 처리하지 않는다.
- `contents: read`, SHA 고정 checkout/setup-node, checkout 인증정보 비보존, 동시 실행 정리와 실행 시간 제한을 사용한다.
- 잠금 설치의 전체 실행이 공유 Windows 환경에서 20분을 초과하여 matrix job의 상한은 40분으로 정했다. 이는 CI 작업의 상한이며 개별 테스트 시간 제한을 늘린 것이 아니다.
- `continue-on-error`나 테스트 제외 목록은 없다.

| 검증 | 결과 |
|---|---|
| 공식 actionlint 1.7.12 | 통과. 다운로드 체크섬을 upstream 값과 대조 |
| `npm run lint` | 오류 0, 기존 경고 181, 종료 코드 0 |
| `npm run typecheck` | 통과 |
| `npm run build` | 통과 |
| `npm run test:ci` | 구매 임시 변경 철회 전 기록: 종료 코드 1. 205개 파일 중 183개 통과·22개 실패, 2,362개 테스트 중 2,242개 통과·120개 실패. 1,986.23초 |

전체 테스트 명령은 `vitest run --pool=threads --maxWorkers=2 --reporter=default`다. 집중 검증 통과를 전체 테스트 통과로 확대 해석하지 않는다.

철회 전 전체 실행에서도 저장키 테스트 2개와 테마 테스트 1개는 통과했다. 문서작성은 이 실행에서 134개 통과·23개 실패였다. 이 중 22개는 시간 초과, 1개는 `adds selected references from the detail menu and refreshes the system timeline`에서 `문서 더보기` 버튼을 찾지 못한 실패다. 단독 실행의 128개 통과·29개 시간 초과와 결과가 달라 실행 부하·워커 구성에 따른 시간 민감성과 비동기 UI 대기를 후속 조사해야 한다.

잔여 실패 파일은 다음과 같다. 경로 기준은 `frontend/tests`이며 개별 실패를 모두 동일 원인으로 분류하지 않았다.

| 파일 | 실패 |
|---|---:|
| `menu-management-f1-grid.test.tsx` | 24 |
| `document-write-page.test.tsx` | 23 |
| `notice-page-local-updates.test.tsx` | 18 |
| `feed-components.test.tsx` | 11 |
| `dashboard-sidebar.test.tsx` | 10 |
| `draft-form-management.test.tsx` | 5 |
| `f1-grid-context-menu.test.tsx` | 4 |
| `purchase-order-status.test.tsx` | 4 |
| `document-link-content.test.tsx` | 3 |
| `role-management-notification.test.tsx` | 3 |
| `menu-management-required-selection.test.tsx` | 2 |
| `overview-page.test.tsx` | 2 |
| `purchase-order-create.test.tsx` | 2 |
| `archive-page.test.tsx` | 1 |
| `document-approval-toolbar.test.tsx` | 1 |
| `document-status-hooks.test.tsx` | 1 |
| `draft-form-template-dialog.test.tsx` | 1 |
| `f1-grid-docs.test.tsx` | 1 |
| `login.test.tsx` | 1 |
| `notice-page.test.tsx` | 1 |
| `purchase-request-confirm.test.tsx` | 1 |
| `rich-text-editor-clipboard.test.ts` | 1 |

전체 오류 출력에는 시간 초과 외에도 로그인 필드·프로필 버튼·아이콘 등을 찾지 못하는 실패가 있다. 예를 들어 `dashboard-sidebar.test.tsx:8-26`은 App의 lazy 로그인 화면을 기다리지 않고 동기 `getByLabelText`를 호출한다. 이 패턴과 전역 메뉴 fixture를 후속 조사 우선 대상으로 삼되, 이번에는 다른 화면의 단언과 fixture를 일괄 변경하지 않았다.

초기 리뷰와 이번 전체 실행은 설치 버전과 워커 구성이 다르다. 실패 개수 감소를 이번 수정만의 효과로 계산하지 않으며, 잔여 120개 모두의 변경 전후 회귀 여부를 확인했다고 주장하지 않는다. 현재 전체 테스트 실행은 실패 상태이며 이를 성공으로 처리하지 않도록 CI를 구성했다.

초기 전체 검증 시점에는 CI 파일이 로컬 변경이었다. 후속 요청으로 비구매 변경의 커밋·푸시·현재 브랜치 동기화를 진행하는 범위로 바뀌었다. 발행 해시와 원격 실행 접수 상태는 최종 응답에서 보고한다. 원격 보호 정책은 변경하지 않으며, 조회의 404만으로 정책 부재를 확정하지 않는다.

## 5. 구매 제안의 임시 브라우저 검증 자료

아래는 저장키를 임시 적용했을 때의 제안 검증 자료이며 **최종 소스의 적용 완료 증거가 아니다**. 실제 세 선택기를 합성 데이터와 페이지 한정 mock으로 렌더링했다. 실제 로그인·테넌트 데이터는 사용하지 않았다. 각각 다른 열 너비 222/244/266px의 복원과 문서 수준 가로 넘침 없음을 375/768/1280px에서 확인했다. 당시 9개 경우가 통과했으며 그리드 내부 스크롤은 허용한다.

| 선택기 | 모바일 | 태블릿 | 데스크톱 |
|---|---|---|---|
| 발주 확정 품목 | [375](screenshots/order-confirm-375.png) | [768](screenshots/order-confirm-768.png) | [1280](screenshots/order-confirm-1280.png) |
| 구매요청확정 | [375](screenshots/purchase-confirm-375.png) | [768](screenshots/purchase-confirm-768.png) | [1280](screenshots/purchase-confirm-1280.png) |
| 확정 대상 구매요청 | [375](screenshots/request-source-375.png) | [768](screenshots/request-source-768.png) | [1280](screenshots/request-source-1280.png) |

사용한 세 저장키는 원래 값으로 복원했다. 검증용 HTML과 생성한 브라우저 탭만 제거했고 공유 서버와 사용자 세션은 유지했다.

구매 철회 후 `frontend/src/pages/materials`의 diff가 비어 있음을 확인했다. 테마 테스트, npm 스크립트, workflow는 원본과 격리 worktree가 동일하며 공통 그리드의 다른 담당자 안내는 커밋 대상에서 제외한다.

## 남은 적용 단계

1. 공유 서버 사용 종료를 확인한 뒤 원본 `frontend`에서 동일한 `npm ci`를 실행한다. 현재 원본 설치 불일치는 남아 있다.
2. 구매 담당자가 전달 문서를 기준으로 저장키 누락과 구매 관련 잔여 실패를 처리한다. 문서작성 등 다른 실패도 업무별로 조사하며 제외·시간 제한 완화로 숨기지 않는다.
3. 발행 후 GitHub 실행 결과를 확인한다. `frontend-required`의 원격 강제 적용은 별도 보호 정책 설정이며 이번 요청의 커밋·푸시·브랜치 동기화와 구별한다.

## 복사 가능한 커밋 메시지

```text
ci: 프론트엔드 필수 검사와 테마 회귀 검증 추가

- 테마 테스트 fixture를 실제 설정 헤더에 집중하도록 보완
- 잠금 설치 기반 lint, 타입, 빌드, 전체 테스트 CI 추가
- 구매 코드는 제외하고 담당자 변경 요청과 검증 이력 정리
```

커밋·푸시는 후속 사용자 요청에 따라 이번 비구매 변경만 대상으로 한다. 다른 담당자의 미커밋 변경은 보존한다.

## Flow 게시 및 기본 프로젝트 후속 반영

- [Flow 게시글](https://flow.team/l/QzDVF): 프로젝트 `3005724`, 게시글 `88324869`. 작업 결과와 구매 담당자 요청서 전문·GitHub 원문 링크를 포함하여 등록하고 본문을 다시 조회했다.
- 사용자가 확인한 `3005724` / `iPlusMES 신규 버전 개발 소통방`을 루트 `AGENTS.md`의 Flow MCP 기본 사용 규칙에 추가했다. 다른 프로젝트를 명시하지 않으면 각 도구 호출에 이 번호를 사용한다.
- 현재 CLI 문서의 MCP 연결 설정에는 기본 프로젝트 항목이 문서화되어 있지 않다. 따라서 서버 연결 JSON에 임의 키를 넣은 것이 아니라 에이전트의 기본 호출 인수를 설정한 것이다. 서버 URL·인증·DB 설정은 변경하지 않았다.
- 문서·사용 규칙만 변경했으며 UI 변경이나 추가 스크린샷 대상은 없다. Flow 등록은 MCP 재조회로 검증했다.
- 이 후속 사용 규칙·문서 변경은 로컬 반영이며 앞서 발행한 `37a48b0d`에 포함된 것으로 표현하지 않는다. 후속 요청에 없는 추가 커밋·푸시는 수행하지 않았다.
