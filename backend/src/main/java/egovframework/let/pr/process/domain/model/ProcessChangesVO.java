package egovframework.let.pr.process.domain.model;

import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class ProcessChangesVO {
    private List<ProcessNodeVO> insertedRows = new ArrayList<>();
    private List<ProcessNodeVO> updatedRows = new ArrayList<>();
    private List<ProcessNodeVO> deletedRows = new ArrayList<>();
}
