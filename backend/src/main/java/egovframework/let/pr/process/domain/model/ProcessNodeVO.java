package egovframework.let.pr.process.domain.model;

import lombok.Data;

@Data
public class ProcessNodeVO {
    private String id;
    private String parentId;
    private String code;
    private String name;
    private String description;
    private String image;
    private boolean inactive;
    private boolean productionOutsource;
    private boolean purchaseOutsource;
    private boolean inspection;
    private boolean packing;
    private boolean stockManagement;
    private boolean previousStockOut;
    private boolean finalProcess;
    private boolean plannedEquipment;
    private boolean actualEquipmentRequired;
}
