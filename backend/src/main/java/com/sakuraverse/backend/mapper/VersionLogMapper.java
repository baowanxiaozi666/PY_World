package com.sakuraverse.backend.mapper;

import com.sakuraverse.backend.entity.VersionLog;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface VersionLogMapper {
    List<VersionLog> selectAll();
    void insert(VersionLog log);
    void update(VersionLog log);
    void delete(@Param("id") Long id);
}