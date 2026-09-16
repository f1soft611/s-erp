package egovframework.com.feed.service;

import java.util.List;

import egovframework.com.feed.domain.model.FeedVO;

public interface FeedService {
    List<FeedVO> listFeeds(Long tenantId, String actorId, int page, int size) throws Exception;
    FeedVO createFeed(Long tenantId, String eventType, String targetType, Long targetId, String actorId, String actorName, String message, String metadataJson) throws Exception;
    void markRead(Long tenantId, Long feedId, String actorId) throws Exception;
}
