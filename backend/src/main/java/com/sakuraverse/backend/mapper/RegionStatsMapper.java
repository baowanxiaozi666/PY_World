package com.sakuraverse.backend.mapper;

import org.apache.ibatis.annotations.*;

import java.util.List;
import java.util.Map;

@Mapper
public interface RegionStatsMapper {

    @Select("SELECT region, views FROM site_region_stats ORDER BY views DESC LIMIT 10")
    List<Map<String, Object>> getTopRegions();

    @Select("SELECT region, views FROM site_region_stats")
    List<Map<String, Object>> getAllRegions();

    @Insert("INSERT INTO site_region_stats (region, views) VALUES (#{region}, 1) " +
            "ON DUPLICATE KEY UPDATE views = views + 1")
    void incrementRegion(@Param("region") String region);

    @Update("INSERT INTO site_region_stats (region, views) VALUES (#{region}, #{views}) " +
            "ON DUPLICATE KEY UPDATE views = #{views}")
    void setRegionViews(@Param("region") String region, @Param("views") long views);

}
