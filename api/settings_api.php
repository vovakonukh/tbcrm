<?php
// settings_api.php

// Заголовки CORS
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Access-Control-Allow-Headers,Content-Type,Access-Control-Allow-Methods, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

// Список разрешённых таблиц-справочников (защита от SQL-инъекций)
$allowedTables = [
    'brigades',
    'brigade_types',
    'managers',
    'payment_types',
    'escrow_agents',
    'sources',
    'projects',
    'complectation',
    'stage_types',
    'contractors',
    'prorabs',
    'ipoteka_status'
];

// GET запрос - получить данные справочников
if ($method == 'GET') {
    try {
        $data = [];
        
        // Бригады
        $stmt = $pdo->query("SELECT id, name, is_active FROM brigades ORDER BY name");
        $data['brigades'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Типы бригад
        $stmt = $pdo->query("SELECT id, name FROM brigade_types ORDER BY name");
        $data['brigade_types'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Менеджеры
        $stmt = $pdo->query("SELECT id, name, is_active FROM managers ORDER BY name");
        $data['managers'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Прорабы
        $stmt = $pdo->query("SELECT id, name, is_active FROM prorabs ORDER BY name");
        $data['prorabs'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Подрядчики
        $stmt = $pdo->query("SELECT id, name, is_active FROM contractors ORDER BY name");
        $data['contractors'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Эскроу агенты
        $stmt = $pdo->query("SELECT id, name, is_active FROM escrow_agents ORDER BY name");
        $data['escrow_agents'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Типы оплаты
        $stmt = $pdo->query("SELECT id, name, is_active FROM payment_types ORDER BY name");
        $data['payment_types'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Типы комплектаций
        $stmt = $pdo->query("SELECT id, name, is_active FROM complectation ORDER BY name");
        $data['complectation'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Источники
        $stmt = $pdo->query("SELECT id, name, is_active FROM sources ORDER BY name");
        $data['sources'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Типы этапов
        $stmt = $pdo->query("SELECT id, name, is_active FROM stage_types ORDER BY name");
        $data['stage_types'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Статусы ипотеки
        $stmt = $pdo->query("SELECT id, name, is_active FROM ipoteka_status ORDER BY name");
        $data['ipoteka_status'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            "success" => true,
            "data" => $data
        ]);
        
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "error" => "Database error: " . $e->getMessage()
        ]);
    }
}

// POST запрос - создание новой записи
elseif ($method == 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['table']) || !isset($input['data'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid input data"]);
        exit;
    }
    
    $table = $input['table'];
    $data = $input['data'];
    
    // Проверяем, что таблица разрешена
    if (!in_array($table, $allowedTables)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Table not allowed"]);
        exit;
    }
    
    try {
        // Добавляем временные метки
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');
        
        $fields = array_keys($data);
        $placeholders = array_fill(0, count($fields), '?');
        
        $query = "INSERT INTO `$table` (" . implode(', ', $fields) . ") 
                  VALUES (" . implode(', ', $placeholders) . ")";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute(array_values($data));
        
        $newId = $pdo->lastInsertId();
        
        echo json_encode([
            "success" => true,
            "message" => "Record created successfully",
            "id" => $newId
        ]);
        
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => "Insert failed: " . $e->getMessage()]);
    }
}

// PUT запрос - обновление записи
elseif ($method == 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['table']) || !isset($input['id']) || !isset($input['data'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid input data"]);
        exit;
    }
    
    $table = $input['table'];
    $id = $input['id'];
    $data = $input['data'];
    
    // Проверяем, что таблица разрешена
    if (!in_array($table, $allowedTables)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Table not allowed"]);
        exit;
    }
    
    try {
        // Добавляем временную метку обновления
        $data['updated_at'] = date('Y-m-d H:i:s');
        
        $setParts = [];
        $params = [];
        
        foreach ($data as $key => $value) {
            if ($value === '') {
                $value = null;
            }
            $setParts[] = "`$key` = ?";
            $params[] = $value;
        }
        
        $params[] = $id;
        
        $query = "UPDATE `$table` SET " . implode(', ', $setParts) . " WHERE id = ?";
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        
        echo json_encode(["success" => true, "message" => "Record updated successfully"]);
        
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => "Update failed: " . $e->getMessage()]);
    }
}

// DELETE запрос - удаление записи
elseif ($method == 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['table']) || !isset($input['id'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid input data"]);
        exit;
    }
    
    $table = $input['table'];
    $id = $input['id'];
    
    // Проверяем, что таблица разрешена
    if (!in_array($table, $allowedTables)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Table not allowed"]);
        exit;
    }
    
    try {
        $query = "DELETE FROM `$table` WHERE id = ?";
        $stmt = $pdo->prepare($query);
        $stmt->execute([$id]);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode(["success" => true, "message" => "Record deleted successfully"]);
        } else {
            http_response_code(404);
            echo json_encode(["success" => false, "error" => "Record not found"]);
        }
        
    } catch(PDOException $e) {
        // Проверяем, не используется ли запись в других таблицах
        if ($e->getCode() == 23000) {
            http_response_code(400);
            echo json_encode([
                "success" => false, 
                "error" => "Невозможно удалить: запись используется в других таблицах"
            ]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Delete failed: " . $e->getMessage()]);
        }
    }
}

else {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Method not allowed"]);
}
?>