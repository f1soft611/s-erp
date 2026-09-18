---
name: skill-impl
description: >
  eGovFrame(Spring Boot) 백엔드에서 새 도메인의 Java CRUD 소스 set —
  Controller / Service / ServiceImpl / 응답·저장요청·검색조건 VO / DAO — 를
  `egovframework.let.system.modules` 레퍼런스 패턴에 맞춰 한 벌 생성하는 업무 스킬.
  단일 테이블 CRUD API 를 구현할 때, 매퍼 XML 작성(skill-orm) 직전에 사용한다.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# skill-impl — 백엔드 Java CRUD 소스 set 생성

`backend/src/main/java/egovframework/let/system/modules/` 의 7개 파일을 **정본(canonical)** 으로 삼아, 새 도메인용 동일 구조를 생성한다. 형제 도메인(`roles`, `menus`)에 변형이 있어도 **modules 형태**를 따른다.

## 0. 시작 전

1. 레퍼런스 7개 파일을 **전부 Read** 한다 (최신 코드가 이 문서보다 우선).
2. `AGENTS.md`, `backend/AGENTS.md` 확인.
3. 같은 도메인이 이미 있는지 `Glob("backend/src/main/java/egovframework/let/*/<plural>/**")` 로 확인.
4. 대상 테이블 스키마 확인 (`docs/database/db-schema.md` 또는 MCP `postgres`).

## 1. 토큰 정의

입력에서 아래를 확정한다:

| 토큰 | 규칙 | `warehouses` 예시 |
|---|---|---|
| `area` | 기능 영역 (기본 `system`) | `system` |
| `plural` | 도메인 복수 소문자 | `warehouses` |
| `Entity` | plural 의 PascalCase 단수 | `Warehouse` |
| `Prefix` | `System` + `Entity` | `SystemWarehouse` |
| `camel` | `Prefix` lowerCamel | `systemWarehouse` |
| `singular` | 소문자 단수 | `warehouse` |
| `table` | `tb_<singular>` (또는 입력값) | `tb_warehouse` |
| `pk` / `pkCamel` | `<singular>_id` / `<singular>Id` | `warehouse_id` / `warehouseId` |
| `code` / `codeCamel` | 유니크 코드 컬럼 (있을 때) | `warehouse_code` / `warehouseCode` |

## 2. 생성 파일 (7개) — 경로와 클래스명

모두 `backend/src/main/java/egovframework/let/<area>/<plural>/` 하위:

| # | 파일 | 클래스/인터페이스 |
|---|---|---|
| 1 | `domain/model/<Prefix>VO.java` | 응답 VO |
| 2 | `domain/model/<Prefix>SaveRequestVO.java` | 생성/수정 body |
| 3 | `domain/model/<Prefix>SearchConditionVO.java` | 목록 검색 조건 |
| 4 | `domain/repository/<Prefix>DAO.java` | `@Repository("<camel>DAO") extends EgovAbstractMapper` |
| 5 | `service/<Prefix>Service.java` | 서비스 인터페이스 |
| 6 | `service/impl/<Prefix>ServiceImpl.java` | `@Service("<camel>Service") extends EgovAbstractServiceImpl` |
| 7 | `controller/<Prefix>ApiController.java` | `@RestController @RequestMapping("/api/v1/<area>/<plural>")` |

파일 상단 주석 블록(레퍼런스와 동일):
```java
/**
 * <설명>
 * @author S-ERP
 * @since <yyyy.MM.dd>
 * @version 1.0
 */
```
import 그룹 순서: `java.*` → `org.springframework.*` → `egovframework.*` → `io.swagger.*` → `lombok.*`.

## 3. VO 규칙

- 클래스 애노테이션: `@Schema(description="...")`, `@Getter`, `@Setter`. `implements java.io.Serializable`, `private static final long serialVersionUID = 1L;`. **모든 필드에 `@Schema(description="...")`**. (`io.swagger.v3.oas.annotations.media.Schema`)
- 타입: PK·FK·`tenantId` → `Long` / `sort_order` → 응답VO 는 `int`, SaveRequest 는 `Integer` / 파생 카운트 → `int` / `use_at` → `String` / `created_at`·`updated_at` → `java.util.Date`.
- **`<Prefix>VO`**: `Long <pkCamel>`, `Long tenantId`, 업무 컬럼들, `String useAt`, (자식 있으면) `int <child>Count`, `Date createdAt`, `Date updatedAt`.
- **`<Prefix>SaveRequestVO`**: 편집 가능한 업무 컬럼만. PK/tenant/타임스탬프/감사 컬럼 없음. nullable 숫자는 wrapper(`Integer`). Bean Validation 애노테이션 붙이지 않는다.
- **`<Prefix>SearchConditionVO`**: `Long tenantId` + `String useAt` + FK 필터 컬럼(`Long <fk>Id`). **페이징 필드 없음.**

## 4. DAO 규칙

```java
@Repository("<camel>DAO")
public class <Prefix>DAO extends org.egovframe.rte.psl.dataaccess.EgovAbstractMapper {

    public List<<Prefix>VO> select<Entity>List(<Prefix>SearchConditionVO condition) throws Exception {
        return selectList("<Prefix>DAO.select<Entity>List", condition);
    }
    public <Prefix>VO select<Entity>ById(Map<String, Object> params) throws Exception {
        return selectOne("<Prefix>DAO.select<Entity>ById", params);
    }
    public Long select<Entity>IdByCode(Map<String, Object> params) throws Exception {   // 코드 유니크가 있을 때만
        return selectOne("<Prefix>DAO.select<Entity>IdByCode", params);
    }
    public Long insert<Entity>(Map<String, Object> params) throws Exception {           // selectOne! (INSERT ... RETURNING <pk>)
        return selectOne("<Prefix>DAO.insert<Entity>", params);
    }
    public void update<Entity>(Map<String, Object> params) throws Exception {
        update("<Prefix>DAO.update<Entity>", params);
    }
    public void delete<Entity>(Map<String, Object> params) throws Exception {
        delete("<Prefix>DAO.delete<Entity>", params);
    }
    public int countChildrenBy<Entity>Id(Map<String, Object> params) throws Exception { // 삭제 가드가 필요할 때만
        Integer count = selectOne("<Prefix>DAO.countChildrenBy<Entity>Id", params);
        return count == null ? 0 : count;
    }
}
```
statement id 문자열 = `"<Prefix>DAO.<statementId>"` (namespace = DAO 단순 클래스명).

## 5. Service / ServiceImpl 규칙

인터페이스 (모두 `throws Exception`):
```java
List<<Prefix>VO> list<Plural>(Long tenantId);
<Prefix>VO create<Entity>(Long tenantId, <Prefix>SaveRequestVO payload);
<Prefix>VO update<Entity>(Long tenantId, Long <pkCamel>, <Prefix>SaveRequestVO payload);
void        delete<Entity>(Long tenantId, Long <pkCamel>);
```
- 인자 순서: `tenantId` 항상 첫째, PK 둘째(수정/삭제), body VO 마지막. create/update 는 재조회한 `<Prefix>VO` 반환.

ServiceImpl:
- `@Service("<camel>Service")`, `extends org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl implements <Prefix>Service`
- **명시적 생성자 주입**, `private final <Prefix>DAO <camel>DAO;` (Lombok 미사용)
- `list<Plural>`: `new <Prefix>SearchConditionVO()` + `setTenantId(tenantId)` → `select<Entity>List`. `@Transactional` 없음.
- `create/update/delete`: `@org.springframework.transaction.annotation.Transactional`
- 필수값 검증: `org.springframework.util.StringUtils.hasText(payload.getX())` → `throw new IllegalArgumentException("X 는 필수입니다.")`
- 코드 중복 검증: `validate<Entity>CodeDuplication(tenantId, code, excludeId)` → `select<Entity>IdByCode`; 다른 id 존재 시 `IllegalArgumentException("이미 사용 중인 ... 코드입니다.")`. update 는 `excludeId` = 현재 id.
- 기본값: `sortOrder` = `payload.getSortOrder() == null ? 0 : payload.getSortOrder()`; `useAt` = `"N".equalsIgnoreCase(payload.getUseAt()) ? "N" : "Y"`
- param 조립: `new HashMap<String, Object>()` + camelCase 키(XML `#{...}` 와 일치). 문자열 코드/이름은 `.trim()`.
- 존재 검증: `findByIdOrThrow(tenantId, id)` → null 이면 `throw new ResponseStatusException(HttpStatus.NOT_FOUND, "<것>을 찾을 수 없습니다.")`
- update: `findByIdOrThrow` → 코드중복(self 제외) → `update<Entity>` → `findByIdOrThrow` 재조회 반환
- delete: `findByIdOrThrow` → (자식 보유 시) `countChildrenBy<Entity>Id > 0` 이면 `IllegalArgumentException("하위 ... 삭제할 수 없습니다.")` → `delete<Entity>`
- 감사 컬럼: 레퍼런스엔 없음. 대상 테이블에 `created_by`/`updated_by` 가 있고 스펙에 요구되면 param map 과 SQL 에 `user.get...` 를 추가한다(그 외엔 넣지 않는다).

## 6. Controller 규칙

```java
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/<area>/<plural>")
@Tag(name = "<Prefix>ApiController", description = "<도메인 한글명> 관리")
public class <Prefix>ApiController {

    private final ResultVoHelper resultVoHelper;
    private final <Prefix>Service <camel>Service;

    @GetMapping
    public ResultVO list<Plural>(@Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", <camel>Service.list<Plural>(user.getTenantId()));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResultVO create<Entity>(@RequestBody <Prefix>SaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAdmin(user);
        try {
            <Prefix>VO item = <camel>Service.create<Entity>(user.getTenantId(), payload);
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", item);
            resultMap.put("message", "<도메인 한글명>이(가) 성공적으로 등록되었습니다.");
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("message", ex.getMessage());
            return resultVoHelper.buildFromMap(errorMap, ResponseCode.INPUT_CHECK_ERROR);
        }
    }

    // PUT "/{id}" update<Entity>(@PathVariable Long id, @RequestBody ... payload, @AuthenticationPrincipal LoginVO user)
    //   -> 동일 shape, message "... 수정되었습니다."
    // DELETE "/{id}" delete<Entity>(@PathVariable Long id, @AuthenticationPrincipal LoginVO user)
    //   -> requireAdmin -> service.delete -> resultMap.put("message", "... 삭제되었습니다.")

    private void requireAdmin(LoginVO user) {
        if (!EgovAccessControlHelper.isTenantAdmin(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ResponseCode.AUTH_ERROR.getMessage());
        }
    }
}
```
각 메서드에 `@Operation(summary = "...", security = { @SecurityRequirement(name = "Authorization") }, tags = { "<Prefix>ApiController" })` + `@ApiResponses({ @ApiResponse(responseCode = "200", ...), @ApiResponse(responseCode = "403", ...) })`.

엔드포인트 표:

| Method | Path | Request | 성공 |
|---|---|---|---|
| GET | `/api/v1/<area>/<plural>` | — | 200, `result.resultList` |
| POST | `/api/v1/<area>/<plural>` | `<Prefix>SaveRequestVO` | 201, `result.item` + `result.message` |
| PUT | `/api/v1/<area>/<plural>/{id}` | `Long id` + `<Prefix>SaveRequestVO` | 200, `result.item` + `result.message` |
| DELETE | `/api/v1/<area>/<plural>/{id}` | `Long id` | 200, `result.message` |

## 7. 완료 체크리스트

- [ ] 7개 파일 생성, import 그룹 순서 준수
- [ ] DAO 메서드명 ↔ (skill-orm 이 만들) statement id 1:1
- [ ] param map 키 == XML `#{...}` == (검색조건은) SearchConditionVO 필드명
- [ ] 모든 SQL 경유 경로가 `tenant_id = #{tenantId}` 로 스코프됨
- [ ] `cd backend && mvn -q test-compile` 통과
- [ ] `cd backend && mvn test` 로 스프링 컨텍스트 로드 확인 (매퍼 바인딩 오류 검출)
- [ ] `backend/` 외부 파일 미변경 (외부 설정 불필요)
- [ ] 신규 테이블이면 `backend/DATABASE/<yyyymmdd>/` 스키마 스크립트 + `docs/database/db-schema.md` 갱신

## 8. 주의 (레퍼런스 gotcha)

- INSERT 는 `<insert>` 가 아니라 `<select resultType="long">` + `RETURNING <pk>`, DAO 는 `selectOne` 으로 호출.
- 컨트롤러는 `@RequiredArgsConstructor`, ServiceImpl 은 **명시적 생성자**.
- 페이지네이션/Bean Validation 없음.
- 비즈니스 오류는 컨트롤러가 catch → HTTP 200 + `resultCode 900`; 던져진 예외(`ResponseStatusException` 등)는 `GlobalExceptionHandler` 가 실제 4xx/5xx 로 처리.
- nullable `bigint` FK 바인딩은 XML 에서 `#{<fk>Id, jdbcType=BIGINT}` (skill-orm 담당).
