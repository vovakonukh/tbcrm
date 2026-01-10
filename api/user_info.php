<?php
/* API для получения информации о текущем пользователе и его правах доступа */
require_once 'check_auth.php';
require_once 'config.php';

header('Content-Type: application/json');

$userId = getCurrentUserId();

if (!$userId) {
    echo json_encode(['success' => false, 'error' => 'Не авторизован']);
    exit;
}

try {
    /* Получаем данные пользователя с ролью */
    $stmt = $pdo->prepare("
        SELECT u.id, u.username, u.full_name, u.role_id, r.code as role_code, r.name as role_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = ?
    ");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode(['success' => false, 'error' => 'Пользователь не найден']);
        exit;
    }

    /* Получаем все разрешения для роли пользователя */
    $stmt = $pdo->prepare("
        SELECT resource, can_view, can_create, can_edit, can_delete, hidden_fields
        FROM permissions
        WHERE role_id = ?
    ");
    $stmt->execute([$user['role_id']]);
    $permissionsRaw = $stmt->fetchAll(PDO::FETCH_ASSOC);

    /* Преобразуем в удобный формат: resource => permissions */
    $permissions = [];
    foreach ($permissionsRaw as $perm) {
        $permissions[$perm['resource']] = [
            'can_view' => (bool) $perm['can_view'],
            'can_create' => (bool) $perm['can_create'],
            'can_edit' => (bool) $perm['can_edit'],
            'can_delete' => (bool) $perm['can_delete'],
            'hidden_fields' => $perm['hidden_fields'] ? json_decode($perm['hidden_fields'], true) : []
        ];
    }

    echo json_encode([
        'success' => true,
        'user' => [
            'id' => (int) $user['id'],
            'name' => $user['full_name'],
            'role' => $user['role_code'],
            'role_name' => $user['role_name']
        ],
        'permissions' => $permissions
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Ошибка базы данных: ' . $e->getMessage()]);
}