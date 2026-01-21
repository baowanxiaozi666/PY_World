package com.sakuraverse.backend.mapper;

import com.sakuraverse.backend.entity.AboutProfile;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface AboutMapper {

    @Select("SELECT * FROM blog_about WHERE id = 1")
    AboutProfile selectProfile();

    @Update("UPDATE blog_about SET display_name = #{displayName}, avatar_url = #{avatarUrl}, background_url = #{backgroundUrl}, content = #{content}, interests = #{interests}, anime_taste = #{animeTaste} WHERE id = 1")
    int updateProfile(AboutProfile profile);
    
    @Insert("INSERT INTO blog_about (id, display_name, avatar_url, background_url, content, interests, anime_taste) VALUES (1, #{displayName}, #{avatarUrl}, #{backgroundUrl}, #{content}, #{interests}, #{animeTaste}) ON DUPLICATE KEY UPDATE display_name = #{displayName}, avatar_url = #{avatarUrl}, background_url = #{backgroundUrl}, content = #{content}, interests = #{interests}, anime_taste = #{animeTaste}")
    void insertProfile(AboutProfile profile);
}