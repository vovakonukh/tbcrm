<?php
// api.php

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

// Вспомогательная функция для получения справочников в формате [id => name]
function getDictionary($pdo, $tableName) {
    try {
        // Проверяем существование таблицы (защита от ошибок)
        $stmt = $pdo->query("SELECT id, name FROM `$tableName`");
        return $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    } catch (PDOException $e) {
        error_log("Error fetching dictionary $tableName: " . $e->getMessage());
        return [];
    }
}

/* Получение только активных записей справочника */
function getActiveDictionary($pdo, $tableName) {
    try {
        $stmt = $pdo->query("SELECT id, name FROM `$tableName` WHERE is_active = 1");
        return $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    } catch (PDOException $e) {
        error_log("Error fetching active dictionary $tableName: " . $e->getMessage());
        return [];
    }
}

// GET запрос - получить данные и справочники
if ($method == 'GET') {
    try {
        // 1. Получаем основные данные
        $stmt = $pdo->query("SELECT * FROM contracts ORDER BY id DESC");
        $contracts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 2. Получаем справочники для отображения (все записи)
        $options = [
            "payment_types" => getDictionary($pdo, 'payment_types'),
            "managers"      => getDictionary($pdo, 'managers'),
            "escrow_agents" => getDictionary($pdo, 'escrow_agents'),
            "projects"      => getDictionary($pdo, 'projects'),
            "complectation" => getDictionary($pdo, 'complectation'),
            "sources"       => getDictionary($pdo, 'sources'),
            "ipoteka_status" => getDictionary($pdo, 'ipoteka_status')
        ];
        
        // 3. Получаем только активные записи для выбора в dropdown
        $activeOptions = [
            "payment_types" => getActiveDictionary($pdo, 'payment_types'),
            "managers"      => getActiveDictionary($pdo, 'managers'),
            "escrow_agents" => getActiveDictionary($pdo, 'escrow_agents'),
            "projects"      => getDictionary($pdo, 'projects'), // projects без is_active
            "complectation" => getActiveDictionary($pdo, 'complectation'),
            "sources"       => getActiveDictionary($pdo, 'sources'),
            "ipoteka_status" => getActiveDictionary($pdo, 'ipoteka_status')
        ];
        
        echo json_encode([
            "success" => true,
            "data" => $contracts,
            "options" => $options,
            "activeOptions" => $activeOptions
        ]);
        
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "error" => "Database error: " . $e->getMessage()
        ]);
    }
} 
// PUT запрос - обновление
elseif ($method == 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['id'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid input data. No ID provided."]);
        exit;
    }
    
    $id = $input['id'];
    unset($input['id']);
    unset($input['created_at']);
    unset($input['created_by']);
    
    $input['updated_at'] = date('Y-m-d H:i:s');
    
    try {
        $setParts = [];
        $params = [];
        
        foreach ($input as $key => $value) {
            // ВАЖНОЕ ИСПРАВЛЕНИЕ:
            // Если приходит пустая строка (''), заменяем её на NULL,
            // иначе MySQL выдаст ошибку Foreign Key constraint
            if ($value === '') {
                $value = null;
            }
            
            $setParts[] = "{$key} = ?";
            $params[] = $value;
        }
        
        $params[] = $id;
        
        $query = "UPDATE contracts SET " . implode(', ', $setParts) . " WHERE id = ?";
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        
        echo json_encode(["success" => true, "message" => "Contract updated successfully"]);
        
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => "Update failed: " . $e->getMessage()]);
    }
} 

elseif ($method == 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid input data"]);
        exit;
    }
    
    // Убираем id если он был передан
    unset($input['id']);
    
    // Устанавливаем временные метки
    $input['created_at'] = date('Y-m-d H:i:s');
    $input['updated_at'] = date('Y-m-d H:i:s');
    
    try {
        // Формируем списки полей и плейсхолдеров
        $fields = array_keys($input);
        $placeholders = array_fill(0, count($fields), '?');
        
        $query = "INSERT INTO contracts (" . implode(', ', $fields) . ") 
                  VALUES (" . implode(', ', $placeholders) . ")";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute(array_values($input));
        
        $newId = $pdo->lastInsertId();
        
        echo json_encode([
            "success" => true, 
            "message" => "Contract created successfully",
            "id" => $newId
        ]);
        
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => "Insert failed: " . $e->getMessage()]);
    }
}

elseif ($method == 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['id'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid input data. No ID provided."]);
        exit;
    }
    
    $id = $input['id'];
    
    try {
        $query = "DELETE FROM contracts WHERE id = ?";
        $stmt = $pdo->prepare($query);
        $stmt->execute([$id]);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode(["success" => true, "message" => "Contract deleted successfully"]);
        } else {
            http_response_code(404);
            echo json_encode(["success" => false, "error" => "Contract not found"]);
        }
        
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => "Delete failed: " . $e->getMessage()]);
    }
}

else {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Method not allowed"]);
}
?>