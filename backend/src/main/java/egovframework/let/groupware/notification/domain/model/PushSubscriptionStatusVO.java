package egovframework.let.groupware.notification.domain.model;

public class PushSubscriptionStatusVO {

    private boolean enabled;
    private long activeDeviceCount;
    private CurrentDevice currentDevice = new CurrentDevice();
    private String vapidPublicKey;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public long getActiveDeviceCount() { return activeDeviceCount; }
    public void setActiveDeviceCount(long activeDeviceCount) { this.activeDeviceCount = activeDeviceCount; }
    public CurrentDevice getCurrentDevice() { return currentDevice; }
    public void setCurrentDevice(CurrentDevice currentDevice) { this.currentDevice = currentDevice; }
    public String getVapidPublicKey() { return vapidPublicKey; }
    public void setVapidPublicKey(String vapidPublicKey) { this.vapidPublicKey = vapidPublicKey; }

    public static class CurrentDevice {
        private boolean subscribed;
        private Long subscriptionId;

        public boolean isSubscribed() { return subscribed; }
        public void setSubscribed(boolean subscribed) { this.subscribed = subscribed; }
        public Long getSubscriptionId() { return subscriptionId; }
        public void setSubscriptionId(Long subscriptionId) { this.subscriptionId = subscriptionId; }
    }
}
