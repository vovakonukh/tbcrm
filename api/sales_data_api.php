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

/* POST запрос - создание записи */
elseif ($method == 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO sales_report (manager_id, month, year) 
            VALUES (?, ?, ?)
        ");
        
        /* По умолчанию текущий месяц и год */
        $month = $input['month'] ?? (int)date('n');
        $year = $input['year'] ?? (int)date('Y');
        $managerId = $input['manager_id'] ?? null;
        
        $stmt->execute([$managerId, $month, $year]);
        $newId = $pdo->lastInsertId();
        
        /* Возвращаем созданную запись */
        $stmt = $pdo->prepare("SELECT * FROM sales_report WHERE id = ?");
        $stmt->execute([$newId]);
        $newRecord = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode([
            "success" => true,
            "data" => $newRecord,
            "id" => $newId
        ]);
        
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "error" => "Insert failed: " . $e->getMessage()
        ]);
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

/* POST запрос с action=recalculate - пересчёт данных строки */
elseif ($method == 'POST' && isset($_GET['action']) && $_GET['action'] === 'recalculate') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['id'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Required: id"]);
        exit;
    }
    
    $id = $input['id'];
    
    try {
        /* Получаем данные записи */
        $stmt = $pdo->prepare("SELECT * FROM sales_report WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$row) {
            throw new Exception("Запись не найдена");
        }
        
        $managerId = $row['manager_id'];
        $month = $row['month'];
        $year = $row['year'];
        
        if (!$managerId || !$month || !$year) {
            throw new Exception("Не указаны менеджер, месяц или год");
        }
        
        /* Формируем диапазон дат */
        $startDate = sprintf("%04d-%02d-01", $year, $month);
        $endDate = date("Y-m-t", strtotime($startDate));
        
        /* Получаем bitrix_id менеджера */
        $stmt = $pdo->prepare("SELECT bitrix_id FROM managers WHERE id = ?");
        $stmt->execute([$managerId]);
        $manager = $stmt->fetch(PDO::FETCH_ASSOC);
        $bitrixId = $manager['bitrix_id'] ?? null;
        
        $results = [
            'target_leads_new' => 0,
            'qual_leads_new' => 0,
            'meetings_new' => 0,
            'contracts_new' => 0,
            'revenue' => 0,
            'profit' => 0,
            'margin' => null,
            'average_revenue' => null,
            'target_qual_cr' => null,
            'qual_meeting_cr' => null,
            'meeting_contract_cr' => null,
            'target_contract_cr' => null,
            'qual_contract_cr' => null
        ];
        
        /* === 1. Данные из Битрикс24 (если есть bitrix_id) === */
        if ($bitrixId) {
            require_once __DIR__ . '/../lib/crest.php';
            
            $filterStart = $startDate . 'T00:00:00';
            $filterEnd = $endDate . 'T23:59:59';
            
            /* Целевые лиды - по дате взятия в работу (UF_CRM_1687959404) */
            $bitrixResult = CRest::call('crm.lead.list', [
                'filter' => [
                    'ASSIGNED_BY_ID' => $bitrixId,
                    '!=ASSIGNED_BY_ID' => '2150',
                    '>=UF_CRM_1687959404' => $filterStart,
                    '<=UF_CRM_1687959404' => $filterEnd
                ],
                'select' => ['ID']
            ]);
            $results['target_leads_new'] = $bitrixResult['total'] ?? 0;
            
            /* Квал. лиды - сделки из основной воронки по дате создания */
            $bitrixResult = CRest::call('crm.deal.list', [
                'filter' => [
                    'CATEGORY_ID' => 0,
                    'ASSIGNED_BY_ID' => $bitrixId,
                    '>=DATE_CREATE' => $filterStart,
                    '<=DATE_CREATE' => $filterEnd
                ],
                'select' => ['ID']
            ]);
            $results['qual_leads_new'] = $bitrixResult['total'] ?? 0;
            
            /* Встречи - сделки с датой встречи (UF_CRM_1669280228) */
            $meetingsCount = 0;
            $categories = [0, 10];
            foreach ($categories as $categoryId) {
                $bitrixResult = CRest::call('crm.deal.list', [
                    'filter' => [
                        'CATEGORY_ID' => $categoryId,
                        'ASSIGNED_BY_ID' => $bitrixId,
                        '>=UF_CRM_1669280228' => $startDate,
                        '<=UF_CRM_1669280228' => $endDate
                    ],
                    'select' => ['ID']
                ]);
                $meetingsCount += $bitrixResult['total'] ?? 0;
            }
            $results['meetings_new'] = $meetingsCount;
        }
        
        /* === 2. Данные из contracts === */
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(*) as contracts_count,
                COALESCE(SUM(contract_amount), 0) as revenue,
                COALESCE(SUM(profit), 0) as profit
            FROM contracts
            WHERE manager_id = ?
              AND contract_date >= ?
              AND contract_date <= ?
        ");
        $stmt->execute([$managerId, $startDate, $endDate]);
        $contractsData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $results['contracts_new'] = intval($contractsData['contracts_count']);
        $results['revenue'] = floatval($contractsData['revenue']);
        $results['profit'] = floatval($contractsData['profit']);
        
        /* === 3. Вычисляемые поля === */
        /* Маржа = Прибыль / Выручка * 100 */
        if ($results['revenue'] > 0) {
            $results['margin'] = round(($results['profit'] / $results['revenue']) * 100, 2);
        }
        
        /* Средний чек = Выручка / Количество договоров */
        if ($results['contracts_new'] > 0) {
            $results['average_revenue'] = round($results['revenue'] / $results['contracts_new'], 2);
        }
        
        /* Конверсии */
        if ($results['target_leads_new'] > 0) {
            $results['target_qual_cr'] = round(($results['qual_leads_new'] / $results['target_leads_new']) * 100, 2);
            $results['target_contract_cr'] = round(($results['contracts_new'] / $results['target_leads_new']) * 100, 2);
        }
        
        if ($results['qual_leads_new'] > 0) {
            $results['qual_meeting_cr'] = round(($results['meetings_new'] / $results['qual_leads_new']) * 100, 2);
            $results['qual_contract_cr'] = round(($results['contracts_new'] / $results['qual_leads_new']) * 100, 2);
        }
        
        if ($results['meetings_new'] > 0) {
            $results['meeting_contract_cr'] = round(($results['contracts_new'] / $results['meetings_new']) * 100, 2);
        }
        
        /* === 4. Сохраняем в БД === */
        $stmt = $pdo->prepare("
            UPDATE sales_report SET
                target_leads_new = ?,
                qual_leads_new = ?,
                meetings_new = ?,
                contracts_new = ?,
                revenue = ?,
                profit = ?,
                margin = ?,
                average_revenue = ?,
                target_qual_cr = ?,
                qual_meeting_cr = ?,
                meeting_contract_cr = ?,
                target_contract_cr = ?,
                qual_contract_cr = ?
            WHERE id = ?
        ");
        $stmt->execute([
            $results['target_leads_new'],
            $results['qual_leads_new'],
            $results['meetings_new'],
            $results['contracts_new'],
            $results['revenue'],
            $results['profit'],
            $results['margin'],
            $results['average_revenue'],
            $results['target_qual_cr'],
            $results['qual_meeting_cr'],
            $results['meeting_contract_cr'],
            $results['target_contract_cr'],
            $results['qual_contract_cr'],
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