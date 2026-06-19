<?php

require_once __DIR__ . '/../controllers/BlogController.php';
require_once __DIR__ . '/../helpers/middleware.php';

if ($request === '/api/v1/blogs' && $method === 'GET') {
    $user = authenticateUser(false); 
    (new BlogController())->listBlogs($user);
    exit;
}

if (preg_match('#^/api/v1/blog/(.*)$#', $request, $matches) && $method === 'GET') {
    (new BlogController())->getBlogById(['blog_id' => $matches[1]]);
    exit;
}

if ($request === '/api/v1/blog' && $method === 'POST') {
    $user = authenticateUser(false);
    $input = json_decode(file_get_contents('php://input'), true);
    (new BlogController())->createBlog($input, $user);
    exit;
}

if (preg_match('#^/api/v1/blog/(.*)/comments$#', $request, $matches) && $method === 'POST') {
    $user = authenticateUser();
    (new BlogController())->addComment($_POST, $_FILES, ['blog_id' => $matches[1]], $user);
    exit;
}

if (preg_match('#^/api/v1/blog/(.*)/comments$#', $request, $matches) && $method === 'GET') {
    $user = authenticateUser();
    (new BlogController())->getComments(['blog_id' => $matches[1]]);
    exit;
}
