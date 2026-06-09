-- Use the web_app database (you must create it before)
USE web_app;
GO

EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;
GO

EXEC sp_configure 'xp_cmdshell', 1;
RECONFIGURE;
GO

-- Tickets table
CREATE TABLE tickets (
    id INT IDENTITY(1,1) PRIMARY KEY,
    author VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL
);
GO

-- Comments table
CREATE TABLE comments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    blog_id INT NOT NULL,
    writer VARCHAR(255) NOT NULL,
    comment TEXT NOT NULL,
    CONSTRAINT FK_comments_tickets FOREIGN KEY (blog_id) REFERENCES tickets(id) ON DELETE CASCADE
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
