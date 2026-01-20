package com.sakuraverse.backend.mapper;

import com.sakuraverse.backend.entity.BlogPost;
import com.sakuraverse.backend.entity.Comment;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface BlogMapper {

    // Updated to support MySQL search and sorting fallback
    List<BlogPost> selectPosts(@Param("tag") String tag, @Param("search") String search, @Param("sort") String sort);

    BlogPost selectPostDetail(@Param("id") Long id);
    
    // Lightweight select for optimistic locking (id, likes, version only)
    BlogPost selectPostSimple(@Param("id") Long id);

    // Optimistic Locking Update: Returns number of affected rows (0 means version changed)
    int compareAndSetLikes(@Param("id") Long id, @Param("newLikes") Integer newLikes, @Param("oldVersion") Integer oldVersion);

    void insertComment(Comment comment);
    
    List<String> selectAllTags();
    
    // --- Write Operations ---
    
    void insertPost(BlogPost post);
    
    void updatePost(BlogPost post);
    
    void deletePost(@Param("id") Long id);
    
    Long getTagIdByName(@Param("name") String name);
    
    void insertTag(@Param("name") String name);
    
    void insertPostTag(@Param("postId") Long postId, @Param("tagId") Long tagId);
    
    void deletePostTags(@Param("postId") Long postId);
    
    void deletePostComments(@Param("postId") Long postId);
    
    Long getCategoryIdByName(@Param("name") String name);
    
    void insertCategory(@Param("name") String name);
}