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
import org.springframework.data.elasticsearch.core.IndexOperations;
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
    private com.sakuraverse.backend.service.IPUsernameService ipUsernameService;

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
        List<Map<String, Object>> result = new ArrayList<>();

        try {
            // 方案1：从帖子内容（blog_posts索引）中聚合标签作为词云数据
            // 聚合 tags 字段（标签）作为词云数据
            NativeSearchQueryBuilder queryBuilder = new NativeSearchQueryBuilder()
                    // 添加聚合：Terms聚合，统计 "tags" 字段（Keyword 类型），取前20个
                    .addAggregation(AggregationBuilders.terms(aggName).field("tags").size(20))
                    // 只要聚合结果，不需要文档列表
                    .withPageable(PageRequest.of(0, 1));

            NativeSearchQuery query = queryBuilder.build();

            // 执行搜索（从 PostDocument 索引）
            SearchHits<PostDocument> response = elasticsearchOperations.search(query, PostDocument.class);

            // 解析聚合结果
            if (response.getAggregations() != null) {
                Aggregations aggregations = (Aggregations) response.getAggregations().aggregations();
                Terms terms = aggregations.get(aggName);

                if (terms != null && terms.getBuckets() != null && !terms.getBuckets().isEmpty()) {
                    for (Terms.Bucket bucket : terms.getBuckets()) {
                        Map<String, Object> map = new HashMap<>();
                        map.put("text", bucket.getKeyAsString());
                        map.put("count", bucket.getDocCount());
                        result.add(map);
                    }
                }
            }

            // 如果从帖子标签获取到数据，直接返回
            if (!result.isEmpty()) {
                log.info("Word cloud generated from post tags: {} keywords", result.size());
                return result;
            }

            // 方案2：如果帖子标签为空，尝试从搜索日志获取
            NativeSearchQueryBuilder logQueryBuilder = new NativeSearchQueryBuilder()
                    .addAggregation(AggregationBuilders.terms(aggName).field("keyword").size(20))
                    .withPageable(PageRequest.of(0, 1));

            NativeSearchQuery logQuery = logQueryBuilder.build();
            SearchHits<SearchLogDocument> logResponse = elasticsearchOperations.search(logQuery, SearchLogDocument.class);

            if (logResponse.getAggregations() != null) {
                Aggregations logAggregations = (Aggregations) logResponse.getAggregations().aggregations();
                Terms logTerms = logAggregations.get(aggName);

                if (logTerms != null && logTerms.getBuckets() != null && !logTerms.getBuckets().isEmpty()) {
                    for (Terms.Bucket bucket : logTerms.getBuckets()) {
                        Map<String, Object> map = new HashMap<>();
                        map.put("text", bucket.getKeyAsString());
                        map.put("count", bucket.getDocCount());
                        result.add(map);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to get word cloud from ES: {}", e.getMessage());
            // 如果 ES 连接失败，尝试从数据库获取标签作为词云
            try {
                List<String> tags = blogMapper.selectAllTags();
                if (tags != null && !tags.isEmpty()) {
                    for (int i = 0; i < tags.size() && i < 20; i++) {
                        Map<String, Object> map = new HashMap<>();
                        map.put("text", tags.get(i));
                        map.put("count", (tags.size() - i) * 10L + 5);
                        result.add(map);
                    }
                    log.info("Word cloud generated from database tags: {} keywords", result.size());
                    return result;
                }
            } catch (Exception dbEx) {
                log.error("Failed to get tags from database: {}", dbEx.getMessage());
            }
        }

        // 如果都为空，返回默认数据
        if (result.isEmpty()) {
            log.warn("Word cloud is empty, using default data");
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
        if (cached != null) {
            // Recursively load replies for each comment (supports multi-level nesting)
            if (cached.getComments() != null) {
                cached.getComments().forEach(comment -> {
                    loadRepliesRecursively(comment);
                });
            }
            return cached;
        }

        BlogPost post = blogMapper.selectPostDetail(id);
        if (post != null) {
            // Recursively load replies for each comment (supports multi-level nesting)
            if (post.getComments() != null) {
                post.getComments().forEach(comment -> {
                    loadRepliesRecursively(comment);
                });
            }
            redisTemplate.opsForValue().set(cacheKey, post, 1, TimeUnit.HOURS);
        }
        return post;
    }

    /**
     * Recursively load replies for a comment (supports multi-level nesting)
     */
    private void loadRepliesRecursively(Comment comment) {
        if (comment.getId() == null) {
            return;
        }
        
        List<Comment> replies = blogMapper.selectRepliesByParentId(comment.getId());
        if (replies != null && !replies.isEmpty()) {
            comment.setReplies(replies);
            // Recursively load replies for each reply
            for (Comment reply : replies) {
                loadRepliesRecursively(reply);
            }
        } else {
            comment.setReplies(new ArrayList<>());
        }
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
            // ES connection/parsing issues - log as warning, not error, since this is async and non-critical
            String errorMsg = e.getMessage();
            String errorClass = e.getClass().getSimpleName();
            
            if (errorMsg != null) {
                if (errorMsg.contains("index_not_found_exception") || 
                    errorMsg.contains("Index") && errorMsg.contains("not found")) {
                    // Index doesn't exist yet - this is OK, will be created when post is saved
                    log.debug("ES index not found for post {}, skipping likes sync (index will be created on next post save)", id);
                } else if (errorMsg.contains("Unsupported Content-Type") || 
                    errorMsg.contains("Failed to parse") ||
                    errorMsg.contains("Unable to parse response body")) {
                    log.warn("ES response parsing failed for post {} (ES version may be incompatible): {}", id, 
                            errorMsg.length() > 150 ? errorMsg.substring(0, 150) + "..." : errorMsg);
                } else if (errorMsg.contains("Connection refused") ||
                           errorMsg.contains("NoNodeAvailableException")) {
                    log.warn("ES unavailable, skipping likes sync for post {}: Connection error", id);
                } else {
                    log.warn("ES sync failed for post {}: {}", id, 
                            errorMsg.length() > 150 ? errorMsg.substring(0, 150) + "..." : errorMsg);
                }
            } else {
                log.warn("ES sync failed for post {}: {} (no error message)", id, errorClass);
            }
        }
    }

    @Override
    @Transactional
    public void addComment(Long postId, Comment comment, String clientIP, String username) {
        comment.setPostId(postId);
        // If username is provided (logged in user), use it; otherwise use IP-based username
        if (username != null && !username.isEmpty()) {
            comment.setAuthor(username);
        } else {
            // Get or create username based on IP
            String ipUsername = ipUsernameService.getOrCreateUsername(clientIP);
            comment.setAuthor(ipUsername);
        }
        blogMapper.insertComment(comment);
        redisTemplate.delete("post:detail:" + postId);
        clearCaches(null);
    }

    @Override
    public void deleteComment(Long commentId) {
        if (commentId == null) {
            throw new IllegalArgumentException("Comment ID cannot be null");
        }
        int deletedRows = blogMapper.deleteComment(commentId);
        if (deletedRows == 0) {
            throw new IllegalArgumentException("Comment with ID " + commentId + " does not exist");
        }
        // Clear all post caches since we don't know which post this comment belonged to
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
            // ES connection/parsing issues - log as warning, not error, since ES is optional
            String errorMsg = e.getMessage();
            if (errorMsg != null) {
                if (errorMsg.contains("index_not_found_exception") || 
                    (errorMsg.contains("Index") && errorMsg.contains("not found"))) {
                    // Index doesn't exist - try to create it and save again
                    try {
                        IndexOperations indexOps = elasticsearchOperations.indexOps(PostDocument.class);
                        if (!indexOps.exists()) {
                            indexOps.create();
                            log.info("Created ES index 'blog_posts'");
                        }
                        // Retry saving after ensuring index exists
                        PostDocument retryDoc = new PostDocument();
                        retryDoc.setId(post.getId());
                        retryDoc.setTitle(post.getTitle());
                        retryDoc.setExcerpt(post.getExcerpt());
                        retryDoc.setContent(post.getContent());
                        retryDoc.setCategory(post.getCategory());
                        retryDoc.setTags(post.getTags().toArray(new String[0]));
                        retryDoc.setLikes(post.getLikes() == null ? 0 : post.getLikes());
                        retryDoc.setCreateTime(post.getDate() == null ? new Date() : post.getDate());
                        elasticsearchOperations.save(retryDoc);
                        log.debug("Successfully saved post {} to ES after creating index", post.getId());
                    } catch (Exception retryEx) {
                        log.warn("ES index creation/save failed for post {}: {}", post.getId(), 
                                retryEx.getMessage() != null && retryEx.getMessage().length() > 150 ? 
                                retryEx.getMessage().substring(0, 150) + "..." : 
                                (retryEx.getMessage() != null ? retryEx.getMessage() : retryEx.getClass().getSimpleName()));
                    }
                } else if (errorMsg.contains("Unsupported Content-Type") || 
                    errorMsg.contains("Failed to parse") ||
                    errorMsg.contains("Unable to parse response body")) {
                    log.warn("ES response parsing failed (ES version may be incompatible): {}", 
                            errorMsg.length() > 150 ? errorMsg.substring(0, 150) + "..." : errorMsg);
                } else if (errorMsg.contains("Connection refused")) {
                    log.warn("ES unavailable, skipping post sync: ES service not running or misconfigured");
                } else {
                    log.warn("ES Update failed: {}", errorMsg.length() > 150 ? errorMsg.substring(0, 150) + "..." : errorMsg);
                }
            } else {
                log.warn("ES Update failed: {} (no error message)", e.getClass().getSimpleName());
            }
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
            // ES connection/parsing issues - log as warning, not error
            String errorMsg = e.getMessage();
            if (errorMsg != null && (errorMsg.contains("Unable to parse response body") ||
                                     errorMsg.contains("Failed to parse"))) {
                log.warn("ES response parsing failed, skipping delete sync: {}", 
                        errorMsg.length() > 100 ? errorMsg.substring(0, 100) + "..." : errorMsg);
            } else {
                log.warn("ES unavailable, skipping delete sync: {}", errorMsg != null ? errorMsg : e.getClass().getSimpleName());
            }
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
    
    @Override
    @Transactional
    public void deleteTag(String name) {
        // Get all posts with this tag
        List<BlogPost> postsWithTag = blogMapper.selectPosts(name, null, "latest");
        
        // Remove the tag from each post
        for (BlogPost post : postsWithTag) {
            List<String> tags = post.getTags();
            if (tags != null && tags.contains(name)) {
                tags.remove(name);
                // Update the post without the deleted tag
                blogMapper.deletePostTags(post.getId());
                if (!tags.isEmpty()) {
                    for (String tagName : tags) {
                        Long tagId = blogMapper.getTagIdByName(tagName);
                        if (tagId == null) {
                            blogMapper.insertTag(tagName);
                            tagId = blogMapper.getTagIdByName(tagName);
                        }
                        blogMapper.insertPostTag(post.getId(), tagId);
                    }
                }
                
                // Update post in Elasticsearch
                try {
                    PostDocument doc = elasticsearchOperations.get(String.valueOf(post.getId()), PostDocument.class);
                    if (doc != null) {
                        doc.setTags(tags.toArray(new String[0]));
                        elasticsearchOperations.save(doc);
                    }
                } catch (Exception e) {
                    // ES connection/parsing issues - log as warning, not error
                    String errorMsg = e.getMessage();
                    if (errorMsg != null && (errorMsg.contains("Unable to parse response body") ||
                                             errorMsg.contains("Failed to parse"))) {
                        log.warn("ES response parsing failed, skipping tag update sync: {}", 
                                errorMsg.length() > 100 ? errorMsg.substring(0, 100) + "..." : errorMsg);
                    } else {
                        log.warn("ES unavailable, skipping tag update sync: {}", 
                                errorMsg != null ? errorMsg : e.getClass().getSimpleName());
                    }
                }
            }
        }
        
        // Delete the tag itself
        blogMapper.deleteTagByName(name);
        
        // Clear caches
        clearCaches(null);
    }
}