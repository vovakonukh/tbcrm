<?php
// check_auth.php - Middleware для проверки авторизации
// Подключается в начале каждой защищенной страницы

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/config.php';

/* Создаём подключение для проверки токена */
$conn = new mysqli($host, $username, $password, $dbname);
$conn->set_charset("utf8mb4");

startSession();

/* Если сессии нет - пробуем авторизоваться через remember token */
if (!isLoggedIn() && $conn->connect_error === null) {
    loginFromRememberToken($conn);
}

/* Проверяем авторизацию */
requireAuth();
?>