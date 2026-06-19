<?php
$requestUri = $_SERVER['REQUEST_URI'];
$request = parse_url($requestUri, PHP_URL_PATH); 
$method = $_SERVER['REQUEST_METHOD'];

require_once './routes/users.php';
require_once './routes/admin.php';
require_once './routes/blog.php';
require_once './routes/welcome.php';

// Manejo de 404
http_response_code(404);
echo json_encode(["error" => "Ruta no encontrada"]);
