package egovframework.com.feed.service.impl;

import java.util.ArrayList;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.feed.domain.model.FeedVO;
import egovframework.com.feed.service.FeedService;

@Service("feedService")
public class FeedServiceImpl extends EgovAbstractServiceImpl implements FeedService {

    @Override
    public List<FeedVO> listFeeds(Long tenantId, String actorId, int page, int size) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (!StringUtils.hasText(actorId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "사용자 정보가 올바르지 않습니다.");
        }
        return new ArrayList<>();
    }

    @Override
    @Transactional
    public FeedVO createFeed(Long tenantId, String eventType, String targetType, Long targetId, String actorId, String actorName, String message, String metadataJson) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (!StringUtils.hasText(eventType) || !StringUtils.hasText(targetType) || targetId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "피드 정보가 올바르지 않습니다.");
        }

        FeedVO created = new FeedVO();
        created.setFeedId(1L);
        created.setTenantId(tenantId);
        created.setEventType(eventType);
        created.setTargetType(targetType);
        created.setTargetId(targetId);
        created.setActorId(actorId);
        created.setActorName(actorName);
        created.setMessage(message);
        created.setMetadataJson(metadataJson);
        created.setReadYn("N");
        return created;
    }

    @Override
    @Transactional
    public void markRead(Long tenantId, Long feedId, String actorId) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (feedId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "피드 ID가 없습니다.");
        }
    }
}
