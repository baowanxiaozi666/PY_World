package com.sakuraverse.backend.service.impl;

import com.sakuraverse.backend.entity.VersionLog;
import com.sakuraverse.backend.mapper.VersionLogMapper;
import com.sakuraverse.backend.service.VersionLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class VersionLogServiceImpl implements VersionLogService {

    @Autowired
    private VersionLogMapper versionLogMapper;

    @Override
    public List<VersionLog> getAllLogs() {
        return versionLogMapper.selectAll();
    }

    @Override
    public void saveLog(VersionLog log) {
        if (log.getId() == null) {
            versionLogMapper.insert(log);
        } else {
            versionLogMapper.update(log);
        }
    }

    @Override
    public void deleteLog(Long id) {
        versionLogMapper.delete(id);
    }
}