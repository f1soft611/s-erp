package egovframework.let.pr.process.service.impl;

import java.io.ByteArrayInputStream;
import java.io.IOException;
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
    @Transactional(rollbackFor = Exception.class)
    public List<ProcessNodeVO> save(Long tenantId, ProcessChangesVO changes) {
        requireTenant(tenantId);
        if (changes == null || changes.getInsertedRows() == null
                || changes.getUpdatedRows() == null || changes.getDeletedRows() == null) {
            throw new IllegalArgumentException("변경 행을 확인해 주세요.");
        }
        Set<String> ids = new HashSet<>();
        List<List<ProcessNodeVO>> batches = java.util.Arrays.asList(
                changes.getInsertedRows(), changes.getUpdatedRows(), changes.getDeletedRows());
        for (int batch = 0; batch < batches.size(); batch++) {
            for (ProcessNodeVO row : batches.get(batch)) {
                if (row == null || !StringUtils.hasText(row.getId()) || !ids.add(row.getId())) {
                    throw new IllegalArgumentException("변경 행 ID가 올바르지 않습니다.");
                }
                if (!row.getId().startsWith("g:") && !row.getId().startsWith("p:")) {
                    throw new IllegalArgumentException("공정 구분이 올바르지 않습니다.");
                }
                if (batch == 0) {
                    if (!row.getId().matches("[gp]:new-[A-Za-z0-9-]+")) {
                        throw new IllegalArgumentException("신규 행 ID를 확인해 주세요.");
                    }
                } else {
                    parseId(row.getId());
                }
            }
        }
        for (ProcessNodeVO row : changes.getInsertedRows()) validate(row);
        for (ProcessNodeVO row : changes.getUpdatedRows()) validate(row);

        Map<String, Long> newGroups = new HashMap<>();
        for (ProcessNodeVO row : changes.getDeletedRows()) {
            if (row.getId().startsWith("p:")) requireAffected(dao.deleteProcess(params(tenantId, row, null)));
        }
        for (ProcessNodeVO row : changes.getDeletedRows()) {
            if (row.getId().startsWith("g:")) requireAffected(dao.deleteGroup(params(tenantId, row, null)));
        }
        for (ProcessNodeVO row : changes.getInsertedRows()) {
            if (row.getId().startsWith("g:")) {
                Long id = dao.insertGroup(params(tenantId, row, null));
                if (id == null) throw new IllegalStateException("공정그룹 저장 결과가 없습니다.");
                newGroups.put(row.getId(), id);
            }
        }
        for (ProcessNodeVO row : changes.getUpdatedRows()) {
            if (row.getId().startsWith("g:")) requireAffected(dao.updateGroup(params(tenantId, row, null)));
        }
        for (ProcessNodeVO row : changes.getInsertedRows()) {
            if (row.getId().startsWith("p:")) {
                Long id = dao.insertProcess(params(tenantId, row, newGroups));
                if (id == null) throw new IllegalStateException("공정 저장 결과가 없습니다.");
            }
        }
        for (ProcessNodeVO row : changes.getUpdatedRows()) {
            if (row.getId().startsWith("p:")) requireAffected(dao.updateProcess(params(tenantId, row, newGroups)));
        }
        return dao.list(tenantId);
    }

    private Map<String, Object> params(Long tenantId, ProcessNodeVO row, Map<String, Long> newGroups) {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("row", row);
        if (!row.getId().startsWith("g:new-") && !row.getId().startsWith("p:new-")) {
            params.put("id", parseId(row.getId()));
        }
        if (row.getId().startsWith("p:") && newGroups != null) {
            Long groupId = newGroups.get(row.getParentId());
            params.put("groupId", groupId != null ? groupId : parseId(row.getParentId()));
        }
        return params;
    }

    private Long parseId(String id) {
        if (id == null || !id.matches("[gp]:[1-9][0-9]*")) {
            throw new IllegalArgumentException("저장된 행 ID를 확인해 주세요.");
        }
        try {
            return Long.valueOf(id.substring(2));
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("저장된 행 ID를 확인해 주세요.", ex);
        }
    }

    private void validate(ProcessNodeVO row) {
        if (!StringUtils.hasText(row.getName()) || row.getName().trim().length() > 100) {
            throw new IllegalArgumentException("이름은 1~100자로 입력해 주세요.");
        }
        if (row.getDescription() != null && row.getDescription().length() > 255) {
            throw new IllegalArgumentException("설명은 255자 이하여야 합니다.");
        }
        if (row.getId().startsWith("p:")) {
            if (!StringUtils.hasText(row.getParentId()) || !row.getParentId().startsWith("g:")) {
                throw new IllegalArgumentException("공정그룹을 선택해 주세요.");
            }
            validateImage(row.getImage());
        } else if (row.getParentId() != null) {
            throw new IllegalArgumentException("공정그룹은 최상위여야 합니다.");
        }
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
