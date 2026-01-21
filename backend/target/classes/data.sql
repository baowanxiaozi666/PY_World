-- Default Admin User
-- Username: admin
-- Password: password
INSERT INTO `sys_user` (`username`, `password`, `nickname`, `avatar`) 
VALUES ('baowanxiaozi', '13102690818Py', 'PangYan Admin', 'https://tse3-mm.cn.bing.net/th/id/OIP-C.QZqdiF42BGMWI1eNlp_HEgHaHa?w=218&h=218&c=7&r=0&o=7&dpr=1.1&pid=1.7&rm=3');

-- Initial Categories
INSERT INTO `blog_category` (`name`) VALUES 
('Anime'), 
('Tech'), 
('Life'),
('Travel'),
('Music'),
('Design');

-- Initial Tags
INSERT INTO `blog_tag` (`name`) VALUES
('Java'), 
('Spring Boot'), 
('Slice of Life'),
('Japan');

-- Initial About Profile Data
INSERT INTO `blog_about` (`id`, `display_name`, `avatar_url`, `content`, `interests`, `anime_taste`) 
VALUES (1, 'The Developer', 'https://tse3-mm.cn.bing.net/th/id/OIP-C.QZqdiF42BGMWI1eNlp_HEgHaHa?w=218&h=218&c=7&r=0&o=7&dpr=1.1&pid=1.7&rm=3',
'这里是一小部分的我',
'深度学习，后端，Python，GO，JAVA，SpringBoot，Redis，Kafka，Mysql，SpringCLoud，RabbitMQ，JVM','动漫：火影忍者，鬼灭之刃，无职转生 电影：大鱼，本杰明巴顿奇事，飞屋环游记，怦然心动，罗马假日，星际穿越，禁闭岛，蝴蝶效应，阿甘正传，沉默的羔羊，肖申克的救赎，美丽心灵，美丽人生，教父，哈利波特系列，死亡诗社，少年派的奇幻漂流，猫鼠游戏，让子弹飞，触不可及，无间道，盗梦空间，霸王别姬');

# -- Initial Music Data
# INSERT INTO `blog_music` (`title`, `artist`, `url`, `content_type`, `file_data`, `cover_url`, `create_time`) VALUES
# ('One Last Kiss', '宇多田光 (宇多田ヒカル)', NULL, 'audio/mpeg', NULL, 'https://tse4-mm.cn.bing.net/th/id/OIP-C.NTyowpYfXS7MAydlsarHcQAAAA?w=186&h=186&c=7&r=0&o=7&dpr=1.1&pid=1.7&rm=3', '2026-01-21 19:29:33')
#
# select file_data from blog_music where id=1;