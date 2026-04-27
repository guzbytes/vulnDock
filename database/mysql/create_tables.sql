-- SQL script to create tables
USE web_app;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    firstname VARCHAR(50) NOT NULL,
    lastname VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_admin TINYINT(1) DEFAULT 0,
    avatar VARCHAR(255) DEFAULT NULL
);

CREATE TABLE blogs (
    id INT AUTO_INCREMENT PRIMARY KEY,        
    author VARCHAR(100) NOT NULL,             
    title VARCHAR(255) NOT NULL,              
    content TEXT NOT NULL,                     
    url VARCHAR(255) DEFAULT NULL,
    is_private TINYINT(1) DEFAULT 0       
);

CREATE TABLE comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    blog_id INT NOT NULL,
    writer VARCHAR(255) NOT NULL,
    comment TEXT NOT NULL,
    FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE
);

CREATE TABLE comment_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    comment_id INT NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- User admin password admin
INSERT INTO users (username, firstname, lastname, email, password, is_admin, avatar) 
VALUES 
('admin', 'Admin', 'User', 'admin@example.com', '$2b$10$ZeJ8Gl/WX6DMLi/zve0Qte7YJY2QJwUFnV0JhtxpM.Xq7ZD.REDi2', 1, NULL);

-- Grant privileges to the app_user
GRANT ALL PRIVILEGES ON *.* TO 'app_user'@'%' WITH GRANT OPTION;
GRANT FILE ON *.* TO 'app_user'@'%';
FLUSH PRIVILEGES;