package egovframework.let.hr.employee.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "사원 변경 세트")
@Getter
@Setter
public class EmployeeBatchChangeSetVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "추가 행")
    private List<EmployeeChangeVO> insertedRows = new ArrayList<EmployeeChangeVO>();

    @Schema(description = "수정 행")
    private List<EmployeeChangeVO> updatedRows = new ArrayList<EmployeeChangeVO>();

    @Schema(description = "삭제 행. 사원은 삭제하지 않고 퇴사일로 퇴직 처리하므로 빈 배열만 허용")
    private List<EmployeeChangeVO> deletedRows = new ArrayList<EmployeeChangeVO>();

    public void setInsertedRows(List<EmployeeChangeVO> insertedRows) {
        this.insertedRows = insertedRows == null ? new ArrayList<EmployeeChangeVO>() : insertedRows;
    }

    public void setUpdatedRows(List<EmployeeChangeVO> updatedRows) {
        this.updatedRows = updatedRows == null ? new ArrayList<EmployeeChangeVO>() : updatedRows;
    }

    public void setDeletedRows(List<EmployeeChangeVO> deletedRows) {
        this.deletedRows = deletedRows == null ? new ArrayList<EmployeeChangeVO>() : deletedRows;
    }
}
