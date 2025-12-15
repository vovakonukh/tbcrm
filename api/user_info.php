<?php
/* API для получения информации о текущем пользователе */
require_once 'check_auth.php';

header('Content-Type: application/json');

echo json_encode([
    'success' => true,
    'user' => [
        'id' => getCurrentUserId(),
        'name' => getCurrentUserName(),
        'role' => getCurrentUserRole()
    ]
]);