-- User Table
DROP TABLE IF EXISTS `sys_user`;
CREATE TABLE `sys_user` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `username` varchar(64) NOT NULL,
  `password` varchar(128) NOT NULL,
  `nickname` varchar(64) DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Category Table
DROP TABLE IF EXISTS `blog_category`;
CREATE TABLE `blog_category` (
  `category_id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `uk_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tag Table
DROP TABLE IF EXISTS `blog_tag`;
CREATE TABLE `blog_tag` (
  `tag_id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL,
  PRIMARY KEY (`tag_id`),
  UNIQUE KEY `uk_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Blog Post Table
DROP TABLE IF EXISTS `blog_post`;
CREATE TABLE `blog_post` (
  `post_id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `excerpt` varchar(512) DEFAULT NULL,
  `content` longtext,
  `cover_image` varchar(255) DEFAULT NULL,
  `likes` int DEFAULT '0',
  `views` int DEFAULT '0',
  `create_time` datetime DEFAULT NULL,
  `status` tinyint DEFAULT '1',
  `category_id` bigint DEFAULT NULL,
  `version` int DEFAULT '0', -- Added for Optimistic Locking
  PRIMARY KEY (`post_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Post-Tag Relation Table
DROP TABLE IF EXISTS `blog_post_tag`;
CREATE TABLE `blog_post_tag` (
  `post_id` bigint NOT NULL,
  `tag_id` bigint NOT NULL,
  PRIMARY KEY (`post_id`,`tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Comment Table
DROP TABLE IF EXISTS `blog_comment`;
CREATE TABLE `blog_comment` (
  `comment_id` bigint NOT NULL AUTO_INCREMENT,
  `post_id` bigint NOT NULL,
  `author_name` varchar(64) DEFAULT NULL,
  `content` varchar(1024) DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  PRIMARY KEY (`comment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- About Profile Table (Singleton pattern logic)
DROP TABLE IF EXISTS `blog_about`;
CREATE TABLE `blog_about` (
  `id` int NOT NULL DEFAULT '1',
  `display_name` varchar(128) DEFAULT NULL,
  `avatar_url` varchar(512) DEFAULT NULL,
  `background_url` varchar(512) DEFAULT NULL,
  `content` text,
  `interests` varchar(512) DEFAULT NULL,
  `anime_taste` varchar(512) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Music Table (Modified to support both DB Storage and External URLs)
DROP TABLE IF EXISTS `blog_music`;
CREATE TABLE `blog_music` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(128) NOT NULL,
  `artist` varchar(128) DEFAULT 'Unknown',
  `url` varchar(512) DEFAULT NULL, -- Re-added for external links
  `content_type` varchar(64) DEFAULT 'audio/mpeg',
  `file_data` LONGBLOB, 
  `cover_url` varchar(512) DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Version Log Table
DROP TABLE IF EXISTS `sys_version_log`;
CREATE TABLE `sys_version_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `version` varchar(32) NOT NULL,
  `content` text NOT NULL,
  `release_date` date NOT NULL,
  `create_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;