package egovframework.let.co.master.classification.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import org.junit.jupiter.api.Test;
import com.fasterxml.jackson.databind.ObjectMapper;
import egovframework.let.co.master.classification.domain.model.*;
import egovframework.let.co.master.classification.domain.repository.ClassificationDAO;
import egovframework.let.co.master.material.domain.model.MaterialInfoSaveRequestVO;
import egovframework.let.co.master.customer.domain.model.CustomerInfoSaveRequestVO;

class ClassificationSelectionValidatorTest {
    private final ClassificationDAO dao = mock(ClassificationDAO.class);
    private final ClassificationSelectionValidator validator = new ClassificationSelectionValidator(dao);

    private ClassificationVO row(long id, int level, Long parent, String active) {
        ClassificationVO row = new ClassificationVO();
        row.setId(id); row.setLevel(level); row.setParentId(parent); row.setUseAt(active);
        return row;
    }

    @Test void acceptsAnyItemDepthAndChecksAuthenticatedTenantAncestors() throws Exception {
        when(dao.selectById(ClassificationKind.ITEM, 9L, 3L)).thenReturn(row(3, 3, 2L, "Y"));
        when(dao.selectById(ClassificationKind.ITEM, 9L, 2L)).thenReturn(row(2, 2, 1L, "Y"));
        when(dao.selectById(ClassificationKind.ITEM, 9L, 1L)).thenReturn(row(1, 1, null, "Y"));
        validator.item(9L, 3L, null);
        validator.item(9L, 1L, null);
        verify(dao, times(2)).selectById(ClassificationKind.ITEM, 9L, 1L);
    }

    @Test void rejectsMissingForeignInactiveAndMalformedHierarchy() throws Exception {
        assertThatThrownBy(() -> validator.item(9L, 999L, null)).isInstanceOf(IllegalArgumentException.class);
        when(dao.selectById(ClassificationKind.ITEM, 9L, 2L)).thenReturn(row(2, 2, 1L, "Y"));
        when(dao.selectById(ClassificationKind.ITEM, 9L, 1L)).thenReturn(row(1, 1, null, "N"));
        assertThatThrownBy(() -> validator.item(9L, 2L, null)).isInstanceOf(IllegalArgumentException.class);
        when(dao.selectById(ClassificationKind.ITEM, 9L, 1L)).thenReturn(row(1, 2, 2L, "Y"));
        assertThatThrownBy(() -> validator.item(9L, 2L, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> validator.item(9L, -1L, null)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test void permitsClearingAndUnchangedInactiveReferencesWithoutLookup() throws Exception {
        validator.item(9L, null, 2L);
        validator.item(9L, 2L, 2L);
        validator.partner(9L, 1L, 2L, 1L, 2L);
        verifyNoInteractions(dao);
    }

    @Test void validatesPartnerLevelParentAndAllowsRootOnly() throws Exception {
        when(dao.selectById(ClassificationKind.PARTNER, 9L, 1L)).thenReturn(row(1, 1, null, "Y"));
        when(dao.selectById(ClassificationKind.PARTNER, 9L, 2L)).thenReturn(row(2, 2, 1L, "Y"));
        validator.partner(9L, 1L, 2L, null, null);
        validator.partner(9L, 1L, null, null, null);
        assertThatThrownBy(() -> validator.partner(9L, null, 2L, null, null))
                .isInstanceOf(IllegalArgumentException.class);
        when(dao.selectById(ClassificationKind.PARTNER, 9L, 2L)).thenReturn(row(2, 2, 4L, "Y"));
        assertThatThrownBy(() -> validator.partner(9L, 1L, 2L, null, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test void distinguishesOmittedFromExplicitNullAndRejectsFractionalIds() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        assertThat(mapper.readValue("{}", MaterialInfoSaveRequestVO.class).isItemClsIdProvided()).isFalse();
        assertThat(mapper.readValue("{\"itemClsId\":null}", MaterialInfoSaveRequestVO.class).isItemClsIdProvided()).isTrue();
        assertThat(mapper.readValue("{\"businessKind1\":null}", CustomerInfoSaveRequestVO.class)
                .isBusinessKind1Provided()).isTrue();
        for (String value : new String[] {"1.5", "-1", "\"3\"", "9007199254740992", "true"}) {
            assertThatThrownBy(() -> mapper.readValue("{\"itemClsId\":" + value + "}", MaterialInfoSaveRequestVO.class))
                    .isInstanceOf(com.fasterxml.jackson.core.JsonProcessingException.class);
            assertThatThrownBy(() -> mapper.readValue("{\"businessKind2\":" + value + "}", CustomerInfoSaveRequestVO.class))
                    .isInstanceOf(com.fasterxml.jackson.core.JsonProcessingException.class);
        }
    }
}
