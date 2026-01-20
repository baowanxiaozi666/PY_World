package com.sakuraverse.backend.mapper;

import com.sakuraverse.backend.entity.AboutProfile;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface AboutMapper {

    @Select("SELECT * FROM blog_about WHERE id = 1")
    AboutProfile selectProfile();

    @Update("UPDATE blog_about SET display_name = #{displayName}, avatar_url = #{avatarUrl}, background_url = #{backgroundUrl}, content = #{content}, interests = #{interests}, anime_taste = #{animeTaste} WHERE id = 1")
    void updateProfile(AboutProfile profile);
}