package com.sakuraverse.backend.entity;

import lombok.Data;
import java.io.Serializable;

@Data
public class User implements Serializable {
    private Long id;
    private String username;
    private String password; // In real app, this should be Bcrypt hashed
    private String nickname;
    private String avatar;
}