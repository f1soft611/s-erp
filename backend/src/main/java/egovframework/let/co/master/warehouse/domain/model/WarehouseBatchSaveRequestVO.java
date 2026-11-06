package egovframework.let.co.master.warehouse.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "창고 일괄 저장 요청")
@Getter
@Setter
public class WarehouseBatchSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "한 트랜잭션으로 저장할 창고 변경 세트")
    private WarehouseBatchChangeSetVO warehouses = new WarehouseBatchChangeSetVO();
}
