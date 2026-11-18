# 공통 테스트 계약 정합성 결과

## 범위와 원인

- [계획서](../../../plan/20261118/20261118_003_shared-test-contracts_계획서.md)
- [상세사양서](../../../spec/20261118/20261118_003_shared-test-contracts_상세사양서.md)
- 공통 클립보드 테스트가 탭을 ` | `로 치환한다고 잘못 기대했다. 현재 구현과 기존 공지 clipboard 검증은 탭을 보존한다.
- 문서 현황 훅 테스트가 이미 제거된 세 번째 인자 `onLoadStart`를 전달하고 호출 횟수를 기대했다. 실제 공개 인자에 맞추고 요청 횟수·로딩 상태·이전 요청 취소·늦은 응답 무시 단언을 보존했다.
- 운영 코드·UI·API·DB는 변경하지 않았다. 신규 스크린샷 대상이 아니다.

## 재현과 검증

| 검증 | 결과 |
|---|---|
| 수정 전 잠금 설치: 현황 훅 4개 | 1개 실패: 제거된 콜백의 호출이 0회 |
| 수정 전 잠금 설치: 클립보드 3개 | 1개 실패: 탭과 파이프 불일치 |
| 수정 후 공유 설치: 두 파일 + 공지 clipboard | 27개 통과, Vitest 4.1.11 |
| 수정 후 잠금 설치: 위 세 파일 + storageKey 검사 | 29개 통과, Vitest 4.1.12 |

```powershell
node .\node_modules\vitest\vitest.mjs run tests\document-status-hooks.test.tsx tests\rich-text-editor-clipboard.test.ts tests\notice-clipboard.test.ts tests\f1-grid-storage-keys.test.ts --pool=threads --maxWorkers=1 --reporter=default --no-color
```

수정 diff는 제거된 계약과 현재 계약의 대응을 직접 확인했다. 오류·retry·상세 상태·HTML 안전성·표 구조 단언은 삭제하지 않았다. 타입·lint는 전체 복구의 최종 정적 검사에서 다시 확인한다.

## 공유 환경 기준 변경

- 공유 브랜치가 `9a9b0729`에서 `e9ba60f6`으로 이동했다. 별도 작업의 99개 프론트 변경 파일을 전용 검증 worktree에 패치로 반영하고, 각 blob hash가 고정 기준과 일치함을 확인했다. 공유 브랜치를 merge/reset하지 않았다.
- 새 검증 worktree의 Git HEAD 자체는 최초 기준이다. 위 잠금 검사는 **`e9ba60f6` 프론트 소스 오버레이 + 이번 복구 변경** 기준이며 최초 커밋 그대로의 검사로 표시하지 않는다.
- 선택기 storageKey 3개 누락은 별도 커밋에서 이미 해결되어 이 작업에서 중복 수정하지 않았다. 위 저장키 검사 2개가 통과한다.
- 진행 중이던 옛 기준 일괄 검사는 중단했다. 최종 보고서가 생성되지 않았으므로 해당 실행을 통과/실패 집계 근거로 사용하지 않는다.
- 아직 전체 프론트 테스트 통과를 뜻하지 않는다. 다음 조치는 남은 업무별 실패 복구다.

## 복사용 커밋 문구

```text
test(shared): 현황 훅과 클립보드 검증 계약 동기화

- 현황 요청 취소·로딩을 현재 훅 인자로 검증
- 일반 텍스트의 탭 보존과 줄바꿈 정규화 기대값 정정
```

커밋은 생성하지 않았다.
