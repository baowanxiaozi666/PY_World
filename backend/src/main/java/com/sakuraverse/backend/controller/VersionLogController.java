package com.sakuraverse.backend.controller;

import com.sakuraverse.backend.common.Result;
import com.sakuraverse.backend.entity.VersionLog;
import com.sakuraverse.backend.service.VersionLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class VersionLogController {

    @Autowired
    private VersionLogService versionLogService;

    // Public: Get all version logs
    @GetMapping("/versions")
    public Result<List<VersionLog>> getVersions() {
        return Result.success(versionLogService.getAllLogs());
    }

    // Admin: Create Log
    @PostMapping("/admin/versions")
    public Result<Void> createVersion(@RequestBody VersionLog log) {
        log.setId(null);
        versionLogService.saveLog(log);
        return Result.success();
    }

    // Admin: Update Log
    @PutMapping("/admin/versions/{id}")
    public Result<Void> updateVersion(@PathVariable Long id, @RequestBody VersionLog log) {
        log.setId(id);
        versionLogService.saveLog(log);
        return Result.success();
    }

    // Admin: Delete Log
    @DeleteMapping("/admin/versions/{id}")
    public Result<Void> deleteVersion(@PathVariable Long id) {
        versionLogService.deleteLog(id);
        return Result.success();
    }
}