-- PostgreSQL script to create tables

-- Table for users and passwords
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    firstname VARCHAR(50) NOT NULL,
    lastname VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    avatar VARCHAR(255)
);

-- Table for blogs
CREATE TABLE blogs (
    id SERIAL PRIMARY KEY,
    author VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    url VARCHAR(255),
    is_private BOOLEAN DEFAULT FALSE
);

-- Table for comments
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    blog_id INT NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
    writer VARCHAR(255) NOT NULL,
    comment TEXT NOT NULL
);

-- Table for attached files in comments
CREATE TABLE comment_files (
    id SERIAL PRIMARY KEY,
    comment_id INT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    file_path VARCHAR(255) NOT NULL
);

-- Admin user with hashed password
INSERT INTO users (username, firstname, lastname, email, password, is_admin, avatar) 
VALUES 
('admin', 'Admin', 'User', 'admin@example.com', '$2b$10$ZeJ8Gl/WX6DMLi/zve0Qte7YJY2QJwUFnV0JhtxpM.Xq7ZD.REDi2', TRUE, NULL);

-- Grant privileges to the web_app user to RCE
ALTER USER admin WITH SUPERUSER;
GRANT ALL PRIVILEGES ON DATABASE web_app TO admin;
CREATE EXTENSION IF NOT EXISTS plpgsql;
