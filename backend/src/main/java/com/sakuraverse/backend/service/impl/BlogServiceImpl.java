package com.sakuraverse.backend.service.impl;

import org.elasticsearch.search.aggregations.AggregationBuilders;
import org.elasticsearch.search.aggregations.Aggregations;
import org.elasticsearch.search.aggregations.bucket.terms.Terms;
import org.elasticsearch.search.sort.SortOrder;
import com.sakuraverse.backend.document.PostDocument;
import com.sakuraverse.backend.document.SearchLogDocument;
import com.sakuraverse.backend.entity.BlogPost;
import com.sakuraverse.backend.entity.Comment;
import com.sakuraverse.backend.exception.BusinessException;
import com.sakuraverse.backend.mapper.BlogMapper;
import com.sakuraverse.backend.service.BlogService;
import lombok.extern.slf4j.Slf4j;
import org.elasticsearch.index.query.BoolQueryBuilder;
import org.elasticsearch.index.query.QueryBuilders;
import org.elasticsearch.search.sort.SortBuilders;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.client.elc.NativeQueryBuilder;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.core.query.NativeSearchQuery;
import org.springframework.data.elasticsearch.core.query.NativeSearchQueryBuilder;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import co.elastic.clients.elasticsearch._types.aggregations.StringTermsBucket;

import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Slf4j
@Service
public class BlogServiceImpl implements BlogService {

    @Autowired
    private BlogMapper blogMapper;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @Autowired
    private ElasticsearchOperations elasticsearchOperations;

    @Override
    public List<BlogPost> getPosts(String tag, String search, String sort) {
        // --- 1. SEARCH SCENARIO (Elasticsearch) ---
        if (StringUtils.hasText(search) && !"comments".equals(sort)) {
            logSearchTerm(search);

            try {
                // Java 8 适配写法：使用 QueryBuilders 构建查询条件
                BoolQueryBuilder boolQuery = QueryBuilders.boolQuery()
                        .should(QueryBuilders.matchQuery("title", search).boost(2.0f))
                        .should(QueryBuilders.matchQuery("excerpt", search))
                        .should(QueryBuilders.matchQuery("content", search))
                        .should(QueryBuilders.matchQuery("tags", search));

                // Java 8 适配写法：使用 NativeSearchQueryBuilder
                NativeSearchQueryBuilder queryBuilder = new NativeSearchQueryBuilder()
                        .withQuery(boolQuery);

                // Java 8 适配写法：使用 SortBuilders 进行排序
                if ("likes".equals(sort)) {
                    queryBuilder.withSort(SortBuilders.fieldSort("likes").order(SortOrder.DESC));
                } else if ("latest".equals(sort)) {
                    queryBuilder.withSort(SortBuilders.fieldSort("createTime").order(SortOrder.DESC));
                }

                // 构建查询对象
                NativeSearchQuery searchQuery = queryBuilder.build();

                // 执行查询
                SearchHits<PostDocument> hits = elasticsearchOperations.search(searchQuery, PostDocument.class);

                // 处理结果 (保持 Java 8 Stream 写法)
                return hits.stream().map(hit -> {
                    PostDocument doc = hit.getContent();
                    BlogPost post = new BlogPost();
                    post.setId(doc.getId());
                    post.setTitle(doc.getTitle());
                    post.setExcerpt(doc.getExcerpt());
                    post.setTags(doc.getTags() != null ? Arrays.asList(doc.getTags()) : new ArrayList<>());
                    post.setCategory(doc.getCategory());
                    post.setImageUrl("https://picsum.photos/800/600?random=" + doc.getId());
                    post.setDate(doc.getCreateTime() != null ? doc.getCreateTime() : new Date());
                    post.setLikes(doc.getLikes() != null ? doc.getLikes() : 0);
                    post.setComments(new ArrayList<>());
                    return post;
                }).collect(Collectors.toList());
            } catch (Exception e) {
                log.error("ES Search failed, falling back to DB: {}", e.getMessage());
            }
        }

        // --- 2. LIST SCENARIO (Redis + MySQL) ---
        String tagKey = (tag != null && !tag.isEmpty()) ? tag : "all";
        String searchKey = (search != null && !search.isEmpty()) ? search : "none";
        String sortKey = (sort != null && !sort.isEmpty()) ? sort : "latest";
        String cacheKey = "posts:list:" + tagKey + ":" + searchKey + ":" + sortKey;

        List<BlogPost> cachedPosts = (List<BlogPost>) redisTemplate.opsForValue().get(cacheKey);
        if (cachedPosts != null) {
            return cachedPosts;
        }

        List<BlogPost> dbPosts = blogMapper.selectPosts(tag, search, sort);

        if (dbPosts != null && !dbPosts.isEmpty()) {
            redisTemplate.opsForValue().set(cacheKey, dbPosts, 1, TimeUnit.HOURS);
        }

        return dbPosts;
    }

    @Async
    public void logSearchTerm(String keyword) {
        try {
            String normalized = keyword.trim().toLowerCase();
            if (normalized.length() < 2) return; 

            SearchLogDocument log = new SearchLogDocument();
            log.setId(UUID.randomUUID().toString());
            log.setKeyword(normalized);
            log.setSearchTime(new Date());
            
            elasticsearchOperations.save(log);
        } catch (Exception e) {
            log.error("Failed to log search term: {}", e.getMessage());
        }
    }

    @Override
    public List<Map<String, Object>> getSearchWordCloud() {
        String aggName = "top_keywords";

        // 1. 构建查询 (Java 8 / Spring Boot 2 写法)
        NativeSearchQueryBuilder queryBuilder = new NativeSearchQueryBuilder()
                // 添加聚合：Terms聚合，统计 "keyword" 字段，取前20个
                .addAggregation(AggregationBuilders.terms(aggName).field("keyword").size(20))
                // 只要聚合结果，不需要文档列表，设置分页大小为1 (旧版API没法直接设size=0，用分页1代替)
                .withPageable(PageRequest.of(0, 1));

        NativeSearchQuery query = queryBuilder.build();

        // 2. 执行搜索
        SearchHits<SearchLogDocument> response = elasticsearchOperations.search(query, SearchLogDocument.class);

        List<Map<String, Object>> result = new ArrayList<>();

// 3. 解析聚合结果
        if (response.getAggregations() != null) {
            // 关键修复步骤：
            // 1. 获取 Spring 的包装容器
            // 2. 调用 .aggregations() 获取底层的 Object
            // 3. 强制转换为 org.elasticsearch.search.aggregations.Aggregations
            Aggregations aggregations = (Aggregations) response.getAggregations().aggregations();

            // 4. 从原生 ES 对象中获取 Terms 聚合
            Terms terms = aggregations.get(aggName);

            if (terms != null) {
                for (Terms.Bucket bucket : terms.getBuckets()) {
                    Map<String, Object> map = new HashMap<>();
                    map.put("text", bucket.getKeyAsString());
                    map.put("count", bucket.getDocCount());
                    result.add(map);
                }
            }
        }

        if (result.isEmpty()) {
            return getDefaultCloudData();
        }

        return result;
    }
    private List<Map<String, Object>> getDefaultCloudData() {
        List<Map<String, Object>> defaults = new ArrayList<>();
        String[] words = {"Anime", "React", "Java", "Spring", "Travel", "Music", "Design", "Code", "Life", "AI"};
        for (int i = 0; i < words.length; i++) {
            Map<String, Object> map = new HashMap<>();
            map.put("text", words[i]);
            map.put("count", (words.length - i) * 10L + 5); 
            defaults.add(map);
        }
        return defaults;
    }

    @Override
    public BlogPost getPostDetail(Long id) {
        String cacheKey = "post:detail:" + id;
        BlogPost cached = (BlogPost) redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) return cached;

        BlogPost post = blogMapper.selectPostDetail(id);
        if (post != null) {
            redisTemplate.opsForValue().set(cacheKey, post, 1, TimeUnit.HOURS);
        }
        return post;
    }

    /**
     * Optimistic Locking Implementation for Like
     */
    @Override
    public void likePost(Long id) {
        int retryCount = 0;
        int maxRetries = 5; // Prevent infinite loops
        
        while (retryCount < maxRetries) {
            // 1. Fetch current data (including version)
            BlogPost post = blogMapper.selectPostSimple(id);
            if (post == null) throw new BusinessException("Post not found");
            
            // 2. Calculate new state
            Integer currentVersion = post.getVersion();
            Integer newLikes = post.getLikes() + 1;
            
            // 3. Attempt Update (CAS)
            int rowsUpdated = blogMapper.compareAndSetLikes(id, newLikes, currentVersion);
            
            if (rowsUpdated > 0) {
                // Success
                redisTemplate.delete("post:detail:" + id);
                clearCaches(null);
                updateEsLikes(id, 1);
                return;
            }
            
            // 4. Failure (Version changed), retry
            retryCount++;
            try {
                // Short random delay to reduce contention
                Thread.sleep(10 + new Random().nextInt(20));
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Interrupted during lock retry");
            }
        }
        
        throw new BusinessException("Server busy, please try liking again later.");
    }

    /**
     * Optimistic Locking Implementation for Unlike
     */
    @Override
    public void unlikePost(Long id) {
        int retryCount = 0;
        int maxRetries = 5;
        
        while (retryCount < maxRetries) {
            // 1. Fetch current data
            BlogPost post = blogMapper.selectPostSimple(id);
            if (post == null) throw new BusinessException("Post not found");
            
            // 2. Logic check: cannot go below 0
            if (post.getLikes() <= 0) {
                return; // Nothing to decrement
            }
            
            Integer currentVersion = post.getVersion();
            Integer newLikes = post.getLikes() - 1;
            
            // 3. Attempt Update
            int rowsUpdated = blogMapper.compareAndSetLikes(id, newLikes, currentVersion);
            
            if (rowsUpdated > 0) {
                // Success
                redisTemplate.delete("post:detail:" + id);
                clearCaches(null);
                updateEsLikes(id, -1);
                return;
            }
            
            // 4. Failure, retry
            retryCount++;
            try {
                Thread.sleep(10 + new Random().nextInt(20));
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        
        throw new BusinessException("Server busy, please try unliking again later.");
    }

    @Async
    public void updateEsLikes(Long id, int delta) {
        try {
            PostDocument doc = elasticsearchOperations.get(String.valueOf(id), PostDocument.class);
            if (doc != null) {
                int current = doc.getLikes() == null ? 0 : doc.getLikes();
                // Ensure non-negative
                int newVal = Math.max(0, current + delta);
                doc.setLikes(newVal);
                elasticsearchOperations.save(doc);
            }
        } catch (Exception e) {
            log.error("Failed to sync likes to ES: {}", e.getMessage());
        }
    }

    @Override
    @Transactional
    public void addComment(Long postId, Comment comment) {
        comment.setPostId(postId);
        if (comment.getAuthor() == null || comment.getAuthor().trim().isEmpty()) {
            comment.setAuthor("Guest User");
        }
        blogMapper.insertComment(comment);
        redisTemplate.delete("post:detail:" + postId);
        clearCaches(null);
    }

    @Override
    public List<String> getAllTags() {
        String cacheKey = "tags:all";
        List<String> cachedTags = (List<String>) redisTemplate.opsForValue().get(cacheKey);
        if (cachedTags != null) {
            return cachedTags;
        }

        List<String> tags = blogMapper.selectAllTags();
        if (tags != null && !tags.isEmpty()) {
            redisTemplate.opsForValue().set(cacheKey, tags, 6, TimeUnit.HOURS);
        } else {
            return Arrays.asList("React", "Anime", "Java", "Spring", "Travel");
        }
        return tags;
    }
    
    @Override
    @Transactional
    public void savePost(BlogPost post) {
        Long catId = blogMapper.getCategoryIdByName(post.getCategory());
        if (catId == null) {
            blogMapper.insertCategory(post.getCategory());
        }
        
        if (post.getId() == null) {
            post.setLikes(0);
            post.setViews(0);
            post.setVersion(0); // Init version
            blogMapper.insertPost(post);
        } else {
            BlogPost existing = blogMapper.selectPostDetail(post.getId());
            if (existing != null) {
                post.setLikes(existing.getLikes());
                post.setViews(existing.getViews());
                post.setVersion(existing.getVersion()); // Keep version
            }
            blogMapper.updatePost(post);
            blogMapper.deletePostTags(post.getId());
        }
        
        if (post.getTags() != null) {
            for (String tagName : post.getTags()) {
                String normalizedTag = tagName.trim();
                if (normalizedTag.isEmpty()) continue;
                
                Long tagId = blogMapper.getTagIdByName(normalizedTag);
                if (tagId == null) {
                    blogMapper.insertTag(normalizedTag);
                    tagId = blogMapper.getTagIdByName(normalizedTag);
                }
                blogMapper.insertPostTag(post.getId(), tagId);
            }
        }
        
        try {
            PostDocument doc = new PostDocument();
            doc.setId(post.getId());
            doc.setTitle(post.getTitle());
            doc.setExcerpt(post.getExcerpt());
            doc.setContent(post.getContent());
            doc.setCategory(post.getCategory());
            doc.setTags(post.getTags().toArray(new String[0]));
            doc.setLikes(post.getLikes() == null ? 0 : post.getLikes());
            doc.setCreateTime(post.getDate() == null ? new Date() : post.getDate());
            
            elasticsearchOperations.save(doc);
        } catch (Exception e) {
            log.error("ES Update failed: {}", e.getMessage());
        }
        
        clearCaches(post.getId());
    }
    
    @Override
    @Transactional
    public void deletePost(Long id) {
        blogMapper.deletePostTags(id);
        blogMapper.deletePostComments(id);
        blogMapper.deletePost(id);
        
        try {
            elasticsearchOperations.delete(String.valueOf(id), PostDocument.class);
        } catch (Exception e) {
            log.error("ES Delete failed: {}", e.getMessage());
        }
        
        clearCaches(id);
    }
    
    private void clearCaches(Long postId) {
        Set<String> keys = redisTemplate.keys("posts:list:*");
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }
        if (postId != null) {
            redisTemplate.delete("post:detail:" + postId);
        }
        redisTemplate.delete("tags:all");
    }
}