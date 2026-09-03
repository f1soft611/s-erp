# F1Workflow 사용자 승인 게이트 작업지시서

## 배경

현재 F1Workflow는 브레인스토밍, 작업지시서, 계획서, 사양서, 구현의 순서를 안내하지만, 단계 사이에 사용자 승인을 기다려야 한다는 중단 규칙이 일관되게 정의되어 있지 않다. 이 때문에 문서 작성 직후 구현 단계로 진행할 수 있다.

## 목표

F1Workflow가 다음 순서를 반드시 따르도록 프롬프트와 연결 스킬 문서를 보완한다.

1. 브레인스토밍을 수행한다.
2. 작업지시서를 작성하고 사용자에게 제시한다.
3. 작업지시서 범위에 대한 사용자 승인을 받는다.
4. 계획서와 상세 사양서를 작성하고 사용자에게 제시한다.
5. 계획서와 상세 사양서에 대한 사용자 승인을 받는다.
6. 승인 후에만 워크트리 설정, 실행 계획, 서브에이전트 실행, TDD 및 구현을 진행한다.

## 범위

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

## 제외 범위

- 프론트엔드와 백엔드 애플리케이션 코드 변경
- DB 스키마 및 API 계약 변경
- VS Code Hook 또는 외부 자동화 도구를 통한 도구 호출의 기술적 차단

## 완료 기준

- 브레인스토밍과 작업지시서 승인 전에는 계획, 사양, 구현으로 진행하지 않는 규칙이 문서화된다.
- 계획서와 사양서 승인 전에는 워크트리, 실행 계획, 서브에이전트, 테스트 작성, 코드 수정이 금지된다.
- 승인 요청 문구와 재작업 흐름이 명시된다.
- 수정한 Markdown 문서에 진단 오류가 없다.
