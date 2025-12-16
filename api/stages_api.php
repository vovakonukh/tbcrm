<?php
// stages_api.php

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
function getDictionary($pdo, $tableName, $nameField = 'name') {
    try {
        // Для таблицы contracts используем поле contract_name вместо name
        if ($tableName === 'contracts') {
            $nameField = 'contract_name';
        }
        $stmt = $pdo->query("SELECT id, $nameField FROM `$tableName`");
        return $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    } catch (PDOException $e) {
        error_log("Error fetching dictionary $tableName: " . $e->getMessage());
        return [];
    }
}

/* Получение только активных записей справочника */
function getActiveDictionary($pdo, $tableName, $nameField = 'name') {
    try {
        if ($tableName === 'contracts') {
            $nameField = 'contract_name';
        }
        $stmt = $pdo->query("SELECT id, $nameField FROM `$tableName` WHERE is_active = 1");
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
        // --- НАЧАЛО ИЗМЕНЕНИЙ ---
        $query = "
            SELECT 
                s.*,
                c.complectation_id,
                c.payment_type_id,
                c.manager_id,
                c.project_id,
                c.ar_ready,
                c.kr_ready,
                c.estimate_ready,
                c.foundation
            FROM stages s
            LEFT JOIN contracts c ON s.contract_id = c.id
            ORDER BY s.id DESC
        ";
        $stmt = $pdo->query($query);
        $stages = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 2. Получаем справочники для отображения (все записи)
        $options = [
            "contracts" => getDictionary($pdo, 'contracts', 'contract_name'),
            "stage_types" => getDictionary($pdo, 'stage_types'),
            "contractors" => getDictionary($pdo, 'contractors'),
            "brigades" => getDictionary($pdo, 'brigades'),
            "prorabs" => getDictionary($pdo, 'prorabs'),
            "complectation" => getDictionary($pdo, 'complectation'),
            "payment_types" => getDictionary($pdo, 'payment_types'),
            "managers"      => getDictionary($pdo, 'managers'),
            "projects"      => getDictionary($pdo, 'projects')
        ];
        
        // 3. Получаем только активные записи для выбора в dropdown
        $activeOptions = [
            "contracts" => getActiveDictionary($pdo, 'contracts', 'contract_name'),
            "stage_types" => getActiveDictionary($pdo, 'stage_types'),
            "contractors" => getActiveDictionary($pdo, 'contractors'),
            "brigades" => getActiveDictionary($pdo, 'brigades'),
            "prorabs" => getActiveDictionary($pdo, 'prorabs'),
            "complectation" => getActiveDictionary($pdo, 'complectation'),
            "payment_types" => getActiveDictionary($pdo, 'payment_types'),
            "managers"      => getActiveDictionary($pdo, 'managers'),
            "projects"      => getDictionary($pdo, 'projects') // projects без is_active
        ];
        
        echo json_encode([
            "success" => true,
            "data" => $stages,
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
    
    $input['updated_at'] = date('Y-m-d H:i:s');
    
    try {
        $setParts = [];
        $params = [];
        
        // --- НАЧАЛО ИЗМЕНЕНИЙ ---
        // Список полей, которые относятся к таблице contracts
        $contractFields = [
            'complectation_id', 'payment_type_id', 'manager_id', 
            'project_id', 'ar_ready', 'kr_ready', 'estimate_ready', 'foundation'
        ];

        // Определяем, куда сохранять
        $targetTable = 'stages';
        $targetId = $id; // По умолчанию обновляем stage по его ID

        $fieldToUpdate = array_key_first($input); // Получаем имя поля (обычно BaseTable шлет по одному полю)

        if (in_array($fieldToUpdate, $contractFields)) {
            $targetTable = 'contracts';
            
            // Нам нужно найти contract_id, связанный с этим этапом
            $stmtGetContract = $pdo->prepare("SELECT contract_id FROM stages WHERE id = ?");
            $stmtGetContract->execute([$id]);
            $contractId = $stmtGetContract->fetchColumn();

            if (!$contractId) {
                throw new Exception("Не найден договор, привязанный к этому этапу.");
            }
            $targetId = $contractId;
        }

        foreach ($input as $key => $value) {
            if ($value === '') {
                $value = null;
            }
            
            $setParts[] = "{$key} = ?";
            $params[] = $value;
        }
        
        $params[] = $targetId;
        
        $query = "UPDATE `$targetTable` SET " . implode(', ', $setParts) . " WHERE id = ?";
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        
        echo json_encode(["success" => true, "message" => "Stage updated successfully"]);
        
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
        
        $query = "INSERT INTO stages (" . implode(', ', $fields) . ") 
        VALUES (" . implode(', ', $placeholders) . ")";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute(array_values($input));
        
        $newId = $pdo->lastInsertId();
        
        echo json_encode([
            "success" => true, 
            "message" => "Stage created successfully",
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
        $query = "DELETE FROM stages WHERE id = ?";
        $stmt = $pdo->prepare($query);
        $stmt->execute([$id]);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode(["success" => true, "message" => "Stage deleted successfully"]);
        } else {
            http_response_code(404);
            echo json_encode(["success" => false, "error" => "Stage not found"]);
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