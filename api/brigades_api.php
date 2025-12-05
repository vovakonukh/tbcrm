<?php
// brigades_api.php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Access-Control-Allow-Headers,Content-Type,Access-Control-Allow-Methods, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

// Вспомогательная функция для получения справочников
function getDictionary($pdo, $tableName) {
    try {
        $stmt = $pdo->query("SELECT id, name FROM `$tableName`");
        return $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    } catch (PDOException $e) {
        error_log("Error fetching dictionary $tableName: " . $e->getMessage());
        return [];
    }
}

// GET запрос - получить данные и справочники
if ($method == 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM brigades ORDER BY name ASC");
        $brigades = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $options = [
            "brigade_types" => getDictionary($pdo, 'brigade_types')
        ];
        
        echo json_encode([
            "success" => true,
            "data" => $brigades,
            "options" => $options
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
    
    $input['updated_at'] = date('Y-m-d H:i:s');
    
    try {
        $setParts = [];
        $params = [];
        
        foreach ($input as $key => $value) {
            if ($value === '') {
                $value = null;
            }
            $setParts[] = "{$key} = ?";
            $params[] = $value;
        }
        
        $params[] = $id;
        
        $query = "UPDATE brigades SET " . implode(', ', $setParts) . " WHERE id = ?";
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        
        echo json_encode(["success" => true, "message" => "Brigade updated successfully"]);
        
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => "Update failed: " . $e->getMessage()]);
    }
} 
// POST запрос - создание новой записи
elseif ($method == 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid input data"]);
        exit;
    }
    
    unset($input['id']);
    
    $input['created_at'] = date('Y-m-d H:i:s');
    $input['updated_at'] = date('Y-m-d H:i:s');
    
    try {
        $fields = array_keys($input);
        $placeholders = array_fill(0, count($fields), '?');
        
        $query = "INSERT INTO brigades (" . implode(', ', $fields) . ") 
                  VALUES (" . implode(', ', $placeholders) . ")";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute(array_values($input));
        
        $newId = $pdo->lastInsertId();
        
        echo json_encode([
            "success" => true, 
            "message" => "Brigade created successfully",
            "id" => $newId
        ]);
        
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => "Insert failed: " . $e->getMessage()]);
    }
}
// DELETE запрещён - бригады можно только деактивировать
else {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Method not allowed"]);
}
?>