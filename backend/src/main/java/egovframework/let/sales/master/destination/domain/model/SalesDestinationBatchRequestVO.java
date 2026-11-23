package egovframework.let.sales.master.destination.domain.model;

import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SalesDestinationBatchRequestVO {
    private Long customerId;
    private List<SalesDestinationVO> insertedRows;
    private List<SalesDestinationVO> updatedRows;
}
