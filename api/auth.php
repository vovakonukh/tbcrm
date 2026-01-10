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
 * Получает ID роли текущего пользователя
 * @return int|null
 */
function getCurrentUserRoleId() {
    startSession();
    return $_SESSION['user_role_id'] ?? null;
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
    $username = trim($username);
    
    if (empty($username) || empty($password)) {
        return [
            'success' => false,
            'error' => 'Введите логин и пароль'
        ];
    }
    
    /* Запрос с JOIN на таблицу roles */
    $stmt = $conn->prepare("
        SELECT u.id, u.username, u.password, u.full_name, u.email, u.role_id, u.is_active,
               r.code as role_code, r.name as role_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.username = ?
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
        logLoginAttempt($conn, null, $username, false);
        return [
            'success' => false,
            'error' => 'Неверный логин или пароль'
        ];
    }
    
    $user = $result->fetch_assoc();
    $stmt->close();
    
    if ($user['is_active'] != 1) {
        logLoginAttempt($conn, $user['id'], $username, false);
        return [
            'success' => false,
            'error' => 'Ваш аккаунт заблокирован'
        ];
    }
    
    if (!password_verify($password, $user['password'])) {
        logLoginAttempt($conn, $user['id'], $username, false);
        return [
            'success' => false,
            'error' => 'Неверный логин или пароль'
        ];
    }
    
    startSession();
    session_regenerate_id(true);
    
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['user_name'] = $user['full_name'];
    $_SESSION['user_role'] = $user['role_code'];
    $_SESSION['user_role_id'] = $user['role_id'];
    $_SESSION['user_logged_in'] = true;
    $_SESSION['login_time'] = time();
    
    $stmt = $conn->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
    $stmt->bind_param("i", $user['id']);
    $stmt->execute();
    $stmt->close();
    
    logLoginAttempt($conn, $user['id'], $username, true);
    
    return [
        'success' => true,
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'full_name' => $user['full_name'],
            'role' => $user['role_code'],
            'role_name' => $user['role_name']
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
        header('Location: /contracts.php?error=access_denied');
        exit;
    }
}

/**
 * Проверяет право доступа к ресурсу через таблицу permissions
 * @param string $resource Имя ресурса (contracts, stages, settings и т.д.)
 * @param string $permission Тип права (can_view, can_create, can_edit, can_delete)
 */
function requirePermission($resource, $permission = 'can_view') {
    global $pdo;
    
    requireAuth();
    
    $roleId = getCurrentUserRoleId();
    if (!$roleId) {
        header('Location: /login.php');
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("
            SELECT $permission 
            FROM permissions 
            WHERE role_id = ? AND resource = ?
        ");
        $stmt->execute([$roleId, $resource]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$result || !$result[$permission]) {
            header('Location: /contracts.php?error=access_denied');
            exit;
        }
    } catch (PDOException $e) {
        header('Location: /contracts.php?error=db_error');
        exit;
    }
}

/**
 * Генерирует безопасный токен для "Запомнить меня"
 * @return string
 */
function generateRememberToken() {
    return bin2hex(random_bytes(32));
}

/**
 * Создаёт "remember me" токен и сохраняет в БД
 * @param int $userId
 * @param mysqli $conn
 * @return string токен
 */
function createRememberToken($userId, $conn) {
    $token = generateRememberToken();
    $expiresAt = date('Y-m-d H:i:s', strtotime('+90 days'));
    
    /* Удаляем старые токены этого пользователя */
    $stmt = $conn->prepare("DELETE FROM user_tokens WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->close();
    
    /* Создаём новый токен */
    $stmt = $conn->prepare("INSERT INTO user_tokens (user_id, token, expires_at) VALUES (?, ?, ?)");
    $stmt->bind_param("iss", $userId, $token, $expiresAt);
    $stmt->execute();
    $stmt->close();
    
    return $token;
}

/**
 * Устанавливает cookie для "Запомнить меня"
 * @param string $token
 */
function setRememberCookie($token) {
    $expires = time() + (90 * 24 * 60 * 60); // 90 дней
    setcookie('remember_token', $token, [
        'expires' => $expires,
        'path' => '/',
        'secure' => isset($_SERVER['HTTPS']),
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
}

/**
 * Удаляет cookie "Запомнить меня"
 */
function clearRememberCookie() {
    setcookie('remember_token', '', [
        'expires' => time() - 3600,
        'path' => '/',
        'secure' => isset($_SERVER['HTTPS']),
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
}

/**
 * Проверяет токен из cookie и авторизует пользователя
 * @param mysqli $conn
 * @return bool
 */
function loginFromRememberToken($conn) {
    if (empty($_COOKIE['remember_token'])) {
        return false;
    }
    
    $token = $_COOKIE['remember_token'];
    
    /* Запрос с JOIN на таблицу roles */
    $stmt = $conn->prepare("
        SELECT ut.user_id, ut.expires_at, 
               u.id, u.username, u.full_name, u.role_id, u.is_active,
               r.code as role_code
        FROM user_tokens ut
        JOIN users u ON ut.user_id = u.id
        JOIN roles r ON u.role_id = r.id
        WHERE ut.token = ? AND ut.expires_at > NOW()
        LIMIT 1
    ");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        clearRememberCookie();
        return false;
    }
    
    $data = $result->fetch_assoc();
    $stmt->close();
    
    if ($data['is_active'] != 1) {
        clearRememberCookie();
        return false;
    }
    
    startSession();
    session_regenerate_id(true);
    
    $_SESSION['user_id'] = $data['id'];
    $_SESSION['username'] = $data['username'];
    $_SESSION['user_name'] = $data['full_name'];
    $_SESSION['user_role'] = $data['role_code'];
    $_SESSION['user_role_id'] = $data['role_id'];
    $_SESSION['user_logged_in'] = true;
    $_SESSION['login_time'] = time();
    
    $stmtUpdate = $conn->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
    $stmtUpdate->bind_param("i", $data['id']);
    $stmtUpdate->execute();
    $stmtUpdate->close();
    
    return true;
}

/**
 * Удаляет токен из БД при выходе
 * @param int $userId
 * @param mysqli $conn
 */
function deleteRememberToken($userId, $conn) {
    $stmt = $conn->prepare("DELETE FROM user_tokens WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->close();
}
?>