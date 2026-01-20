package com.sakuraverse.backend.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import java.io.Serializable;
import java.util.Date;

@Data
public class VersionLog implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long id;
    private String version; // e.g., v1.0.1
    private String content; // Description of changes
    
    @JsonFormat(pattern = "yyyy-MM-dd", timezone = "Asia/Shanghai")
    private Date releaseDate;
    
    private Date createTime;
}