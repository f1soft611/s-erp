package egovframework.let.co.master.warehouse.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "창고 검색 조건. 입력하지 않은 조건은 검색에서 제외")
@Getter
@Setter
public class WarehouseSearchCondition implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "창고 코드, 창고명 통합 부분 검색어")
    private String keyword;

    @Schema(description = "창고구분(공통코드 WAREHOUSE_TYPE) 일치 검색")
    private String warehouseType;

    @Schema(description = "불용창고여부. 미입력 시 전체 조회", allowableValues = { "Y", "N" }, example = "N")
    private String disuseAt;
}
