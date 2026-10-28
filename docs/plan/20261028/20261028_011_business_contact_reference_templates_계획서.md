# 업무연락 자주 쓰는 참조자 계획서

## 목표

문서작성 모달의 업무연락 참조 필드에서 참조 전용 설정 모달을 열어 자주 쓰는 참조자 구성을 저장하고 적용한다. 기존 결재선 템플릿 API와 사용자별 저장 계약은 재사용하고, 기안서 결재선 설정 흐름은 유지한다.

## 근거 문서

- 작업지시서: [업무연락 자주 쓰는 참조자 작업지시서](../../directions/20261028/20261028_011_business_contact_reference_templates_작업지시서.md)
- 상세사양서: [업무연락 자주 쓰는 참조자 상세사양서](../../spec/20261028/20261028_011_business_contact_reference_templates_상세사양서.md)
- 승인 설계: [업무연락 자주 쓰는 참조자 설정 설계](../../superpowers/specs/2026-10-28-business-contact-reference-templates-design.md)
- 상세 구현 계획: [Business Contact Reference Templates Implementation Plan](../../superpowers/plans/2026-10-28-business-contact-reference-templates.md)

## 구현 범위

- 업무연락 참조 입력 옆에 반응형 `자주 쓰는 참조자` 버튼을 추가한다.
- 결재선/참조자 선택 컨트롤과 액션 버튼 높이를 참조 필드 기준 40px로 통일한다.
- 기존 설정 모달을 참조자 전용 모드로 재사용한다. 결재/합의 UI는 감추고 저장, 적용, 이름 변경, 삭제 기능은 유지한다.
- 참조 전용 템플릿만 허용하며 결재/합의 참여자가 있는 기존 문서 코드 `008` 템플릿은 부분 적용 없이 오류 안내한다.
- 모달 적용/취소의 draft 상태 경계를 유지하고 기존 기안서 설정은 회귀 없이 동작하게 한다.
- 서버/API/DB 변경은 포함하지 않는다.

## 검증

- Vitest: `npm run test -- tests/document-approval-settings-dialog.test.tsx tests/document-write-page.test.tsx`
- 빌드: `npm run build`
- 브라우저: 실제 `127.0.0.1:4173`에서 375px, 768px, 1280px 확인 및 스크린샷 저장
- 결과 문서: `docs/result/20261028/business-contact-reference-templates/`

세부 구현 순서, 테스트 시나리오, 예상 결과 및 파일 목록은 위 상세 구현 계획을 따른다.
