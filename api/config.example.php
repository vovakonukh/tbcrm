<?php
// config.php
// Этот файл отвечает только за подключение к базе данных.

// Данные для доступа к БД
$host = '';
$dbname = '';
$username = '';
$password = '';

try {
    // Создаем новое подключение PDO
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    
    // Настраиваем режим обработки ошибок: выбрасывать исключения при ошибках SQL
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
} catch(PDOException $e) {
    // Если подключиться не удалось, выводим ошибку в формате JSON и останавливаем скрипт
    // Устанавливаем заголовок, так как api.php может еще не успеть это сделать
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(array("success" => false, "error" => "Connection failed: " . $e->getMessage()));
    exit;
}
?>