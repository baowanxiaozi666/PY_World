package com.sakuraverse.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import java.io.Serializable;
import java.util.Date;

@Data
public class MusicTrack implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long id;
    private String title;
    private String artist;
    
    // Virtual URL for frontend consumption (constructed in Controller)
    private String url;
    
    private String coverUrl;
    
    @JsonIgnore // Prevent serialization to JSON in list view
    private byte[] fileData;
    
    private String contentType;
    
    private Date createTime;
}