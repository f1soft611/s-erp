# F1-Grid rowMerge pinned column 수정 결과

## 작업 개요

- 문제: `mergeRows`가 고정 컬럼(`pinned: 'left' | 'right'`)에서 병합 시작 셀 이후 셀들이 정상적으로 숨김 처리되지 않아 중복 값이 보이거나, pinned layout과 셀 span이 어긋나는 현상이 발생함.
- 수정 범위: `frontend/src/shared/components/f1-grid/core/GridCell.tsx`
- 검증: pinned left column row merge regression test 추가 및 Vitest 통과 확인

## 수정 내용

- merge 규칙이 pinned 컬럼에서도 같은 기준으로 적용되도록 기존 `merged` 판단 로직을 유지
- non-leading merged cell에 대해 `opacity` 기반 시각적 숨김 처리로 중복 텍스트가 보이지 않도록 보완
- sticky pinned cell의 `gridRow`/`span` 조합이 유지되도록 기존 구조와 충돌을 최소화

## 검증 결과

- 실행 명령: `Set-Location 'd:\f1soft\dev\react\S-ERP\frontend'; npx vitest run tests/f1-grid.test.tsx -t "keeps merged values working on pinned left columns" --reporter=json --outputFile=vitest-pin.json; $code=$LASTEXITCODE; Write-Output "EXIT:$code"; node -e "const fs=require('fs'); const p='vitest-pin.json'; if(!fs.existsSync(p)){console.log('NOFILE'); process.exit(0)} const data=JSON.parse(fs.readFileSync(p,'utf8')); const target=data.testResults.flatMap(s=>s.assertionResults).find(t=>t.fullName&&t.fullName.includes('keeps merged values working on pinned left columns')); console.log(JSON.stringify({status: target && target.status, failed: target && target.status==='failed', fullName: target && target.fullName, failures: target && target.failureMessages && target.failureMessages.length ? target.failureMessages.slice(0,2) : []},null,2));"`
- 결과: `EXIT:0`
- 상태: pinned row merge regression 테스트 통과

## 참고

- 관련 테스트: `frontend/tests/f1-grid.test.tsx`
- 관련 구현: `frontend/src/shared/components/f1-grid/core/GridCell.tsx`
