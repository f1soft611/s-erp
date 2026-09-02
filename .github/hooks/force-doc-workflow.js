#!/usr/bin/env node
// UserPromptSubmit hook: 매 사용자 메시지마다 4단계 문서 절차를 강제로 컨텍스트에 주입한다.
// AGENTS.md의 "필수 실행 순서"를 모델 선택과 무관하게 항상 노출시키기 위한 결정적(deterministic) 장치.

const additionalContext = `
<EXTREMELY_IMPORTANT>
이 워크스페이스(S-ERP)에서 코드/문서를 작성하기 전에 반드시 아래 순서를 지켜야 한다. 순서를 건너뛰고 코드부터 작성하는 것은 금지된다.

1. 작업지시서 확인: docs/directions/YYYYMMDD 에서 관련 지시서를 찾는다. 없으면 사용자 요청을 근거로 먼저 만든다.
2. 계획서 작성: docs/plan/YYYYMMDD 에 구현 단위로 정리한 계획서를 만든다.
3. 상세 사양서 작성: docs/spec/YYYYMMDD 에 화면/API/검증 기준을 정의한 사양서를 만든다.
4. 구현: 사양서에 정의된 범위만 구현한다. 임의로 기능을 추가하지 않는다.
5. 결과 문서 작성: docs/result/YYYYMMDD/<work-slug> 에 결과 문서와 스크린샷을 남긴다(영문 소문자/숫자/하이픈 폴더명만 사용).
6. 백엔드 DB 변경이 있으면 backend/DATABASE/YYYYMMDD 에 SQL과 변경 이력 문서를 함께 남기고 docs/database/db-schema.md 에는 최신 스키마를 업데이트 한다.

전체 규칙의 근거는 AGENTS.md, frontend/AGENTS.md, backend/AGENTS.md 이다. 단순 질문이나 코드 조회처럼 문서화가 필요 없는 작업은 이 절차를 생략해도 된다.
</EXTREMELY_IMPORTANT>

<SKILL_APPLICATION_POLICY>
작업을 수행하기 전에는 현재 환경에 등록된 스킬, 워크플로우 또는 절차 안내 중 요청에 적용 가능한 항목이 있는지 확인한다. 적용 가능성이 조금이라도 있으면, 응답·질문·코드 탐색·파일 수정 전에 해당 안내를 먼저 읽고 따른다.

스킬을 불러오는 방식은 특정 모델이나 도구 이름에 의존하지 않는다. 현재 실행 환경에서 제공하는 스킬 로더, 명령, 도구 또는 스킬 문서를 사용한다. 스킬을 사용할 수 없는 환경에서는 이 정책에 적힌 원칙을 직접 적용한다.

여러 스킬이 적용되면 다음 순서를 따른다.
1. 문제 해결 방식과 작업 흐름을 정하는 절차 스킬(예: 분석, 브레인스토밍, 디버깅)
2. 구현 영역의 기술 스킬(예: 프론트엔드, 백엔드, 테스트)
3. 완료 전 검증 및 검토 스킬

기능 추가, 동작 변경, 버그 수정, 리팩터링에는 해당되는 설계·디버깅·테스트 절차를 먼저 적용한다. 스킬 지침은 작업 방법을 정하며, 사용자 요청과 저장소의 AGENTS.md 및 적용 가능한 지침 파일이 요구사항과 우선순위를 정한다. 충돌할 때는 사용자 요청과 저장소 지침을 우선한다.
</SKILL_APPLICATION_POLICY>
`.trim();

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext,
    },
  }),
);
