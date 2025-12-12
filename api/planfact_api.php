<?php
/* planfact_api.php - API для план-факта */

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

/* GET запрос - получить данные */
if ($method == 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM planfact ORDER BY date DESC");
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            "success" => true,
            "data" => $data,
            "options" => []
        ]);
        
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => "Database error: " . $e->getMessage()]);
    }
}

/* PUT запрос - обновление */
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
        
        $query = "UPDATE planfact SET " . implode(', ', $setParts) . " WHERE id = ?";
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        
        echo json_encode(["success" => true, "message" => "Record updated successfully"]);
        
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => "Update failed: " . $e->getMessage()]);
    }
}

/* POST запрос - создание новой записи */
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
        
        $query = "INSERT INTO planfact (" . implode(', ', $fields) . ") VALUES (" . implode(', ', $placeholders) . ")";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute(array_values($input));
        
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

/* DELETE запрос - удаление записи */
elseif ($method == 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['id'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid input data. No ID provided."]);
        exit;
    }
    
    $id = $input['id'];
    
    try {
        $query = "DELETE FROM planfact WHERE id = ?";
        $stmt = $pdo->prepare($query);
        $stmt->execute([$id]);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode(["success" => true, "message" => "Record deleted successfully"]);
        } else {
            http_response_code(404);
            echo json_encode(["success" => false, "error" => "Record not found"]);
        }
        
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => "Delete failed: " . $e->getMessage()]);
    }
}

/* PATCH запрос - пересчёт полей */
elseif ($method == 'PATCH') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['id']) || !isset($input['field'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid input. Required: id, field"]);
        exit;
    }
    
    $id = $input['id'];
    $field = $input['field'];
    
    /* Разрешённые поля для пересчёта */
    $allowedFields = ['revenue_fact', 'contracts_fact'];
    if (!in_array($field, $allowedFields)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Field not allowed for recalculation"]);
        exit;
    }
    
    try {
        /* Получаем дату записи */
        $stmt = $pdo->prepare("SELECT date FROM planfact WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$row || !$row['date']) {
            throw new Exception("Запись не найдена или дата не указана");
        }
        
        $date = new DateTime($row['date']);
        $year = $date->format('Y');
        $month = $date->format('m');
        
        /* Вычисляем начало и конец месяца */
        $startDate = "$year-$month-01";
        $endDate = $date->format('Y-m-t'); /* Последний день месяца */
        
        $value = 0;
        
        if ($field === 'revenue_fact') {
            /* Сумма contract_amount всех договоров за месяц по contract_date */
            $stmt = $pdo->prepare("
                SELECT COALESCE(SUM(contract_amount), 0) as total
                FROM contracts
                WHERE contract_date >= ? AND contract_date <= ?
            ");
            $stmt->execute([$startDate, $endDate]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $value = floatval($result['total']);
        }
        elseif ($field === 'contracts_fact') {
            /* Количество договоров за месяц по contract_date */
            $stmt = $pdo->prepare("
                SELECT COUNT(*) as total
                FROM contracts
                WHERE contract_date >= ? AND contract_date <= ?
            ");
            $stmt->execute([$startDate, $endDate]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $value = intval($result['total']);
        }
        
        /* Сохраняем значение */
        $stmt = $pdo->prepare("UPDATE planfact SET {$field} = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$value, $id]);
        
        echo json_encode([
            "success" => true,
            "field" => $field,
            "value" => $value,
            "period" => "$startDate — $endDate"
        ]);
        
    } catch(Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}

else {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Method not allowed"]);
}
?>