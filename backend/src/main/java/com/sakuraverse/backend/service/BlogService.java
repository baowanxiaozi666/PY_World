package com.sakuraverse.backend.service;

import com.sakuraverse.backend.entity.BlogPost;
import com.sakuraverse.backend.entity.Comment;

import java.util.List;
import java.util.Map;

public interface BlogService {
    List<BlogPost> getPosts(String tag, String search, String sort);
    List<Map<String, Object>> getSearchWordCloud();
    BlogPost getPostDetail(Long id);
    void likePost(Long id);
    void unlikePost(Long id); // Added
    void addComment(Long postId, Comment comment, String clientIP);
    
    void deleteComment(Long commentId);
    List<String> getAllTags();
    void savePost(BlogPost post);
    void deletePost(Long id);
    void deleteTag(String name);
}