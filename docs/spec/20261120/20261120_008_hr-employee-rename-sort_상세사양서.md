# 20261120_008 사원관리 명칭 변경·정렬 변경 상세사양서

기준: [계획서](../../plan/20261120/20261120_008_hr-employee-rename-sort_계획서.md)

## 1. 정렬
`GET /api/v1/hr/employees` 목록: 부서 → 직위 → 사원명 → 사원 ID 순.
- **부서**: 화면 부서 트리가 펼쳐진 순서(상위 부서 바로 아래에 하위 부서). 정렬순서(`sort_order`)는 부모마다 따로 매겨져 있어 전체에 한 번에 적용하면 계층이 섞이므로, 같은 부모 안에서 `sort_order → 부서명 → 부서 ID`로 순번을 매기고 루트부터 순번을 이어 붙인 경로(`WITH RECURSIVE`)로 정렬한다(부서관리 트리와 같은 기준). 부서가 없는 사원은 맨 뒤.
- **직위**: 가나다순이 아니라 공통코드 POSITION의 정렬순번(`sort_order`: 회장 10 → … → 사원 100)을 따른다(직위 없으면 뒤). **사원명**: `user_nm`.
- **사원 선택 도움창**(`selectPickerEmployees`, `GET /api/v1/hr/employee-picker`)도 같은 기준이다(공통 SQL 조각 `departmentTreeOrder` 사용).

### ORDER BY 구문
```sql
WITH RECURSIVE dept_rank AS (
    SELECT department_id, parent_department_id,
           ROW_NUMBER() OVER (PARTITION BY parent_department_id
                              ORDER BY sort_order ASC, department_nm ASC, department_id ASC) AS rn
    FROM tb_department WHERE tenant_id = :tenantId
), dept_tree AS (
    SELECT department_id, ARRAY[rn] AS path FROM dept_rank WHERE parent_department_id IS NULL
    UNION ALL
    SELECT r.department_id, t.path || r.rn
    FROM dept_rank r JOIN dept_tree t ON r.parent_department_id = t.department_id
    WHERE cardinality(t.path) < 20
)
SELECT ... FROM tb_user u ... LEFT JOIN tb_common_code_item pi ON ... -- 직위 공통코드(POSITION)
ORDER BY (SELECT dt.path FROM dept_tree dt WHERE dt.department_id = u.department_id) ASC NULLS LAST,  -- 부서(트리 펼침 순서)
         pi.sort_order ASC NULLS LAST,                                                                   -- 직위(공통코드 정렬순번)
         u.user_nm ASC,                                                                                  -- 사원명
         u.user_id ASC;                                                                                  -- 동명이인
```

## 2. 명칭
`tb_menu.menu_nm`(`HR_INFO_EMPLOYEE`) 사원관리. URL `/hr/info/employee-manage`, 메뉴 코드·권한은 그대로. 화면 제목·브레드크럼은 메뉴 이름을 따른다.
