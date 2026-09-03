# F1Workflow 사용자 승인 게이트 계획서

## 목적

F1Workflow의 문서 우선 절차를 실제 대화 흐름에서 멈출 수 있는 두 개의 사용자 승인 게이트로 보완한다.

## 작업 범위

1. 최상위 프롬프트에 전역 하드 게이트와 금지 동작을 명시한다.
2. 브레인스토밍 스킬에 작업지시서 제시 후 승인 대기 규칙을 추가한다.
3. 설계 검증 스킬에 계획서와 사양서 제시 후 승인 대기 규칙을 추가한다.
4. 워크트리, 실행 계획, 서브에이전트, 구현, 디버깅, 검증, 코드 검토 스킬에 설계 승인 확인을 선행 조건으로 추가한다.
5. Markdown 진단과 패치 공백 검사로 수정 파일의 형식 오류를 확인한다.

## 변경 파일

- `.github/prompts/f1workflow.prompt.md`
- `.github/f1workflow/skills/02-brainstorm.md`
- `.github/f1workflow/skills/03-design-validation.md`
- `.github/f1workflow/skills/04-git-setup.md`
- `.github/f1workflow/skills/05-write-plan.md`
- `.github/f1workflow/skills/06-subagent-execution.md`
- `.github/f1workflow/skills/07-implementation-tdd.md`
- `.github/f1workflow/skills/08-systematic-debugging.md`
- `.github/f1workflow/skills/09-verification.md`
- `.github/f1workflow/skills/10-code-review.md`

## 검증 계획

- 수정 직후 각 Markdown 파일에 대해 VS Code 진단을 실행한다.
- 승인 게이트, 금지 동작, 승인 후 재개 단계가 모든 관련 문서에 있는지 텍스트 검토한다.

## 구현 전 승인 요청

본 계획서와 상세 사양서를 사용자에게 제시한 뒤, 명시적인 구현 승인 전에는 위 변경 파일을 수정하지 않는다.
