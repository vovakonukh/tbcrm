<?php
// logout.php - Выход из системы

require_once __DIR__ . '/../api/config.php'; 
require_once __DIR__ . '/../api/auth.php'; 

/* Создаём подключение к БД */
$conn = new mysqli($host, $username, $password, $dbname);

/* Удаляем токен из БД если пользователь авторизован */
startSession();
$userId = getCurrentUserId();
if ($userId && $conn->connect_error === null) {
    deleteRememberToken($userId, $conn);
}

/* Очищаем cookie */
clearRememberCookie();

/* Завершаем сессию */
logoutUser();

/* Редирект на страницу входа */
header('Location: /login.php?logout=1');
exit;
?>