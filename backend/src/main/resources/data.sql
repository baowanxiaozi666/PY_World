-- Default Admin User
-- Username: admin
-- Password: password
INSERT INTO `sys_user` (`username`, `password`, `nickname`, `avatar`) 
VALUES ('baowanxiaozi', '13102690818Py', 'PangYan Admin', 'https://picsum.photos/200');

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
('React'), 
('Java'), 
('Spring Boot'), 
('Slice of Life'),
('Japan');

-- Initial About Profile Data
INSERT INTO `blog_about` (`id`, `display_name`, `avatar_url`, `content`, `interests`, `anime_taste`) 
VALUES (1, 'The Developer', 'https://picsum.photos/400/400?random=10', 
'I''m a frontend engineer who loves building beautiful interfaces and exploring the world of AI. When I''m not coding, you can find me watching seasonal anime, playing JRPGs, or wandering around Akihabara looking for retro tech.', 
'React, TypeScript, AI, UI Design', 
'Slice of Life, Sci-Fi, Psychological');

-- Initial Music Data
INSERT INTO `blog_music` (`title`, `artist`, `url`, `cover_url`, `create_time`) VALUES
('Sakura Beats', 'Lo-fi Girl', 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3', 'https://picsum.photos/200?random=100', NOW()),
('Night Coding', 'Synthwave Boy', 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3', 'https://picsum.photos/200?random=101', NOW());