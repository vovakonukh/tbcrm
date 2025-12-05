<?php
// check_auth.php - Middleware для проверки авторизации
// Подключается в начале каждой защищенной страницы

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/config.php';

// Проверяем авторизацию
requireAuth();

// Опционально: проверяем время жизни сессии (7 дней = 604800 секунд)
$sessionLifetime = 604800; // 7 дней
if (isset($_SESSION['login_time'])) {
    if (time() - $_SESSION['login_time'] > $sessionLifetime) {
        logoutUser();
        header('Location: /login.php?session_expired=1');
        exit;
    }
}
?>