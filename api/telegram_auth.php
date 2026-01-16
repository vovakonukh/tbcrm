<?php
/* API для авторизации через Telegram */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

/* Проверяем подпись данных от Telegram */
function checkTelegramAuth($authData) {
    $checkHash = $authData['hash'];
    unset($authData['hash']);
    
    $dataCheckArr = [];
    foreach ($authData as $key => $value) {
        $dataCheckArr[] = $key . '=' . $value;
    }
    sort($dataCheckArr);
    $dataCheckString = implode("\n", $dataCheckArr);
    
    $secretKey = hash('sha256', TELEGRAM_BOT_TOKEN, true);
    $hash = hash_hmac('sha256', $dataCheckString, $secretKey);
    
    if (strcmp($hash, $checkHash) !== 0) {
        return false;
    }
    
    /* Проверяем, что данные не старше 5 минут */
    if ((time() - $authData['auth_date']) > 300) {
        return false;
    }
    
    return true;
}

/* Получаем данные */
$authData = [];
$requiredFields = ['id', 'auth_date', 'hash'];
$optionalFields = ['first_name', 'last_name', 'username', 'photo_url'];

foreach ($requiredFields as $field) {
    if (!isset($_GET[$field])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Отсутствует обязательное поле: ' . $field]);
        exit;
    }
    $authData[$field] = $_GET[$field];
}

foreach ($optionalFields as $field) {
    if (isset($_GET[$field])) {
        $authData[$field] = $_GET[$field];
    }
}

/* Проверяем подпись */
if (!checkTelegramAuth($authData)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Неверная подпись данных']);
    exit;
}

$debugLog = fopen(__DIR__ . '/telegram_debug.log', 'a');
fwrite($debugLog, date('Y-m-d H:i:s') . " - Auth attempt\n");
fwrite($debugLog, "Telegram ID: " . $authData['id'] . "\n");

/* Ищем пользователя по telegram_id */
$telegramId = (int)$authData['id'];

try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    
    fwrite($debugLog, "DB connected OK\n");
    
    $stmt = $pdo->prepare("SELECT id, username, full_name, role, role_id, is_active FROM users WHERE telegram_id = ?");
    $stmt->execute([$telegramId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    fwrite($debugLog, "User found: " . ($user ? json_encode($user) : 'NULL') . "\n");
    fclose($debugLog);
    
    if (!$user) {
        /* Пользователь не найден — редирект на логин с ошибкой */
        header('Location: /login.php?error=telegram_not_linked');
        exit;
    }
    
    if (!$user['is_active']) {
        header('Location: /login.php?error=user_inactive');
        exit;
    }
    
    /* Создаём сессию */
    session_start();
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['full_name'] = $user['full_name'];
    $_SESSION['role'] = $user['role'];
    $_SESSION['role_id'] = $user['role_id'];
    
    /* Обновляем last_login */
    $stmt = $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
    $stmt->execute([$user['id']]);
    
    /* Логируем успешный вход */
    $stmt = $pdo->prepare("INSERT INTO login_logs (user_id, username, ip_address, user_agent, success) VALUES (?, ?, ?, ?, 1)");
    $stmt->execute([
        $user['id'],
        $user['username'],
        $_SERVER['REMOTE_ADDR'] ?? '',
        $_SERVER['HTTP_USER_AGENT'] ?? ''
    ]);
    
    /* Редирект на главную */
    header('Location: /contracts.php');
    exit;
    
} catch (PDOException $e) {
    error_log("Telegram auth error: " . $e->getMessage());
    header('Location: /login.php?error=server_error');
    exit;
}