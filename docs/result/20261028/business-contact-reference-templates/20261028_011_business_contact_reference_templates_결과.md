# 업무연락 자주 쓰는 참조자 결과

## 구현 결과

- 업무연락 작성의 참조 필드 옆 `자주 쓰는 참조자` 버튼으로 기존 설정 모달을 참조자 전용 모드로 연다.
- 참조자 전용 모드는 결재/합의 편집 없이 사용자별 템플릿을 저장·조회·이름 변경·삭제한다. 저장 데이터는 문서 코드 `008`의 순서가 보존된 `REFERENCE` 참여자만 포함한다.
- 기존 `008` 템플릿에 결재/합의 단계가 섞인 경우 일부 적용하지 않고 오류를 표시한다. 정상 템플릿은 모달의 임시 참조자만 바꾸며 `적용` 전까지 작성 화면 상태는 변경하지 않는다.
- 결재선/참조자 입력과 각 액션 버튼 높이를 40px로 통일했다. 백엔드, API, DB 계약은 변경하지 않았다.

## 검증

| 검증 | 결과 |
| --- | --- |
| 참조자 전용 표시/저장/적용/혼합 템플릿 거부 및 업무연락 진입 테스트 | 5개 통과 |
| 결재선·참조 필드 높이와 업무연락 진입 테스트 | 2개 통과 |
| 전체 `document-approval-settings-dialog.test.tsx` | 38개 중 37개 통과. `preserves failed inline renames after partial batch failure for retry`에서 기존 F1-Grid 인라인 이름변경 테스트가 실패했으며 이번 참조자 모드 변경과는 무관하다. |
| `npm run build` | TypeScript 검사 및 Vite 빌드 통과 |
| 대상 파일 Oxlint | 오류 없음. 기존 경고 2건(미사용 변수, effect 내 상태 변경) |
| `git diff --check` | 통과 |
| 실제 브라우저 375px / 768px / 1280px | 각 입력과 버튼 높이 40px, 겹침 없음, 페이지 가로 넘침 없음. 375px에서는 버튼이 다음 줄로 배치됨. |

브라우저 확인은 기존 `127.0.0.1:4173` S-ERP 서버를 재사용했다. 화면 크기별 참조 입력 및 참조자 설정 모달 캡처:

- 375px: [참조 입력](screenshots/reference-field-375.png), [설정 모달](screenshots/reference-settings-375.png)
- 768px: [참조 입력](screenshots/reference-field-768.png), [설정 모달](screenshots/reference-settings-768.png)
- 1280px: [참조 입력](screenshots/reference-field-1280.png), [설정 모달](screenshots/reference-settings-1280.png)

## 기준 문서

- [작업지시서](../../../directions/20261028/20261028_011_business_contact_reference_templates_작업지시서.md)
- [상세사양서](../../../spec/20261028/20261028_011_business_contact_reference_templates_상세사양서.md)
- [계획서](../../../plan/20261028/20261028_011_business_contact_reference_templates_계획서.md)
- [승인 설계](../../../superpowers/specs/2026-10-28-business-contact-reference-templates-design.md)
