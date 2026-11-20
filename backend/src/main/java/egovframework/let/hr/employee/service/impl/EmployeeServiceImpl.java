package egovframework.let.hr.employee.service.impl;

import java.sql.Date;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.postgresql.util.PSQLException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.hr.common.ResidentNumberCipher;
import egovframework.let.hr.employee.domain.model.EmployeePickerVO;
import egovframework.let.hr.employee.domain.model.EmployeeSaveRequestVO;
import egovframework.let.hr.employee.domain.model.EmployeeVO;
import egovframework.let.hr.employee.domain.repository.EmployeeDAO;
import egovframework.let.hr.order.service.HrOrderHistoryRecorder;
import egovframework.let.hr.employee.service.EmployeeService;
import egovframework.let.utl.sim.service.EgovFileScrty;

@Service("employeeService")
public class EmployeeServiceImpl extends EgovAbstractServiceImpl implements EmployeeService {

    static final String EMPLOYEE_NO_GENERATOR = "HR_EMPLOYEE_NO";
    static final String DEFAULT_ROLE_CODE = "DEFAULT_USER";
    private static final int MAX_AUTO_NUMBER_ATTEMPTS = 1000;
    private static final int MAX_PHOTO_LENGTH = 700 * 1024;
    private static final int MIN_PASSWORD_LENGTH = 8;
    private static final int MAX_PICKER_KEYWORD = 100;

    private static final Pattern EMPLOYEE_NO = Pattern.compile("^[A-Za-z0-9]{1,20}$");
    private static final Pattern LOGIN_CODE = Pattern.compile("^[A-Za-z0-9._-]{4,30}$");
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern PHOTO = Pattern.compile("^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]*$");

    private final EmployeeDAO employeeDAO;
    private final IdSequenceService idSequenceService;
    private final ResidentNumberCipher residentNumberCipher;
    private final HrOrderHistoryRecorder historyRecorder;

    public EmployeeServiceImpl(
            EmployeeDAO employeeDAO,
            IdSequenceService idSequenceService,
            ResidentNumberCipher residentNumberCipher,
            HrOrderHistoryRecorder historyRecorder) {
        this.employeeDAO = employeeDAO;
        this.idSequenceService = idSequenceService;
        this.residentNumberCipher = residentNumberCipher;
        this.historyRecorder = historyRecorder;
    }

    // ---- 조회 ----

    @Override
    public List<EmployeeVO> listEmployees(Long tenantId, String keyword, String status, Long departmentId)
            throws Exception {
        validateTenantId(tenantId);
        String normalizedStatus = StringUtils.hasText(status) ? status.trim().toUpperCase(Locale.ROOT) : "ACTIVE";
        if (!"ACTIVE".equals(normalizedStatus) && !"RETIRED".equals(normalizedStatus) && !"ALL".equals(normalizedStatus)) {
            throw new IllegalArgumentException("재직 구분은 ACTIVE, RETIRED, ALL 중 하나여야 합니다.");
        }
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("status", normalizedStatus);
        if (StringUtils.hasText(keyword)) {
            params.put("keyword", keyword.trim());
        }
        if (departmentId != null) {
            params.put("departmentId", departmentId);
        }
        return employeeDAO.selectEmployeeList(params);
    }

    @Override
    public EmployeeVO getEmployee(Long tenantId, Long userId) throws Exception {
        validateTenantId(tenantId);
        return findOrThrow(tenantId, userId);
    }

    @Override
    public List<EmployeePickerVO> listPickerEmployees(Long tenantId, Long departmentId, String keyword) throws Exception {
        validateTenantId(tenantId);
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        if (departmentId != null) {
            params.put("departmentId", departmentId);
        }
        if (StringUtils.hasText(keyword)) {
            String trimmed = keyword.trim();
            if (trimmed.length() > MAX_PICKER_KEYWORD) {
                throw new IllegalArgumentException("검색어는 100자 이하여야 합니다.");
            }
            params.put("keyword", trimmed);
        }
        List<EmployeePickerVO> rows = employeeDAO.selectPickerEmployees(params);
        return rows == null ? Collections.<EmployeePickerVO>emptyList() : rows;
    }

    @Override
    public boolean isEmployeeNoAvailable(Long tenantId, String employeeNo, Long excludeUserId) throws Exception {
        validateTenantId(tenantId);
        String normalized = normalizeEmployeeNo(employeeNo);
        if (normalized == null) {
            throw new IllegalArgumentException("사번을 입력해 주세요.");
        }
        return countEmployeeNo(tenantId, normalized, excludeUserId) == 0;
    }

    @Override
    public boolean isLoginCodeAvailable(Long tenantId, String loginCode) throws Exception {
        validateTenantId(tenantId);
        String normalized = loginCode == null ? "" : loginCode.trim();
        if (!LOGIN_CODE.matcher(normalized).matches()) {
            throw new IllegalArgumentException("로그인 아이디는 영문·숫자·`.`·`_`·`-` 4~30자로 입력해 주세요.");
        }
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("loginCode", normalized);
        return employeeDAO.countLoginCode(params) == 0;
    }

    // ---- 등록 ----

    @Override
    @Transactional(rollbackFor = Exception.class)
    public EmployeeVO createEmployee(Long tenantId, Long currentUserId, EmployeeSaveRequestVO payload) throws Exception {
        validateTenantId(tenantId);
        if (payload == null) {
            throw new IllegalArgumentException("저장 요청이 비어 있습니다.");
        }
        Map<String, Object> params = buildCommonParams(tenantId, null, payload);
        LocalDate joinDt = ((Date) params.get("joinDt")).toLocalDate();

        String employeeNo = normalizeEmployeeNo(payload.getEmployeeNo());
        if (employeeNo != null) {
            if (countEmployeeNo(tenantId, employeeNo, null) > 0) {
                throw conflict("이미 사용 중인 사번입니다.");
            }
        } else {
            employeeNo = generateEmployeeNo(tenantId, joinDt);
        }
        params.put("employeeNo", employeeNo);

        boolean realUser = "Y".equals(normalizeRealUser(payload.getRealUserAt(), "N"));
        params.put("realUserAt", realUser ? "Y" : "N");
        if (realUser) {
            params.put("loginId", issueLoginAccount(tenantId, payload, (String) params.get("photoImage"), employeeNo));
        }

        params.put("createdBy", currentUserId);
        params.put("updatedBy", currentUserId);
        Long userId;
        try {
            userId = employeeDAO.insertEmployee(params);
        } catch (DuplicateKeyException ex) {
            throw duplicate(ex);
        }
        if (userId == null) {
            throw new IllegalStateException("사원 등록 결과를 확인할 수 없습니다.");
        }
        EmployeeVO created = findOrThrow(tenantId, userId);
        // 신규 등록은 입사 이력(입사일·부서·직위)을 같은 트랜잭션에서 남긴다.
        historyRecorder.recordJoin(tenantId, currentUserId, created);
        return created;
    }

    // ---- 수정 ----

    @Override
    @Transactional(rollbackFor = Exception.class)
    public EmployeeVO updateEmployee(Long tenantId, Long currentUserId, Long userId, EmployeeSaveRequestVO payload)
            throws Exception {
        return updateEmployee(tenantId, currentUserId, userId, payload, true);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public EmployeeVO updateEmployee(Long tenantId, Long currentUserId, Long userId, EmployeeSaveRequestVO payload,
            boolean recordHistory) throws Exception {
        validateTenantId(tenantId);
        if (userId == null) {
            throw new IllegalArgumentException("사원 ID가 필요합니다.");
        }
        if (payload == null) {
            throw new IllegalArgumentException("저장 요청이 비어 있습니다.");
        }
        EmployeeVO existing = findOrThrow(tenantId, userId);
        Map<String, Object> params = buildCommonParams(tenantId, userId, payload);
        LocalDate joinDt = ((Date) params.get("joinDt")).toLocalDate();

        String requestedNo = normalizeEmployeeNo(payload.getEmployeeNo());
        String employeeNo;
        if (StringUtils.hasText(existing.getEmployeeNo())) {
            if (requestedNo != null && !requestedNo.equals(existing.getEmployeeNo())) {
                throw new IllegalArgumentException("사번은 수정할 수 없습니다.");
            }
            employeeNo = existing.getEmployeeNo();
        } else if (requestedNo != null) {
            if (countEmployeeNo(tenantId, requestedNo, userId) > 0) {
                throw conflict("이미 사용 중인 사번입니다.");
            }
            employeeNo = requestedNo;
        } else {
            employeeNo = generateEmployeeNo(tenantId, joinDt);
        }
        params.put("employeeNo", employeeNo);

        boolean linked = existing.getLoginId() != null;
        String realUserAt = normalizeRealUser(payload.getRealUserAt(), linked ? "Y" : existing.getRealUserAt());
        if (linked && !"Y".equals(realUserAt)) {
            throw new IllegalArgumentException(
                    "로그인 계정이 있는 사원은 실사용자를 해제할 수 없습니다. 계정 관리에서 로그인을 미허용 처리해 주세요.");
        }
        params.put("realUserAt", realUserAt);

        String photoForAccount = (String) params.get("photoImage");
        if (!(boolean) params.get("photoProvided")) {
            photoForAccount = existing.getPhotoImage();
        }
        if (!linked && "Y".equals(realUserAt)) {
            params.put("loginId", issueLoginAccount(tenantId, payload, photoForAccount, employeeNo));
        }

        params.put("updatedBy", currentUserId);
        int updated;
        try {
            updated = employeeDAO.updateEmployee(params);
        } catch (DuplicateKeyException ex) {
            throw duplicate(ex);
        }
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "사원을 찾을 수 없습니다.");
        }
        if (linked && (boolean) params.get("photoProvided")) {
            Map<String, Object> image = new HashMap<>();
            image.put("tenantId", tenantId);
            image.put("loginId", existing.getLoginId());
            image.put("profileImage", params.get("photoImage"));
            employeeDAO.updateLoginProfileImage(image);
        }
        EmployeeVO saved = findOrThrow(tenantId, userId);
        if (recordHistory) {
            // 사원관리 직접 수정: 부서·직위 등 추적 항목이 실제로 바뀐 경우에만 이력을 남긴다.
            historyRecorder.recordDirectEdit(tenantId, currentUserId, existing, saved);
        }
        return saved;
    }

    // ---- 검증과 파라미터 구성 ----

    /** 등록·수정이 공통으로 쓰는 값을 검증·정규화해 파라미터 맵으로 만든다(사번·실사용자·계정은 호출 쪽에서 채운다). */
    private Map<String, Object> buildCommonParams(Long tenantId, Long excludeUserId, EmployeeSaveRequestVO payload)
            throws Exception {
        String userNm = requireText("이름", payload.getUserNm(), 100);
        if (payload.getDepartmentId() == null) {
            throw new IllegalArgumentException("부서를 선택해 주세요.");
        }
        Map<String, Object> departmentCheck = new HashMap<>();
        departmentCheck.put("tenantId", tenantId);
        departmentCheck.put("departmentId", payload.getDepartmentId());
        if (!employeeDAO.existsActiveDepartment(departmentCheck)) {
            throw new IllegalArgumentException("부서를 찾을 수 없거나 사용안함 부서입니다.");
        }

        String positionCode = requireCode(tenantId, "POSITION", "직위", payload.getPositionCode());
        // 근무형태는 필수가 아니다(비우면 null로 저장). 값이 있으면 공통코드에 있어야 한다.
        String employmentTypeCode = optionalCode(tenantId, "EMPLOYMENT_TYPE", "근무형태", payload.getEmploymentTypeCode());
        String genderCode = optionalCode(tenantId, "GENDER", "성별", payload.getGenderCode());
        String nativeTypeCode = optionalCode(tenantId, "NATIVE_TYPE", "내/외국인", payload.getNativeTypeCode());
        String nationalityCode = optionalCode(tenantId, "COUNTRY", "국적", payload.getNationalityCode());
        String birthCalendarCode = optionalCode(tenantId, "BIRTH_CALENDAR", "생일 구분", payload.getBirthCalendarCode());
        if (payload.getLevelId() != null) {
            Map<String, Object> levelCheck = new HashMap<>();
            levelCheck.put("tenantId", tenantId);
            levelCheck.put("levelId", payload.getLevelId());
            if (!employeeDAO.existsLevel(levelCheck)) {
                throw new IllegalArgumentException("직급 값이 올바르지 않습니다.");
            }
        }

        LocalDate joinDt = parseDate("입사일", payload.getJoinDt());
        if (joinDt == null) {
            throw new IllegalArgumentException("입사일을 입력해 주세요.");
        }
        LocalDate retireDt = parseDate("퇴사일", payload.getRetireDt());
        LocalDate suspendDt = parseDate("휴직일", payload.getSuspendDt());
        LocalDate backDt = parseDate("복직일", payload.getBackDt());
        if (retireDt != null && retireDt.isBefore(joinDt)) {
            throw new IllegalArgumentException("퇴사일은 입사일보다 빠를 수 없습니다.");
        }
        if (backDt != null && suspendDt != null && backDt.isBefore(suspendDt)) {
            throw new IllegalArgumentException("복직일은 휴직일보다 빠를 수 없습니다.");
        }

        String emailAddr = optionalText("이메일", payload.getEmailAddr(), 100);
        if (emailAddr != null) {
            if (!EMAIL.matcher(emailAddr).matches()) {
                throw new IllegalArgumentException("이메일 형식이 올바르지 않습니다.");
            }
            Map<String, Object> emailCheck = new HashMap<>();
            emailCheck.put("tenantId", tenantId);
            emailCheck.put("emailAddr", emailAddr);
            emailCheck.put("excludeUserId", excludeUserId);
            if (employeeDAO.countEmail(emailCheck) > 0) {
                throw conflict("이미 사용 중인 이메일입니다.");
            }
        }

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("userId", excludeUserId);
        params.put("userNm", userNm);
        params.put("englishNm", optionalText("영문이름", payload.getEnglishNm(), 60));
        params.put("departmentId", payload.getDepartmentId());
        params.put("positionCode", positionCode);
        params.put("levelId", payload.getLevelId());
        params.put("genderCode", genderCode);
        params.put("employmentTypeCode", employmentTypeCode);
        params.put("nativeTypeCode", nativeTypeCode);
        params.put("nationalityCode", nationalityCode);
        params.put("birthCalendarCode", birthCalendarCode);
        params.put("birthDt", toSql(parseDate("생일", payload.getBirthDt())));
        params.put("joinDt", Date.valueOf(joinDt));
        params.put("retireDt", toSql(retireDt));
        params.put("suspendDt", toSql(suspendDt));
        params.put("backDt", toSql(backDt));
        params.put("workEndDt", toSql(parseDate("취업기간만료일", payload.getWorkEndDt())));
        params.put("admissionDt", toSql(parseDate("입국일", payload.getAdmissionDt())));
        params.put("stayFromDt", toSql(parseDate("체류기간 시작일", payload.getStayFromDt())));
        params.put("stayToDt", toSql(parseDate("체류기간 종료일", payload.getStayToDt())));
        params.put("contractFromDt", toSql(parseDate("근로계약 시작일", payload.getContractFromDt())));
        params.put("contractToDt", toSql(parseDate("근로계약 종료일", payload.getContractToDt())));
        params.put("mobileNo", optionalText("핸드폰", payload.getMobileNo(), 20));
        params.put("homePhoneNo", optionalText("자택전화", payload.getHomePhoneNo(), 30));
        params.put("emailAddr", emailAddr);
        params.put("postalCode", optionalText("우편번호", payload.getPostalCode(), 10));
        params.put("address", optionalText("주소", payload.getAddress(), 200));
        params.put("addressDetail", optionalText("상세주소", payload.getAddressDetail(), 200));

        putResidentNo(tenantId, excludeUserId, payload.getResidentNo(), params);

        boolean photoProvided = payload.getPhotoImage() != null;
        params.put("photoProvided", photoProvided);
        params.put("photoImage", photoProvided ? normalizePhoto(payload.getPhotoImage()) : null);
        return params;
    }

    private void putResidentNo(Long tenantId, Long excludeUserId, String residentNo, Map<String, Object> params) throws Exception {
        boolean provided = StringUtils.hasText(residentNo);
        params.put("residentNoProvided", provided);
        if (!provided) {
            return;
        }
        String digits = residentNo.trim().replace("-", "");
        if (!digits.matches("^[0-9]{13}$")) {
            throw new IllegalArgumentException("주민등록번호는 숫자 13자리로 입력해 주세요.");
        }
        String hash = residentNumberCipher.hash(digits);
        Map<String, Object> hashCheck = new HashMap<>();
        hashCheck.put("tenantId", tenantId);
        hashCheck.put("residentNoHash", hash);
        hashCheck.put("excludeUserId", excludeUserId);
        if (employeeDAO.countResidentHash(hashCheck) > 0) {
            throw conflict("이미 등록된 주민등록번호입니다.");
        }
        params.put("residentNoEnc", residentNumberCipher.encrypt(digits));
        params.put("residentNoKeyVersion", residentNumberCipher.getKeyVersion());
        params.put("residentNoHash", hash);
        params.put("residentNoMasked", ResidentNumberCipher.mask(digits));
    }

    /** 실사용자 계정을 발급하고(DEFAULT_USER 역할 포함) 생성된 login_id를 돌려준다. 비밀번호는 최초 로그인 시 변경 대상이다. */
    private Long issueLoginAccount(Long tenantId, EmployeeSaveRequestVO payload, String photoImage, String employeeNo)
            throws Exception {
        String requested = payload.getLoginCode() == null ? "" : payload.getLoginCode().trim();
        // 로그인 아이디를 입력하지 않으면 사번을 그대로 아이디로 쓴다.
        String loginCode = requested.isEmpty() ? employeeNo : requested;
        if (!LOGIN_CODE.matcher(loginCode).matches()) {
            throw new IllegalArgumentException(requested.isEmpty()
                    ? "사번(" + loginCode + ")은 로그인 아이디(영문·숫자·`.`·`_`·`-` 4~30자)로 쓸 수 없습니다. 로그인 아이디를 직접 입력해 주세요."
                    : "로그인 아이디는 영문·숫자·`.`·`_`·`-` 4~30자로 입력해 주세요.");
        }
        String password = payload.getInitialPassword();
        if (password == null || password.length() < MIN_PASSWORD_LENGTH) {
            throw new IllegalArgumentException("초기 비밀번호는 " + MIN_PASSWORD_LENGTH + "자 이상이어야 합니다.");
        }
        Map<String, Object> loginCheck = new HashMap<>();
        loginCheck.put("tenantId", tenantId);
        loginCheck.put("loginCode", loginCode);
        if (employeeDAO.countLoginCode(loginCheck) > 0) {
            throw conflict("이미 사용 중인 로그인 아이디입니다.");
        }
        Map<String, Object> account = new HashMap<>();
        account.put("tenantId", tenantId);
        account.put("loginCode", loginCode);
        account.put("passwordHash", EgovFileScrty.encryptPassword(password, loginCode));
        account.put("profileImage", StringUtils.hasText(photoImage) ? photoImage : null);
        Long loginId;
        try {
            loginId = employeeDAO.insertLoginAccount(account);
        } catch (DuplicateKeyException ex) {
            throw duplicate(ex);
        }
        if (loginId == null) {
            throw new IllegalStateException("로그인 계정 발급 결과를 확인할 수 없습니다.");
        }
        Map<String, Object> role = new HashMap<>();
        role.put("tenantId", tenantId);
        role.put("loginId", loginId);
        role.put("roleCode", DEFAULT_ROLE_CODE);
        if (employeeDAO.insertDefaultRole(role) == 0) {
            throw new IllegalStateException("기본 역할(" + DEFAULT_ROLE_CODE + ")을 찾을 수 없어 계정을 발급하지 못했습니다.");
        }
        return loginId;
    }

    /** 입사년월(YYMM)+순번 2자리(99 초과 시 3자리 이상)로 사번을 만든다. 이미 쓰는 번호(직접 입력 포함)는 건너뛴다. */
    private String generateEmployeeNo(Long tenantId, LocalDate joinDt) throws Exception {
        String yymm = String.format("%02d%02d", joinDt.getYear() % 100, joinDt.getMonthValue());
        for (int attempt = 0; attempt < MAX_AUTO_NUMBER_ATTEMPTS; attempt++) {
            Long sequence = idSequenceService.nextValue(EMPLOYEE_NO_GENERATOR, String.valueOf(tenantId), yymm);
            String candidate = yymm + (sequence < 100 ? String.format("%02d", sequence) : String.valueOf(sequence));
            if (countEmployeeNo(tenantId, candidate, null) == 0) {
                return candidate;
            }
        }
        throw new IllegalStateException("사번을 자동으로 만들 수 없습니다. 사번을 직접 입력해 주세요.");
    }

    private int countEmployeeNo(Long tenantId, String employeeNo, Long excludeUserId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("employeeNo", employeeNo);
        params.put("excludeUserId", excludeUserId);
        return employeeDAO.countEmployeeNo(params);
    }

    private String normalizeEmployeeNo(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String trimmed = value.trim();
        if (!EMPLOYEE_NO.matcher(trimmed).matches()) {
            throw new IllegalArgumentException("사번은 영문·숫자 1~20자로 입력해 주세요.");
        }
        return trimmed;
    }

    private String normalizeRealUser(String value, String fallback) {
        if (!StringUtils.hasText(value)) {
            return StringUtils.hasText(fallback) ? fallback : "N";
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        if (!"Y".equals(normalized) && !"N".equals(normalized)) {
            throw new IllegalArgumentException("실사용자 값은 Y 또는 N이어야 합니다.");
        }
        return normalized;
    }

    private String normalizePhoto(String value) {
        if (!StringUtils.hasText(value)) {
            return null; // 빈 문자열은 사진 삭제
        }
        if (value.length() > MAX_PHOTO_LENGTH || !PHOTO.matcher(value).matches()) {
            throw new IllegalArgumentException("사진은 700KB 이하의 PNG·JPEG·WEBP 이미지여야 합니다.");
        }
        return value;
    }

    private String requireCode(Long tenantId, String groupCode, String label, String value) throws Exception {
        String code = optionalCode(tenantId, groupCode, label, value);
        if (code == null) {
            throw new IllegalArgumentException(label + "을(를) 선택해 주세요.");
        }
        return code;
    }

    private String optionalCode(Long tenantId, String groupCode, String label, String value) throws Exception {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String code = value.trim();
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("groupCode", groupCode);
        params.put("itemCode", code);
        if (!employeeDAO.existsCommonCodeItem(params)) {
            throw new IllegalArgumentException(label + " 값이 올바르지 않습니다.");
        }
        return code;
    }

    private String requireText(String label, String value, int maxLength) {
        String text = optionalText(label, value, maxLength);
        if (text == null) {
            throw new IllegalArgumentException(label + "을(를) 입력해 주세요.");
        }
        return text;
    }

    private String optionalText(String label, String value, int maxLength) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String text = value.trim();
        if (text.length() > maxLength) {
            throw new IllegalArgumentException(label + "은(는) " + maxLength + "자 이하로 입력해 주세요.");
        }
        return text;
    }

    private LocalDate parseDate(String label, String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException(label + " 형식이 올바르지 않습니다(yyyy-MM-dd).");
        }
    }

    private Date toSql(LocalDate date) {
        return date == null ? null : Date.valueOf(date);
    }

    private EmployeeVO findOrThrow(Long tenantId, Long userId) throws Exception {
        if (userId == null) {
            throw new IllegalArgumentException("사원 ID가 필요합니다.");
        }
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("userId", userId);
        EmployeeVO employee = employeeDAO.selectEmployeeById(params);
        if (employee == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "사원을 찾을 수 없습니다.");
        }
        return employee;
    }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    /** DB 유일 제약 충돌(동시 등록 등)을 제약 이름에 맞는 409 안내로 바꾼다. */
    private ResponseStatusException duplicate(DuplicateKeyException error) {
        for (Throwable cause = error; cause != null; cause = cause.getCause()) {
            if (!(cause instanceof PSQLException) || ((PSQLException) cause).getServerErrorMessage() == null) {
                continue;
            }
            String constraint = ((PSQLException) cause).getServerErrorMessage().getConstraint();
            if ("ux_user_employee_no".equals(constraint)) {
                return new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 사번입니다.", error);
            }
            if ("ux_user_resident_no_hash".equals(constraint)) {
                return new ResponseStatusException(HttpStatus.CONFLICT, "이미 등록된 주민등록번호입니다.", error);
            }
            if ("tb_user_tenant_id_email_addr_key".equals(constraint)) {
                return new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다.", error);
            }
            if ("tb_login_account_tenant_id_login_code_key".equals(constraint)) {
                return new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 로그인 아이디입니다.", error);
            }
        }
        return new ResponseStatusException(HttpStatus.CONFLICT, "이미 등록된 값과 중복됩니다.", error);
    }

    private void validateTenantId(Long tenantId) {
        if (tenantId == null) {
            throw new IllegalArgumentException("테넌트 정보가 없습니다.");
        }
    }
}
