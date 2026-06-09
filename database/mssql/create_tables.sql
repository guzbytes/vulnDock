-- Use the web_app database (you must create it before)
USE web_app;
GO

EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;
GO

EXEC sp_configure 'xp_cmdshell', 1;
RECONFIGURE;
GO

-- Users table
CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    firstname VARCHAR(50) NOT NULL,
    lastname VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    is_admin BIT DEFAULT 0,
    avatar VARCHAR(255) NULL
);
GO

-- Blogs table
CREATE TABLE blogs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    author VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    url VARCHAR(255) NULL,
    is_private BIT DEFAULT 0
);
GO

-- Comments table
CREATE TABLE comments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    blog_id INT NOT NULL,
    writer VARCHAR(255) NOT NULL,
    comment TEXT NOT NULL,
    CONSTRAINT FK_comments_blogs FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE
);
GO

-- Table for files attached to comments
CREATE TABLE comment_files (
    id INT IDENTITY(1,1) PRIMARY KEY,
    comment_id INT NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    CONSTRAINT FK_comment_files_comments FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
);
GO

-- Insert admin user
INSERT INTO users (username, firstname, lastname, email, password, is_admin, avatar) 
VALUES ('admin', 'Admin', 'User', 'admin@example.com', '$2b$10$ZeJ8Gl/WX6DMLi/zve0Qte7YJY2QJwUFnV0JhtxpM.Xq7ZD.REDi2', 1, NULL);
GO
