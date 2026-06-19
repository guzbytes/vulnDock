<?php
require_once __DIR__ . '/../controllers/UserController.php';
require_once __DIR__ . '/../helpers/middleware.php';

if ($request === '/api/v1/register' && $method === 'POST') {
    (new UserController())->register();
    exit;
}

if ($request === '/api/v1/login' && $method === 'POST') {
    (new UserController())->login();
    exit;
}

if ($request === '/api/v1/user/me' && $method === 'GET') {
    $user = authenticateUser(); 
    (new UserController())->getMe($user);
    exit;
}
if ($request === '/api/v1/user/update-profile' && $method === 'POST') {
    $user = authenticateUser(); 
    if (!$user) {
        http_response_code(401);
        echo json_encode(['message' => 'No autenticado']);
        exit;
    }

    $profileController = new UserController();
    $profileController->updateProfile($_POST, $_FILES);
    exit;
};