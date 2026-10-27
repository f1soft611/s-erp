package egovframework.let.co.master.classification.domain.model;

public enum ClassificationKind {
    ITEM(3, "Item"),
    PARTNER(2, "Partner");

    private final int maximumLevel;
    private final String statementPrefix;

    ClassificationKind(int maximumLevel, String statementPrefix) {
        this.maximumLevel = maximumLevel;
        this.statementPrefix = statementPrefix;
    }

    public int getMaximumLevel() {
        return maximumLevel;
    }

    public String getStatementPrefix() {
        return statementPrefix;
    }
}
