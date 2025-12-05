<?php
// auth.php - Функции для работы с авторизацией

require_once 'config.php';

/**
 * Начинает сессию если она ещё не начата
 */
function startSession() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
}

/**
 * Проверяет авторизацию пользователя
 * @return bool
 */
function isLoggedIn() {
    startSession();
    return isset($_SESSION['user_id']) && isset($_SESSION['user_logged_in']);
}

/**
 * Получает ID текущего пользователя
 * @return int|null
 */
function getCurrentUserId() {
    startSession();
    return $_SESSION['user_id'] ?? null;
}

/**
 * Получает роль текущего пользователя
 * @return string|null
 */
function getCurrentUserRole() {
    startSession();
    return $_SESSION['user_role'] ?? null;
}

/**
 * Получает имя текущего пользователя
 * @return string|null
 */
function getCurrentUserName() {
    startSession();
    return $_SESSION['user_name'] ?? null;
}

/**
 * Авторизует пользователя по логину и паролю
 * @param string $username
 * @param string $password
 * @param mysqli $conn
 * @return array ['success' => bool, 'error' => string, 'user' => array]
 */
function loginUser($username, $password, $conn) {
    // Очистка входных данных
    $username = trim($username);
    
    if (empty($username) || empty($password)) {
        return [
            'success' => false,
            'error' => 'Введите логин и пароль'
        ];
    }
    
    // Подготовленный запрос для защиты от SQL инъекций
    $stmt = $conn->prepare("
        SELECT id, username, password, full_name, email, role, is_active 
        FROM users 
        WHERE username = ? 
        LIMIT 1
    ");
    
    if (!$stmt) {
        return [
            'success' => false,
            'error' => 'Ошибка базы данных'
        ];
    }
    
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        // Пользователь не найден
        logLoginAttempt($conn, null, $username, false);
        return [
            'success' => false,
            'error' => 'Неверный логин или пароль'
        ];
    }
    
    $user = $result->fetch_assoc();
    $stmt->close();
    
    // Проверка активности пользователя
    if ($user['is_active'] != 1) {
        logLoginAttempt($conn, $user['id'], $username, false);
        return [
            'success' => false,
            'error' => 'Ваш аккаунт заблокирован'
        ];
    }
    
    // Проверка пароля
    if (!password_verify($password, $user['password'])) {
        logLoginAttempt($conn, $user['id'], $username, false);
        return [
            'success' => false,
            'error' => 'Неверный логин или пароль'
        ];
    }
    
    // Успешная авторизация - создаём сессию
    startSession();
    
    // Регенерируем ID сессии для безопасности
    session_regenerate_id(true);
    
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['user_name'] = $user['full_name'];
    $_SESSION['user_role'] = $user['role'];
    $_SESSION['user_logged_in'] = true;
    $_SESSION['login_time'] = time();
    
    // Обновляем last_login в БД
    $stmt = $conn->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
    $stmt->bind_param("i", $user['id']);
    $stmt->execute();
    $stmt->close();
    
    // Логируем успешный вход
    logLoginAttempt($conn, $user['id'], $username, true);
    
    return [
        'success' => true,
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'full_name' => $user['full_name'],
            'role' => $user['role']
        ]
    ];
}

/**
 * Выход пользователя из системы
 */
function logoutUser() {
    startSession();
    
    // Уничтожаем все данные сессии
    $_SESSION = array();
    
    // Удаляем cookie сессии
    if (isset($_COOKIE[session_name()])) {
        setcookie(session_name(), '', time() - 3600, '/');
    }
    
    // Уничтожаем сессию
    session_destroy();
}

/**
 * Логирование попыток входа (опционально)
 * @param mysqli $conn
 * @param int|null $userId
 * @param string $username
 * @param bool $success
 */
function logLoginAttempt($conn, $userId, $username, $success) {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
    
    $stmt = $conn->prepare("
        INSERT INTO login_logs (user_id, username, ip_address, user_agent, success) 
        VALUES (?, ?, ?, ?, ?)
    ");
    
    if ($stmt) {
        $stmt->bind_param("isssi", $userId, $username, $ip, $userAgent, $success);
        $stmt->execute();
        $stmt->close();
    }
}

/**
 * Проверяет права доступа по роли
 * @param array $allowedRoles
 * @return bool
 */
function hasRole($allowedRoles) {
    if (!is_array($allowedRoles)) {
        $allowedRoles = [$allowedRoles];
    }
    
    $userRole = getCurrentUserRole();
    return in_array($userRole, $allowedRoles);
}

/**
 * Требует авторизации - редирект на login.php если не авторизован
 */
function requireAuth() {
    if (!isLoggedIn()) {
        header('Location: /login.php');
        exit;
    }
}

/**
 * Требует определенную роль - редирект на index.html если нет прав
 * @param array|string $allowedRoles
 */
function requireRole($allowedRoles) {
    requireAuth();
    
    if (!hasRole($allowedRoles)) {
        header('Location: /frontend/index.html?error=access_denied');
        exit;
    }
}
?>