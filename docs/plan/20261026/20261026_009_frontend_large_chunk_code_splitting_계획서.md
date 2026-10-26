# 프론트엔드 대용량 청크 경고 해소 계획서

## 목적

초기 `index` JavaScript 청크가 1,000 kB warning limit를 넘는 문제를 경고 임계값 상향 없이 해결한다. 최종 승인 범위는 라우트 페이지와 로그인 공지 팝업 호스트의 코드 분할이며, 대시보드 내부 화면 선택 및 렌더링 동작은 보존한다.

## 변경 파일 및 역할

| 파일 | 변경 목적 |
|---|---|
| `frontend/src/routes/AppRouter.tsx` | 라우트별 페이지를 동적으로 가져오고 공통 suspense fallback을 표시 |
| `frontend/src/App.tsx` | 로그인 공지 팝업 호스트의 정적 import를 지연 로드로 변경 |
| `frontend/tests/app-router-not-found.test.tsx` | lazy route의 비동기 페이지 표시와 기존 경로/인증 동작 확인 |
| `docs/result/20261026/frontend-large-chunk-code-splitting/` | 빌드, 회귀 테스트, 브라우저 결과와 캡처 기록 |

## 실행 순서

1. 기존 dirty 파일 변경을 먼저 검토하고 이번 수정과 병합할 내용을 분리한다.
2. 라우터 회귀 테스트가 lazy route의 비동기 렌더를 기다리도록 보강한다.
3. `AppRouter` 페이지 모듈을 `React.lazy`로 바꾸고 `AppLoadingSpinner` suspense fallback을 연결한다.
4. route-only split의 비교 빌드가 `DashboardPage` 476.38 kB, 최대 chunk `vendor-exceljs` 929.57 kB로 모든 chunk를 limit 아래에 둠을 확인하고 대시보드 내부 동기 화면 경계를 보존한다.
5. `NoticeLoginPopupHost`를 lazy import로 바꾸고 팝업 host 자체의 대기 상태는 앱 화면을 막지 않도록 비어 있는 fallback을 사용한다.
6. 라우터 테스트와 관련 화면 테스트를 실행하고 기준 실패를 확인한다. 작업 중 사용자에 의해 보강된 mock/timeout 변경을 보존한다.
7. `npm run build`로 warning이 사라졌는지와 각 chunk 크기를 확인한다. 기준을 높이지 않는다.
8. 사용 가능한 브라우저에서 dashboard 화면 진입을 확인하고 영문 소문자 slug 결과 폴더에 캡처한다.
9. 날짜별 결과 문서를 작성하고 `git diff --check` 및 변경 범위를 점검한다.

## 검증 명령

```powershell
Set-Location frontend
npm run test -- tests\app-router-not-found.test.tsx
npm run build
git diff --check
```

## 위험 및 대응

- Lazy route는 기존 동기 단언을 비동기 `findBy*`로 바꾸어 테스트한다.
- Dashboard 내부 페이지 분리는 빌드 청크 크기가 warning limit 아래이며 동기 화면 테스트에 영향이 있어 이번 범위에서 제외한다.
- 기존 사용자 변경이 있는 같은 파일은 수정 전에 diff를 읽고 보존한다.
- 코드 분할 뒤에도 chunk가 warning limit를 넘으면 경고를 숨기지 말고 해당 모듈 경계를 추가 조사한다.
