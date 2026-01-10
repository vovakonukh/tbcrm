<?php
/* API для управления правами доступа */

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/check_auth.php';

/* Только админы могут управлять доступом */
requirePermission('settings');

$method = $_SERVER['REQUEST_METHOD'];

/* GET — получить все роли и разрешения */
if ($method == 'GET') {
    try {
        /* Получаем роли */
        $rolesStmt = $pdo->query("SELECT id, name, code, description, is_active FROM roles ORDER BY id");
        $roles = $rolesStmt->fetchAll(PDO::FETCH_ASSOC);

        /* Получаем все разрешения */
        $permStmt = $pdo->query("
            SELECT p.id, p.role_id, p.resource, p.can_view, p.can_create, p.can_edit, p.can_delete, p.hidden_fields
            FROM permissions p
            ORDER BY p.role_id, p.resource
        ");
        $permissions = $permStmt->fetchAll(PDO::FETCH_ASSOC);

        /* Декодируем JSON hidden_fields */
        foreach ($permissions as &$perm) {
            $perm['hidden_fields'] = $perm['hidden_fields'] ? json_decode($perm['hidden_fields'], true) : [];
        }

        /* Список всех доступных ресурсов */
        $resources = [
            'contracts' => 'Договора',
            'stages' => 'Этапы',
            'brigades' => 'Бригады',
            'settings' => 'Настройки',
            'planfact' => 'Планфакт',
            'sales_data' => 'Отдел продаж (данные)',
            'sales_report' => 'Отдел продаж (отчёт)',
            'dashboard' => 'Дашборд'
        ];

        /* Список всех полей, которые можно скрывать */
        $hideable_fields = [
            'contracts' => [
                'contract_amount' => 'Сумма договора',
                'final_amount' => 'Сумма с допками',
                'profit' => 'Прибыль',
                'margin_percent' => 'Маржинальность',
                'manager_percent' => '% менеджера',
                'manager_zp' => 'ЗП менеджера',
                'manager_paid' => 'Выплачено менеджеру',
                'manager_balance' => 'Остаток менеджеру',
                'sop_percent' => '% СОП',
                'sop_zp' => 'ЗП СОП',
                'sop_paid' => 'Выплачено СОП',
                'sop_balance' => 'Остаток СОП'
            ],
            'stages' => [
                'amount' => 'Сумма этапа'
            ],
            'sales_data' => [
                'revenue' => 'Выручка',
                'profit' => 'Прибыль',
                'margin' => 'Маржинальность',
                'average_revenue' => 'Средняя выручка'
            ],
            'sales_report' => [
                'profit' => 'Прибыль',
                'margin' => 'Маржинальность'
            ]
        ];

        echo json_encode([
            'success' => true,
            'roles' => $roles,
            'permissions' => $permissions,
            'resources' => $resources,
            'hideable_fields' => $hideable_fields
        ]);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Ошибка БД: ' . $e->getMessage()]);
    }
}

/* PUT — обновить разрешение */
elseif ($method == 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Не указан ID разрешения']);
        exit;
    }

    $id = (int) $input['id'];
    $updates = [];
    $params = [];

    /* Собираем поля для обновления */
    $allowedFields = ['can_view', 'can_create', 'can_edit', 'can_delete', 'hidden_fields'];
    
    foreach ($allowedFields as $field) {
        if (array_key_exists($field, $input)) {
            if ($field === 'hidden_fields') {
                $updates[] = "$field = ?";
                $params[] = is_array($input[$field]) ? json_encode($input[$field]) : $input[$field];
            } else {
                $updates[] = "$field = ?";
                $params[] = (int) $input[$field];
            }
        }
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Нет данных для обновления']);
        exit;
    }

    try {
        $params[] = $id;
        $sql = "UPDATE permissions SET " . implode(', ', $updates) . ", updated_at = NOW() WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        echo json_encode(['success' => true, 'message' => 'Разрешение обновлено']);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Ошибка обновления: ' . $e->getMessage()]);
    }
}

/* POST — создать новую роль */
elseif ($method == 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || empty($input['name']) || empty($input['code'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Укажите название и код роли']);
        exit;
    }

    try {
        $pdo->beginTransaction();

        /* Создаём роль */
        $stmt = $pdo->prepare("INSERT INTO roles (name, code, description, is_active) VALUES (?, ?, ?, 1)");
        $stmt->execute([$input['name'], $input['code'], $input['description'] ?? '']);
        $roleId = $pdo->lastInsertId();

        /* Создаём разрешения для всех ресурсов (по умолчанию всё запрещено) */
        $resources = ['contracts', 'stages', 'brigades', 'settings', 'planfact', 'sales_data', 'sales_report', 'dashboard'];
        $permStmt = $pdo->prepare("
            INSERT INTO permissions (role_id, resource, can_view, can_create, can_edit, can_delete)
            VALUES (?, ?, 0, 0, 0, 0)
        ");
        
        foreach ($resources as $resource) {
            $permStmt->execute([$roleId, $resource]);
        }

        $pdo->commit();

        echo json_encode(['success' => true, 'id' => $roleId, 'message' => 'Роль создана']);

    } catch (PDOException $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Ошибка создания роли: ' . $e->getMessage()]);
    }
}

/* DELETE — удалить роль */
elseif ($method == 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Не указан ID роли']);
        exit;
    }

    $id = (int) $input['id'];

    /* Защищаем системные роли */
    $protectedRoles = [1]; /* admin */
    if (in_array($id, $protectedRoles)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Нельзя удалить системную роль']);
        exit;
    }

    try {
        /* Проверяем, есть ли пользователи с этой ролью */
        $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE role_id = ?");
        $checkStmt->execute([$id]);
        $usersCount = $checkStmt->fetchColumn();

        if ($usersCount > 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => "Нельзя удалить роль, к ней привязано $usersCount пользователей"]);
            exit;
        }

        /* Удаляем роль (permissions удалятся каскадно) */
        $stmt = $pdo->prepare("DELETE FROM roles WHERE id = ?");
        $stmt->execute([$id]);

        echo json_encode(['success' => true, 'message' => 'Роль удалена']);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Ошибка удаления: ' . $e->getMessage()]);
    }
}