<?php
/* sales_data_api.php - API для данных отдела продаж */

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

/* POST запрос - создание новой записи ИЛИ пересчет данных */
elseif ($method == 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    /* Проверяем, пришел ли запрос на пересчет данных */
    if (isset($_GET['action']) && $_GET['action'] === 'recalculate') {
        if (!$input || !isset($input['id'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "ID записи не указан"]);
            exit;
        }
        
        $id = $input['id'];
        
        try {
            /* 1. Получаем базовую информацию о записи из отчета */
            $stmt = $pdo->prepare("
                SELECT r.*, m.bitrix_id 
                FROM sales_report r
                JOIN managers m ON r.manager_id = m.id
                WHERE r.id = ?
            ");
            $stmt->execute([$id]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$row) throw new Exception("Запись не найдена в базе данных");
            
            $managerId = $row['manager_id'];
            $bitrixId = $row['bitrix_id'];
            $month = (int)$row['month'];
            $year = (int)$row['year'];
            
            /* 2. Рассчитываем даты начала и конца месяца */
            $startDate = sprintf('%04d-%02d-01', $year, $month);
            $endDate = date('Y-m-t', strtotime($startDate));
            
            /* 3. Получаем данные из таблицы contracts (внутренняя база) */
            /* Считаем количество договоров, сумму выручки и прибыль за этот период для этого менеджера */
            $contractStmt = $pdo->prepare("
                SELECT 
                    COUNT(*) as count,
                    SUM(contract_amount) as revenue,
                    SUM(profit) as profit
                FROM contracts 
                WHERE manager_id = ? 
                AND contract_date BETWEEN ? AND ?
            ");
            $contractStmt->execute([$managerId, $startDate, $endDate]);
            $contractData = $contractStmt->fetch(PDO::FETCH_ASSOC);
            
            /* 4. Получаем данные из Битрикс24 с фильтрацией по менеджеру */
            require_once __DIR__ . '/../lib/crest.php';
            
            $bitrixData = [
                'target_leads' => 0,
                'qual_leads' => 0,
                'meetings' => 0
            ];
            
            /* Проверяем наличие bitrix_id у менеджера */
            if (!empty($bitrixId)) {
                $filterStart = $startDate . 'T00:00:00';
                $filterEnd = $endDate . 'T23:59:59';
                
                /* 4.1 Целевые лиды - из crm.lead.list по дате взятия в работу */
                $targetLeadsResult = CRest::call('crm.lead.list', [
                    'filter' => [
                        'ASSIGNED_BY_ID' => $bitrixId,
                        '>=UF_CRM_1687959404' => $filterStart,
                        '<=UF_CRM_1687959404' => $filterEnd,
                        '!=ASSIGNED_BY_ID' => '2150' /* Исключаем колл-центр */
                    ],
                    'select' => ['ID']
                ]);
                
                if (!isset($targetLeadsResult['error'])) {
                    $bitrixData['target_leads'] = $targetLeadsResult['total'] ?? 0;
                }
                
                /* 4.2 Квал. лиды - сделки из Основной воронки по дате создания */
                $qualLeadsResult = CRest::call('crm.deal.list', [
                    'filter' => [
                        'ASSIGNED_BY_ID' => $bitrixId,
                        'CATEGORY_ID' => 0,
                        '>=DATE_CREATE' => $filterStart,
                        '<=DATE_CREATE' => $filterEnd
                    ],
                    'select' => ['ID']
                ]);
                
                if (!isset($qualLeadsResult['error'])) {
                    $bitrixData['qual_leads'] = $qualLeadsResult['total'] ?? 0;
                }
                
                /* 4.3 Встречи - сделки с датой встречи из двух воронок */
                $categories = [0, 10]; /* Основная воронка и Перспектива */
                $meetingsTotal = 0;
                
                foreach ($categories as $categoryId) {
                    $meetingsResult = CRest::call('crm.deal.list', [
                        'filter' => [
                            'ASSIGNED_BY_ID' => $bitrixId,
                            'CATEGORY_ID' => $categoryId,
                            '>=UF_CRM_1669280228' => $startDate,
                            '<=UF_CRM_1669280228' => $endDate
                        ],
                        'select' => ['ID']
                    ]);
                    
                    if (!isset($meetingsResult['error'])) {
                        $meetingsTotal += $meetingsResult['total'] ?? 0;
                    }
                }
                
                $bitrixData['meetings'] = $meetingsTotal;
            }
            
            /* 5. Формируем итоговые результаты для обновления */
            $results = [
                'revenue' => (float)($contractData['revenue'] ?? 0),
                'profit' => (float)($contractData['profit'] ?? 0),
                'contracts_new' => (int)($contractData['count'] ?? 0),
                'target_leads_new' => $bitrixData['target_leads'],
                'qual_leads_new' => $bitrixData['qual_leads'],
                'meetings_new' => $bitrixData['meetings']
            ];
            
            /* Расчет маржинальности и среднего чека */
            $results['margin'] = $results['revenue'] > 0 ? ($results['profit'] / $results['revenue']) * 100 : 0;
            $results['average_revenue'] = $results['contracts_new'] > 0 ? $results['revenue'] / $results['contracts_new'] : 0;
            
            /* 6. Обновляем запись в базе данных */
            $updateSql = "
                UPDATE sales_report SET 
                    revenue = ?, profit = ?, margin = ?, average_revenue = ?,
                    target_leads_new = ?, qual_leads_new = ?, meetings_new = ?, contracts_new = ?
                WHERE id = ?
            ";
            
            $pdo->prepare($updateSql)->execute([
                $results['revenue'], $results['profit'], $results['margin'], $results['average_revenue'],
                $results['target_leads_new'], $results['qual_leads_new'], $results['meetings_new'], $results['contracts_new'],
                $id
            ]);
            
            echo json_encode([
                "success" => true,
                "data" => $results,
                "period" => "$startDate — $endDate",
                "bitrix_id" => $bitrixId
            ]);
            
        } catch(Exception $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        exit;
    }

    /* Если action не задан, значит это обычное создание новой строки */
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
    exit;
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

    /* Убираем поля, которых нет в таблице sales_report */
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