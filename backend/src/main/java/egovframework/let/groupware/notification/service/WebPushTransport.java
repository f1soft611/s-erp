package egovframework.let.groupware.notification.service;

public interface WebPushTransport {

    void send(String endpoint, String p256dh, String auth, String payload) throws TransportException;

    enum FailureKind {
        SUBSCRIPTION_GONE,
        TRANSIENT,
        PERMANENT
    }

    final class TransportException extends Exception {
        private static final long serialVersionUID = 1L;

        private final FailureKind failureKind;
        private final String errorCode;
        private final int httpStatus;
        private final Long retryAfterSeconds;

        public TransportException(FailureKind failureKind, String errorCode, int httpStatus,
                Long retryAfterSeconds) {
            super(errorCode);
            if (failureKind == null || errorCode == null || !errorCode.matches("[A-Z0-9_]{1,40}")) {
                throw new IllegalArgumentException("A classified web push transport failure is required.");
            }
            this.failureKind = failureKind;
            this.errorCode = errorCode;
            this.httpStatus = httpStatus;
            this.retryAfterSeconds = retryAfterSeconds;
        }

        public FailureKind getFailureKind() { return failureKind; }
        public String getErrorCode() { return errorCode; }
        public int getHttpStatus() { return httpStatus; }
        public Long getRetryAfterSeconds() { return retryAfterSeconds; }
    }
}
