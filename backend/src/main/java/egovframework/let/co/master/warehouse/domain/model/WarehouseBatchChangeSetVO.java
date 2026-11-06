package egovframework.let.co.master.warehouse.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "창고 변경 세트")
@Getter
@Setter
public class WarehouseBatchChangeSetVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "추가 행")
    private List<WarehouseChangeVO> insertedRows = new ArrayList<>();

    @Schema(description = "수정 행")
    private List<WarehouseChangeVO> updatedRows = new ArrayList<>();

    @Schema(description = "삭제 행. 물리 삭제는 지원하지 않으므로 빈 배열만 허용하며 불용창고 여부로 상태 관리")
    private List<WarehouseChangeVO> deletedRows = new ArrayList<>();

    public void setInsertedRows(List<WarehouseChangeVO> insertedRows) {
        this.insertedRows = insertedRows == null ? new ArrayList<>() : insertedRows;
    }

    public void setUpdatedRows(List<WarehouseChangeVO> updatedRows) {
        this.updatedRows = updatedRows == null ? new ArrayList<>() : updatedRows;
    }

    public void setDeletedRows(List<WarehouseChangeVO> deletedRows) {
        this.deletedRows = deletedRows == null ? new ArrayList<>() : deletedRows;
    }
}
