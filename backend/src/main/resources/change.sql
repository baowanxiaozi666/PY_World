-- 1. 添加帖子最后更新时间字段
ALTER TABLE `blog_post` ADD COLUMN `update_time` datetime DEFAULT NULL AFTER `create_time`;

-- 初始化 update_time 为 create_time
UPDATE `blog_post` SET `update_time` = `create_time` WHERE `update_time` IS NULL;

-- 2. 网站总访问量表
CREATE TABLE IF NOT EXISTS `site_stats` (
  `id` int NOT NULL DEFAULT '1',
  `total_views` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO `site_stats` (`id`, `total_views`) VALUES (1, 0);

-- 3. 地区访问量统计表
CREATE TABLE IF NOT EXISTS `site_region_stats` (
  `region` varchar(64) NOT NULL,
  `views` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`region`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
