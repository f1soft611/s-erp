package egovframework.let.hr.order.domain.model;

import java.util.ArrayList;
import java.util.List;

/** 이력에 기록할 한 사원의 변경 내용(내부용). */
public class HrOrderChange {

    private final Long userId;
    private final List<Field> fields = new ArrayList<>();

    public HrOrderChange(Long userId) {
        this.userId = userId;
    }

    public Long getUserId() {
        return userId;
    }

    public List<Field> getFields() {
        return fields;
    }

    public HrOrderChange add(HrOrderField field, String preValue, String preName, String postValue, String postName) {
        fields.add(new Field(field, preValue, preName, postValue, postName));
        return this;
    }

    /** 변경항목 1개의 명령 전/후 값. */
    public static class Field {

        private final HrOrderField field;
        private final String preValue;
        private final String preName;
        private final String postValue;
        private final String postName;

        public Field(HrOrderField field, String preValue, String preName, String postValue, String postName) {
            this.field = field;
            this.preValue = preValue;
            this.preName = preName;
            this.postValue = postValue;
            this.postName = postName;
        }

        public HrOrderField getField() {
            return field;
        }

        public String getPreValue() {
            return preValue;
        }

        public String getPreName() {
            return preName;
        }

        public String getPostValue() {
            return postValue;
        }

        public String getPostName() {
            return postName;
        }
    }
}
