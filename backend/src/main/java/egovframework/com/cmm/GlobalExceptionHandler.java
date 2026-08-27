package egovframework.com.cmm;

import egovframework.com.cmm.exception.BizException;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BizException.class)
    public ResponseEntity<Map<String, Object>> handleBizException(BizException e) {
        Map<String, Object> res = new HashMap<>();
        res.put("resultCode", "FAIL");
        res.put("resultMessage", e.getMessage());
        res.put("message", e.getMessage());
        return ResponseEntity.status(400).body(res);
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, Object>> handleDataAccessException(DataAccessException e) {
        Throwable t = e;
        String msg = null;

        while (t != null) {
            // MSSQL JDBC 예외 메시지 우선
            if (t instanceof com.microsoft.sqlserver.jdbc.SQLServerException) {
                msg = t.getMessage();
                break;
            }
            t = t.getCause();
        }

        if (msg == null) {
            msg = e.getMessage();
        }

        Map<String, Object> res = new HashMap<>();
        res.put("resultCode", "FAIL");
        res.put("message", msg);
        res.put("resultMessage", msg);
        return ResponseEntity.status(500).body(res);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalStateException(IllegalStateException e) {
        Map<String, Object> res = new HashMap<>();
        res.put("resultCode", "FAIL");
        res.put("message", e.getMessage());
        res.put("resultMessage", e.getMessage());
        return ResponseEntity.status(500).body(res);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgumentException(IllegalArgumentException e) {
        String message = (e.getMessage() == null || e.getMessage().trim().isEmpty())
                ? "요청 값이 올바르지 않습니다."
                : e.getMessage();

        Map<String, Object> res = new HashMap<>();
        res.put("resultCode", "FAIL");
        res.put("message", message);
        res.put("resultMessage", message);
        return ResponseEntity.status(400).body(res);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatusException(ResponseStatusException e) {
        String reason = e.getReason() == null || e.getReason().trim().isEmpty()
                ? "요청을 처리할 수 없습니다."
                : e.getReason();

        Map<String, Object> res = new HashMap<>();
        res.put("resultCode", "FAIL");
        res.put("message", reason);
        res.put("resultMessage", reason);
        return ResponseEntity.status(e.getStatus()).body(res);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleException(Exception e) {
        Map<String, Object> res = new HashMap<>();
        res.put("resultCode", "FAIL");
        res.put("message", "서버 처리 중 오류가 발생했습니다.");
        res.put("resultMessage", "서버 처리 중 오류가 발생했습니다.");
        return ResponseEntity.status(500).body(res);
    }
}
