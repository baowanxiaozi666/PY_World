package com.sakuraverse.backend.mapper;

import com.sakuraverse.backend.entity.MusicTrack;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface MusicMapper {

    // Selects metadata ONLY (excludes file_data to save memory)
    List<MusicTrack> selectAll();

    // Selects everything INCLUDING file_data for streaming
    MusicTrack selectById(@Param("id") Long id);

    void insert(MusicTrack musicTrack);

    int delete(@Param("id") Long id);
}