package com.sakuraverse.backend.scheduler;

import com.sakuraverse.backend.mapper.BlogMapper;
import com.sakuraverse.backend.mapper.RegionStatsMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.util.Set;

@Slf4j
@Component
public class ViewsSyncScheduler {

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @Autowired
    private BlogMapper blogMapper;

    @Autowired
    private RegionStatsMapper regionStatsMapper;

    @PostConstruct
    public void initViewsFromDb() {
        try {
            redisTemplate.opsForValue().setIfAbsent("site:views:total", blogMapper.getSiteViews());

            blogMapper.selectPosts(null, null, "latest").forEach(post -> {
                if (post.getViews() != null)
                    redisTemplate.opsForValue().setIfAbsent("post:views:" + post.getId(), post.getViews().longValue());
            });

            regionStatsMapper.getAllRegions().forEach(row -> {
                String region = (String) row.get("region");
                Object views = row.get("views");
                if (region != null && views != null)
                    redisTemplate.opsForValue().setIfAbsent("region:views:" + region, Long.parseLong(views.toString()));
            });
        } catch (Exception e) {
            log.warn("Failed to init views from DB: {}", e.getMessage());
        }
    }

    @Scheduled(fixedDelay = 5 * 60 * 1000)
    public void syncViewsToDb() {
        try {
            Object siteViews = redisTemplate.opsForValue().get("site:views:total");
            if (siteViews != null) blogMapper.setSiteViews(Long.parseLong(siteViews.toString()));

            Set<String> postKeys = redisTemplate.keys("post:views:*");
            if (postKeys != null) {
                for (String key : postKeys) {
                    Object val = redisTemplate.opsForValue().get(key);
                    if (val != null)
                        blogMapper.setViews(Long.parseLong(key.replace("post:views:", "")), Integer.parseInt(val.toString()));
                }
            }

            Set<String> regionKeys = redisTemplate.keys("region:views:*");
            if (regionKeys != null) {
                for (String key : regionKeys) {
                    Object val = redisTemplate.opsForValue().get(key);
                    if (val != null)
                        regionStatsMapper.setRegionViews(key.replace("region:views:", ""), Long.parseLong(val.toString()));
                }
            }
        } catch (Exception e) {
            log.warn("Failed to sync views to DB: {}", e.getMessage());
        }
    }
}
