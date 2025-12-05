<?php
/**
 * adesk_api.php
 * API endpoint для управления интеграцией с Adesk
 */

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/AdeskSyncService.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    $syncService = new AdeskSyncService($pdo);
    
    switch ($action) {
        
        /* Получить настройки */
        case 'get_settings':
            $stmt = $pdo->query("SELECT id, is_enabled, last_sync_at FROM adesk_settings LIMIT 1");
            $settings = $stmt->fetch(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'data' => $settings]);
            break;
        
        /* Сохранить API токен */
        case 'save_settings':
            if ($method !== 'POST') throw new Exception('Method not allowed');
            
            $input = json_decode(file_get_contents('php://input'), true);
            $apiToken = $input['api_token'] ?? '';
            $isEnabled = $input['is_enabled'] ?? 1;
            
            if (empty($apiToken)) throw new Exception('API токен обязателен');
            
            $stmt = $pdo->query("SELECT id FROM adesk_settings LIMIT 1");
            $existing = $stmt->fetch();
            
            if ($existing) {
                $stmt = $pdo->prepare("UPDATE adesk_settings SET api_token = ?, is_enabled = ? WHERE id = ?");
                $stmt->execute([$apiToken, $isEnabled, $existing['id']]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO adesk_settings (api_token, is_enabled) VALUES (?, ?)");
                $stmt->execute([$apiToken, $isEnabled]);
            }
            
            echo json_encode(['success' => true, 'message' => 'Настройки сохранены']);
            break;
        
        /* Проверить подключение */
        case 'test_connection':
            $result = $syncService->testConnection();
            echo json_encode($result);
            break;
        
        /* Запустить синхронизацию */
        case 'sync':
            if ($method !== 'POST') throw new Exception('Method not allowed');
            
            $input = json_decode(file_get_contents('php://input'), true);
            $dateFrom = $input['date_from'] ?? date('Y-01-01');
            $dateTo = $input['date_to'] ?? date('Y-m-d');
            
            $result = $syncService->syncTransactions($dateFrom, $dateTo);
            
            echo json_encode([
                'success' => true,
                'message' => "Получено: {$result['fetched']}, создано: {$result['created']}, обновлено: {$result['updated']}",
                'data' => $result
            ]);
            break;
        
        /* Получить операции из локальной БД */
        case 'get_transactions':
            $where = [];
            $params = [];
            
            if (!empty($_GET['project_id'])) {
                $where[] = "project_id = ?";
                $params[] = $_GET['project_id'];
            }
            
            if (!empty($_GET['category_group'])) {
                $where[] = "category_group_name LIKE ?";
                $params[] = '%' . $_GET['category_group'] . '%';
            }
            
            if (!empty($_GET['date_from'])) {
                $where[] = "transaction_date >= ?";
                $params[] = $_GET['date_from'];
            }
            
            if (!empty($_GET['date_to'])) {
                $where[] = "transaction_date <= ?";
                $params[] = $_GET['date_to'];
            }
            
            $whereClause = count($where) ? 'WHERE ' . implode(' AND ', $where) : '';
            
            $sql = "SELECT * FROM adesk_transactions {$whereClause} ORDER BY transaction_date DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;
        
        /* Список проектов из загруженных операций */
        case 'get_projects':
            $stmt = $pdo->query("
                SELECT DISTINCT project_id, project_name, COUNT(*) as cnt
                FROM adesk_transactions
                WHERE project_id IS NOT NULL
                GROUP BY project_id, project_name
                ORDER BY project_name
            ");
            
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;
        
        default:
            throw new Exception('Unknown action');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}