package com.sakuraverse.backend.controller;

import com.sakuraverse.backend.annotation.LoginRequired;
import com.sakuraverse.backend.common.Result;
import com.sakuraverse.backend.dto.ChatRequest;
import com.sakuraverse.backend.dto.CommentDTO;
import com.sakuraverse.backend.dto.PostDTO;
import com.sakuraverse.backend.entity.BlogPost;
import com.sakuraverse.backend.entity.Comment;
import com.sakuraverse.backend.service.AIService;
import com.sakuraverse.backend.service.AuthService;
import com.sakuraverse.backend.service.BlogService;
import com.sakuraverse.backend.mapper.RegionStatsMapper;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Set;
import java.util.ArrayList;

@RestController
@RequestMapping("/api")
public class BlogController {

    @Autowired
    private BlogService blogService;

    @Autowired
    private AIService aiService;
    
    @Autowired
    private AuthService authService;

    @Autowired
    private RegionStatsMapper regionStatsMapper;

    @Autowired
    private org.springframework.data.redis.core.RedisTemplate<String, Object> redisTemplate;
    
    // ==========================================
    // Public Endpoints (Business Logic)
    // No interception configured for these paths
    // ==========================================

    @GetMapping("/posts")
    public Result<List<BlogPost>> getPosts(
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "latest") String sort) {
        return Result.success(blogService.getPosts(tag, search, sort));
    }

    @GetMapping("/posts/{id}")
    public Result<BlogPost> getPostDetail(@PathVariable Long id) {
        return Result.success(blogService.getPostDetail(id));
    }

    @PostMapping("/posts/{id}/view")
    public Result<Void> recordView(@PathVariable Long id) {
        blogService.recordView(id);
        return Result.success();
    }

    @GetMapping("/stats/regions")
    public Result<java.util.List<java.util.Map<String, Object>>> getRegionStats() {
        // Read from Redis for real-time data
        Set<String> keys = redisTemplate.keys("region:views:*");
        java.util.List<java.util.Map<String, Object>> result = new java.util.ArrayList<>();
        if (keys != null) {
            for (String key : keys) {
                Object val = redisTemplate.opsForValue().get(key);
                if (val != null) {
                    java.util.Map<String, Object> row = new HashMap<>();
                    row.put("region", key.replace("region:views:", ""));
                    row.put("views", Long.parseLong(val.toString()));
                    result.add(row);
                }
            }
        }
        result.sort((a, b) -> Long.compare((Long) b.get("views"), (Long) a.get("views")));
        return Result.success(result.size() > 10 ? result.subList(0, 10) : result);
    }

    @PostMapping("/stats/visit")
    public Result<Void> recordVisit(HttpServletRequest request) {
        String ip = getClientIP(request);
        // Deduplicate: same IP only counts once per minute
        String dedupKey = "visit:dedup:" + ip;
        Boolean isNew = redisTemplate.opsForValue().setIfAbsent(dedupKey, 1, 1, java.util.concurrent.TimeUnit.MINUTES);
        if (Boolean.TRUE.equals(isNew)) {
            final String finalIp = ip;
            new Thread(() -> {
                String region = isLocalhost(finalIp) ? "本地" : resolveRegion(finalIp);
                redisTemplate.opsForValue().increment("region:views:" + region);
            }).start();
        }
        return Result.success();
    }

    private String resolveRegion(String ip) {
        try {
            org.springframework.web.client.RestTemplate rt = new org.springframework.web.client.RestTemplate();
            java.util.Map<String, Object> ipData = rt.getForObject(
                "http://ip-api.com/json/" + ip + "?lang=zh-CN&fields=status,regionName,country", java.util.Map.class);
            if (ipData != null && "success".equals(ipData.get("status"))) {
                String r = (String) ipData.get("regionName");
                return (r != null && !r.isEmpty()) ? r : (String) ipData.get("country");
            }
        } catch (Exception ignored) {}
        return "未知";
    }
    
    @GetMapping("/tags")
    public Result<List<String>> getAllTags() {
        return Result.success(blogService.getAllTags());
    }

    @GetMapping("/search/cloud")
    public Result<List<Map<String, Object>>> getSearchCloud() {
        return Result.success(blogService.getSearchWordCloud());
    }

    @GetMapping("/stats")
    public Result<Map<String, Object>> getSiteStats() {
        Map<String, Object> stats = new HashMap<>();
        Object redisViews = redisTemplate.opsForValue().get("site:views:total");
        long total = redisViews != null ? Long.parseLong(redisViews.toString()) : blogService.getSiteViews();
        stats.put("totalViews", total);
        return Result.success(stats);
    }

    // Like, Comment, Chat are public actions
    @PostMapping("/posts/{id}/like")
    public Result<Void> likePost(@PathVariable Long id) {
        blogService.likePost(id);
        return Result.success();
    }

    @PostMapping("/posts/{id}/unlike")
    public Result<Void> unlikePost(@PathVariable Long id) {
        blogService.unlikePost(id);
        return Result.success();
    }

    @PostMapping("/posts/{id}/comments")
    public Result<Void> addComment(@PathVariable Long id, @RequestBody CommentDTO commentDto, HttpServletRequest request) {
        Comment comment = new Comment();
        BeanUtils.copyProperties(commentDto, comment);
        
        // Get client IP address
        String clientIP = getClientIP(request);
        
        // Check if user is logged in
        String username = getUsernameFromRequest(request);
        
        blogService.addComment(id, comment, clientIP, username);
        return Result.success();
    }

    @PostMapping("/posts/{postId}/comments/{parentId}/reply")
    public Result<Void> addReply(@PathVariable Long postId, @PathVariable Long parentId, 
                                   @RequestBody CommentDTO commentDto, HttpServletRequest request) {
        Comment comment = new Comment();
        BeanUtils.copyProperties(commentDto, comment);
        comment.setParentId(parentId);
        
        // Get client IP address
        String clientIP = getClientIP(request);
        
        // Check if user is logged in - if logged in, use "The Developer" as username
        String username = getUsernameFromRequest(request);
        
        blogService.addComment(postId, comment, clientIP, username);
        return Result.success();
    }

    @DeleteMapping("/posts/{postId}/comments/{commentId}")
    public Result<Void> deleteComment(@PathVariable Long postId, @PathVariable Long commentId) {
        try {
            blogService.deleteComment(commentId);
            return Result.success();
        } catch (IllegalArgumentException e) {
            return Result.error(404, e.getMessage());
        } catch (Exception e) {
            return Result.error(500, "Failed to delete comment: " + e.getMessage());
        }
    }

    private String getClientIP(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        // Handle multiple IPs (X-Forwarded-For can contain multiple IPs)
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip != null ? ip : "unknown";
    }

    private boolean isLocalhost(String ip) {
        return ip == null || "127.0.0.1".equals(ip) || "0:0:0:0:0:0:0:1".equals(ip) || "::1".equals(ip);
    }

    /**
     * Get username from request - if user is logged in, return "The Developer", otherwise return null
     * @param request HTTP request
     * @return "The Developer" if logged in, null otherwise
     */
    private String getUsernameFromRequest(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            // Validate token - if valid, user is logged in
            if (authService.validateToken(token) != null) {
                return "The Developer";
            }
        }
        return null; // Not logged in, will use IP-based username
    }
    
    @PostMapping("/chat")
    public Result<String> chatWithMascot(@RequestBody ChatRequest request) {
        String response = aiService.chat(request.getMessage(), request.getHistory());
        return Result.success(response);
    }
    
    // ==========================================
    // Admin Endpoints (Management Logic)
    // Intercepted by WebConfig path pattern "/api/admin/**"
    // ==========================================
    
    @PostMapping("/admin/posts")
    public Result<Void> createPost(@RequestBody PostDTO postDto) {
        BlogPost post = new BlogPost();
        BeanUtils.copyProperties(postDto, post);
        post.setId(null); 
        blogService.savePost(post);
        return Result.success();
    }
    
    @PutMapping("/admin/posts/{id}")
    public Result<Void> updatePost(
            @PathVariable Long id,
            @RequestBody PostDTO postDto) {
        BlogPost post = new BlogPost();
        BeanUtils.copyProperties(postDto, post);
        post.setId(id);
        blogService.savePost(post);
        return Result.success();
    }
    
    @DeleteMapping("/admin/posts/{id}")
    public Result<Void> deletePost(@PathVariable Long id) {
        blogService.deletePost(id);
        return Result.success();
    }
    
    @DeleteMapping("/admin/tags/{name}")
    @LoginRequired
    public Result<Void> deleteTag(@PathVariable String name) {
        blogService.deleteTag(name);
        return Result.success();
    }
}