package egovframework.let.pr.process.service.impl;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Arrays;
import java.util.Base64;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import egovframework.let.pr.process.domain.model.ProcessChangesVO;
import egovframework.let.pr.process.domain.model.ProcessNodeVO;
import egovframework.let.pr.process.domain.repository.ProcessManagementDAO;
import egovframework.let.pr.process.service.ProcessManagementService;

@Service("processManagementService")
public class ProcessManagementServiceImpl extends EgovAbstractServiceImpl implements ProcessManagementService {
    private final ProcessManagementDAO dao;

    public ProcessManagementServiceImpl(ProcessManagementDAO dao) {
        this.dao = dao;
    }

    @Override
    public List<ProcessNodeVO> list(Long tenantId) {
        requireTenant(tenantId);
        return dao.list(tenantId);
    }

    @Override
    public List<ProcessNodeVO> listMasters(Long tenantId) {
        requireTenant(tenantId);
        return dao.listMasters(tenantId);
    }

    /** 작업장(g:)과 작업장-공정 연결(m:)을 저장한다. 공정 내용은 공정 마스터에서만 수정한다. */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public List<ProcessNodeVO> save(Long tenantId, ProcessChangesVO changes) {
        requireTenant(tenantId);
        validateBatch(changes, "gm");
        for (ProcessNodeVO row : changes.getUpdatedRows()) {
            if (!row.getId().startsWith("g:")) {
                throw new IllegalArgumentException("연결된 공정은 공정 설정에서 수정해 주세요.");
            }
        }
        Set<String> links = new HashSet<>();
        for (ProcessNodeVO row : changes.getInsertedRows()) {
            validateNode(row);
            if (row.getId().startsWith("m:") && !links.add(row.getParentId() + "/" + row.getProcessId())) {
                throw new IllegalArgumentException("이미 연결된 공정입니다.");
            }
        }
        for (ProcessNodeVO row : changes.getUpdatedRows()) validateNode(row);

        Map<String, Long> newGroups = new HashMap<>();
        for (ProcessNodeVO row : changes.getDeletedRows()) {
            if (row.getId().startsWith("m:")) requireAffected(dao.deleteMapping(params(tenantId, row, null)));
        }
        for (ProcessNodeVO row : changes.getDeletedRows()) {
            if (row.getId().startsWith("g:")) requireAffected(dao.deleteGroup(params(tenantId, row, null)));
        }
        for (ProcessNodeVO row : changes.getInsertedRows()) {
            if (row.getId().startsWith("g:")) {
                Long id = dao.insertGroup(params(tenantId, row, null));
                if (id == null) throw new IllegalStateException("작업장 저장 결과가 없습니다.");
                newGroups.put(row.getId(), id);
            }
        }
        for (ProcessNodeVO row : changes.getUpdatedRows()) {
            requireAffected(dao.updateGroup(params(tenantId, row, null)));
        }
        for (ProcessNodeVO row : changes.getInsertedRows()) {
            if (row.getId().startsWith("m:") && dao.insertMapping(params(tenantId, row, newGroups)) == null) {
                throw new IllegalArgumentException("이미 연결되었거나 사용할 수 없는 공정입니다.");
            }
        }
        return dao.list(tenantId);
    }

    /** 테넌트 단위 공정 마스터(p:)를 저장한다. 작업장에 연결된 공정은 삭제하지 않는다. */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public List<ProcessNodeVO> saveMasters(Long tenantId, ProcessChangesVO changes) {
        requireTenant(tenantId);
        validateBatch(changes, "p");
        for (ProcessNodeVO row : changes.getInsertedRows()) validateNode(row);
        for (ProcessNodeVO row : changes.getUpdatedRows()) validateNode(row);
        for (ProcessNodeVO row : changes.getDeletedRows()) {
            if (dao.deleteProcess(params(tenantId, row, null)) != 1) {
                throw new IllegalArgumentException("연결된 작업장이 있는 공정은 삭제할 수 없습니다.");
            }
        }
        for (ProcessNodeVO row : changes.getInsertedRows()) {
            if (dao.insertProcess(params(tenantId, row, null)) == null) {
                throw new IllegalStateException("공정 저장 결과가 없습니다.");
            }
        }
        for (ProcessNodeVO row : changes.getUpdatedRows()) {
            requireAffected(dao.updateProcess(params(tenantId, row, null)));
        }
        return dao.listMasters(tenantId);
    }

    private void validateBatch(ProcessChangesVO changes, String prefixes) {
        if (changes == null || changes.getInsertedRows() == null
                || changes.getUpdatedRows() == null || changes.getDeletedRows() == null) {
            throw new IllegalArgumentException("변경 행을 확인해 주세요.");
        }
        Set<String> ids = new HashSet<>();
        List<List<ProcessNodeVO>> batches = Arrays.asList(
                changes.getInsertedRows(), changes.getUpdatedRows(), changes.getDeletedRows());
        for (int batch = 0; batch < batches.size(); batch++) {
            for (ProcessNodeVO row : batches.get(batch)) {
                if (row == null || !StringUtils.hasText(row.getId()) || !ids.add(row.getId())) {
                    throw new IllegalArgumentException("변경 행 ID가 올바르지 않습니다.");
                }
                if (row.getId().length() < 3 || row.getId().charAt(1) != ':'
                        || prefixes.indexOf(row.getId().charAt(0)) < 0) {
                    throw new IllegalArgumentException("행 구분이 올바르지 않습니다.");
                }
                if (batch == 0) {
                    if (!row.getId().matches("[gmp]:new-[A-Za-z0-9-]+")) {
                        throw new IllegalArgumentException("신규 행 ID를 확인해 주세요.");
                    }
                } else {
                    parseId(row.getId());
                }
            }
        }
    }

    private Map<String, Object> params(Long tenantId, ProcessNodeVO row, Map<String, Long> newGroups) {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("row", row);
        if (!row.getId().startsWith("g:new-") && !row.getId().startsWith("m:new-")
                && !row.getId().startsWith("p:new-")) {
            params.put("id", parseId(row.getId()));
        }
        if (row.getId().startsWith("m:")) {
            Long groupId = newGroups == null ? null : newGroups.get(row.getParentId());
            params.put("groupId", groupId != null ? groupId : parseId(row.getParentId()));
            params.put("processId", row.getProcessId());
        }
        return params;
    }

    private Long parseId(String id) {
        if (id == null || !id.matches("[gmp]:[1-9][0-9]*")) {
            throw new IllegalArgumentException("저장된 행 ID를 확인해 주세요.");
        }
        try {
            return Long.valueOf(id.substring(2));
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("저장된 행 ID를 확인해 주세요.", ex);
        }
    }

    private void validateNode(ProcessNodeVO row) {
        if (row.getId().startsWith("m:")) {
            if (!StringUtils.hasText(row.getParentId()) || !row.getParentId().startsWith("g:")) {
                throw new IllegalArgumentException("작업장을 선택해 주세요.");
            }
            if (row.getProcessId() == null || row.getProcessId() <= 0) {
                throw new IllegalArgumentException("연결할 공정을 선택해 주세요.");
            }
            return;
        }
        if (!StringUtils.hasText(row.getName()) || row.getName().trim().length() > 100) {
            throw new IllegalArgumentException("이름은 1~100자로 입력해 주세요.");
        }
        if (row.getDescription() != null && row.getDescription().length() > 255) {
            throw new IllegalArgumentException("설명은 255자 이하여야 합니다.");
        }
        if (row.getParentId() != null) {
            throw new IllegalArgumentException(row.getId().startsWith("g:")
                    ? "작업장은 최상위여야 합니다." : "공정은 최상위여야 합니다.");
        }
        if (row.getId().startsWith("p:")) validateImage(row.getImage());
    }

    private void validateImage(String image) {
        if (!StringUtils.hasText(image)) return;
        boolean png = image.startsWith("data:image/png;base64,");
        boolean jpeg = image.startsWith("data:image/jpeg;base64,");
        if (!png && !jpeg) throw new IllegalArgumentException("PNG/JPEG 이미지만 사용할 수 있습니다.");
        String encoded = image.substring(image.indexOf(',') + 1);
        if (encoded.length() > 699052) throw new IllegalArgumentException("이미지는 512KB 이하여야 합니다.");
        try {
            byte[] bytes = Base64.getDecoder().decode(encoded);
            if (bytes.length == 0 || bytes.length > 512 * 1024) throw new IllegalArgumentException("이미지는 512KB 이하여야 합니다.");
            try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
                if (input == null) throw new IllegalArgumentException("이미지를 확인해 주세요.");
                Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
                if (!readers.hasNext()) throw new IllegalArgumentException("이미지를 확인해 주세요.");
                ImageReader reader = readers.next();
                try {
                    reader.setInput(input, true, true);
                    if (!(png ? "png".equalsIgnoreCase(reader.getFormatName()) : "JPEG".equalsIgnoreCase(reader.getFormatName()))
                            || (long) reader.getWidth(0) * reader.getHeight(0) > 16777216L || reader.read(0) == null) {
                        throw new IllegalArgumentException("이미지를 확인해 주세요.");
                    }
                } finally {
                    reader.dispose();
                }
            }
        } catch (IOException | IndexOutOfBoundsException ex) {
            throw new IllegalArgumentException("이미지를 확인해 주세요.", ex);
        }
    }

    private void requireTenant(Long tenantId) {
        if (tenantId == null || tenantId <= 0) throw new IllegalArgumentException("테넌트를 확인해 주세요.");
    }

    private void requireAffected(int count) {
        if (count != 1) throw new IllegalArgumentException("대상 행이 없거나 삭제할 수 없습니다.");
    }
}
