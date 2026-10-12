# DB MCP 에이전트 사용 지침 명확화 결과

## 작업 결과

- 루트 [AGENTS.md](../../../../AGENTS.md)의 DB 작업 원칙을 보강해 구현 전
  `s-erp-postgresql-readonly` MCP 도구를 직접 호출하고, 연결 안내나 문서 확인만으로
  MCP 조회를 대체하지 않도록 명시했다.
- [DB MCP 전용 instruction](../../../../.github/instructions/database-mcp.instructions.md)에
  `list_tables` → 필요한 테이블 `describe_table` → 메타데이터로 답을 확인할 수
  없을 때만 제한된 `query_readonly` 순서를 정리했다.
- tenant DB가 명시적으로 필요한 경우에만 tenant 서버를 선택하고, tool이
  노출되지 않거나 호출 실패 시 live MCP 확인을 완료하지 못했다고 보고한 뒤
  VS Code 서버 시작·신뢰 및 새 세션 확인을 안내하도록 했다.
- `.env`, 연결 자격 증명, MCP 설정, 서버 구현, 기존 사용자용 연결 사양서는
  변경하지 않았다.

## 검증

| 확인 항목 | 결과 |
| --- | --- |
| MCP 등록 서버와 전송 유형 대조 | 통과: 기본 및 tenant 항목 모두 stdio |
| MCP 구현에서 도구명 대조 | 통과: `list_tables`, `describe_table`, `query_readonly` |
| workspace MCP 설정 회귀 테스트 | 통과: `src/mcpConfig.test.ts` 1개 |
| 변경한 지침의 민감 연결값 패턴 확인 | 일치 항목 없음 |
| 지침 및 문서 링크 대상 경로 확인 | 통과 |
| `AGENTS.md`, database MCP instruction `git diff --check` | 통과 |
| `.mcp.json` 및 사람용 연결 사양서가 이번 변경에서 제외됨 | 확인 |
| VS Code에서 실제 MCP 서버 시작·신뢰 및 새 세션 도구 확인 | 수행하지 않음 |
| MCP를 통한 DB 조회 | 수행하지 않음 |

## 산출물

- [작업지시서](../../../directions/20261012/20261012_009_DB_MCP_에이전트_사용지침_명확화_작업지시서.md)
- [계획서](../../../plan/20261012/20261012_009_DB_MCP_에이전트_사용지침_명확화_계획서.md)
- [상세 사양서](../../../spec/20261012/20261012_009_DB_MCP_에이전트_사용지침_명확화_상세사양서.md)
- [설계 문서](../../../superpowers/specs/2026-10-12-db-mcp-agent-instructions-design.md)
- [실행 계획](../../../superpowers/plans/2026-10-12-db-mcp-agent-instructions.md)

UI 변경이 없어 스크린샷은 해당하지 않는다.
