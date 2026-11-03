package egovframework.let.groupware.notification.domain.model;

import java.time.LocalDateTime;

public class PushSubscriptionVO {

    private Long subscriptionId;
    private Long tenantId;
    private Long userId;
    private byte[] endpointHash;
    private byte[] endpointCiphertext;
    private byte[] keysCiphertext;
    private String encryptionKeyVersion;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime inactiveAt;

    public Long getSubscriptionId() { return subscriptionId; }
    public void setSubscriptionId(Long subscriptionId) { this.subscriptionId = subscriptionId; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public byte[] getEndpointHash() { return endpointHash; }
    public void setEndpointHash(byte[] endpointHash) { this.endpointHash = endpointHash; }
    public byte[] getEndpointCiphertext() { return endpointCiphertext; }
    public void setEndpointCiphertext(byte[] endpointCiphertext) { this.endpointCiphertext = endpointCiphertext; }
    public byte[] getKeysCiphertext() { return keysCiphertext; }
    public void setKeysCiphertext(byte[] keysCiphertext) { this.keysCiphertext = keysCiphertext; }
    public String getEncryptionKeyVersion() { return encryptionKeyVersion; }
    public void setEncryptionKeyVersion(String encryptionKeyVersion) { this.encryptionKeyVersion = encryptionKeyVersion; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public LocalDateTime getInactiveAt() { return inactiveAt; }
    public void setInactiveAt(LocalDateTime inactiveAt) { this.inactiveAt = inactiveAt; }
}
