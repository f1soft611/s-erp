package egovframework.let.co.master.customer.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "거래처 변경 세트")
@Getter
@Setter
public class CustomerInfoBatchChangeSetVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "추가 행")
    private List<CustomerInfoChangeVO> insertedRows = new ArrayList<>();

    @Schema(description = "수정 행")
    private List<CustomerInfoChangeVO> updatedRows = new ArrayList<>();

    @Schema(description = "삭제 행. 물리 삭제는 지원하지 않으므로 빈 배열만 허용하며 사용 여부로 상태 관리")
    private List<CustomerInfoChangeVO> deletedRows = new ArrayList<>();

    public void setInsertedRows(List<CustomerInfoChangeVO> insertedRows) {
        this.insertedRows = insertedRows == null ? new ArrayList<>() : insertedRows;
    }

    public void setUpdatedRows(List<CustomerInfoChangeVO> updatedRows) {
        this.updatedRows = updatedRows == null ? new ArrayList<>() : updatedRows;
    }

    public void setDeletedRows(List<CustomerInfoChangeVO> deletedRows) {
        this.deletedRows = deletedRows == null ? new ArrayList<>() : deletedRows;
    }
}
