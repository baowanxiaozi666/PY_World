package com.sakuraverse.backend.mapper;

import com.sakuraverse.backend.entity.IPUsername;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface IPUsernameMapper {
    IPUsername selectByIP(@Param("ipAddress") String ipAddress);
    void insert(IPUsername ipUsername);
    void update(IPUsername ipUsername);
}
