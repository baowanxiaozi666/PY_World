package com.sakuraverse.backend.controller;

import com.sakuraverse.backend.annotation.LoginRequired;
import com.sakuraverse.backend.common.Result;
import com.sakuraverse.backend.dto.ChatRequest;
import com.sakuraverse.backend.dto.CommentDTO;
import com.sakuraverse.backend.dto.PostDTO;
import com.sakuraverse.backend.entity.BlogPost;
import com.sakuraverse.backend.entity.Comment;
import com.sakuraverse.backend.service.AIService;
import com.sakuraverse.backend.service.BlogService;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class BlogController {

    @Autowired
    private BlogService blogService;

    @Autowired
    private AIService aiService;
    
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
    
    @GetMapping("/tags")
    public Result<List<String>> getAllTags() {
        return Result.success(blogService.getAllTags());
    }

    @GetMapping("/search/cloud")
    public Result<List<Map<String, Object>>> getSearchCloud() {
        return Result.success(blogService.getSearchWordCloud());
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
        
        blogService.addComment(id, comment, clientIP);
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
        
        blogService.addComment(postId, comment, clientIP);
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