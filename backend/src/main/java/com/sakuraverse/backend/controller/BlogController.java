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
    public Result<Void> addComment(@PathVariable Long id, @RequestBody CommentDTO commentDto) {
        Comment comment = new Comment();
        BeanUtils.copyProperties(commentDto, comment);
        blogService.addComment(id, comment);
        return Result.success();
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