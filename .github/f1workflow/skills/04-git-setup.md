# 04. Git 워크트리 설정 스킬 (04-git-setup)

> **Superpowers `using-git-worktrees` 기반**: 메인 작업 공간과 분리된 독립된 작업 환경(Git Worktree)을 구성하여 변경 사항을 격리하고 안전하게 개발을 진행합니다.

---

## 🚦 사전 승인 조건 (절대 규칙)

- 03단계에서 작성한 계획서와 상세 사양서를 사용자가 명시적으로 구현 승인한 경우에만 이 스킬을 사용합니다.
- 승인 기록이 없거나 사용자의 응답이 질문, 검토 의견, 추가 요구사항, 모호한 긍정 표현이면 워크트리를 생성하거나 빌드·테스트 기준선을 실행하지 않습니다.
- 이 경우 계획서와 사양서를 다시 제시하고 구현 승인 요청 상태를 유지합니다.

---

## 📋 수행 지침

### 1. 작업 격리 필요성 판단

- 새로운 기능 추가나 대규모 수정, 독립된 실험적 작업 시 Git Worktree 생성을 검토합니다.
- 기존 작업 공간이 깨끗한 상태인지 `git status`로 점검합니다.

### 2. Worktree 생성 명령어 예시

```bash
# Feature 브랜치 기반 독립 Worktree 생성
git worktree add feature/[task-slug]
cd feature/[task-slug]

# 의존성 설치 및 빌드 확인
# 프론트엔드
cd frontend && npm install

# 백엔드
cd backend && mvn clean compile
```

### 3. Baseline 빌드/테스트 검증

- 작업 공간 진입 후 기존 테스트가 이상 없이 동작하는지 사전에 검증합니다.
