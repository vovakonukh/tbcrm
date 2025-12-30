<?php
/* sales_data_api.php - API для данных отдела продаж
   Таблица sales_report теперь хранит только данные из Битрикс:
   - target_leads_new, qual_leads_new, meetings_new
   Данные contracts (revenue, profit, contracts_new) берутся напрямую в sales_report_api.php */

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

/* Вспомогательная функция для получения справочников */
function getDictionary($pdo, $tableName) {
    try {
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

/* GET запрос - получить данные и справочники */
if ($method == 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM sales_report ORDER BY year DESC, month DESC, manager_id ASC");
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        /* Получаем справочники */
        $options = [
            "managers" => getDictionary($pdo, 'managers')
        ];
        
        $activeOptions = [
            "managers" => getActiveDictionary($pdo, 'managers')
        ];
        
        /* Получаем список уникальных годов для фильтра */
        $yearsStmt = $pdo->query("SELECT DISTINCT year FROM sales_report ORDER BY year DESC");
        $years = $yearsStmt->fetchAll(PDO::FETCH_COLUMN);
        
        echo json_encode([
            "success" => true,
            "data" => $data,
            "options" => $options,
            "activeOptions" => $activeOptions,
            "years" => $years
        ]);
        
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "error" => "Database error: " . $e->getMessage()
        ]);
    }
}

/* POST запрос - создание новой записи */
elseif ($method == 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    try {
        if (!isset($input['manager_id'])) {
            throw new Exception("Не выбран менеджер");
        }

        $stmt = $pdo->prepare("
            INSERT INTO sales_report (manager_id, month, year) 
            VALUES (?, ?, ?)
        ");
        $stmt->execute([
            $input['manager_id'],
            $input['month'] ?? date('n'),
            $input['year'] ?? date('Y')
        ]);
        
        $newId = $pdo->lastInsertId();
        
        /* Возвращаем созданную запись */
        $stmt = $pdo->prepare("SELECT * FROM sales_report WHERE id = ?");
        $stmt->execute([$newId]);
        
        echo json_encode([
            "success" => true, 
            "data" => $stmt->fetch(PDO::FETCH_ASSOC)
        ]);
    } catch(Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
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

    /* Убираем поля, которых нет в таблице */
    unset($input['updated_at']);
    unset($input['created_at']);
    
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
        
        $query = "UPDATE sales_report SET " . implode(', ', $setParts) . " WHERE id = ?";
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        
        echo json_encode([
            "success" => true,
            "message" => "Record updated successfully",
            "id" => $id
        ]);
        
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "error" => "Update failed: " . $e->getMessage()
        ]);
    }
}

/* DELETE запрос - удаление */
elseif ($method == 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['id'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid input data. No ID provided."]);
        exit;
    }
    
    $id = $input['id'];
    
    try {
        $stmt = $pdo->prepare("DELETE FROM sales_report WHERE id = ?");
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

else {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Method not allowed"]);
}
?>