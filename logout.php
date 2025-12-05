<?php
// logout.php - Выход из системы

require_once 'api/auth.php';

logoutUser();

// Редирект на страницу входа с сообщением
header('Location: /login.php?logout=1');
exit;
?>