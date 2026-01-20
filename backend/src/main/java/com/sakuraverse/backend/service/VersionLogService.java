package com.sakuraverse.backend.service;

import com.sakuraverse.backend.entity.VersionLog;
import java.util.List;

public interface VersionLogService {
    List<VersionLog> getAllLogs();
    void saveLog(VersionLog log);
    void deleteLog(Long id);
}