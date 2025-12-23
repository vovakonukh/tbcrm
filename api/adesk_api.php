<?php
/**
 * adesk_api.php
 * API endpoint для работы с Adesk
 */

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/AdeskAPI.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

/* Получение API токена из БД */
function getAdeskApi($pdo) {
    $stmt = $pdo->query("SELECT api_token, is_enabled FROM adesk_settings LIMIT 1");
    $settings = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$settings || !$settings['is_enabled'] || empty($settings['api_token'])) {
        throw new Exception('Интеграция с Adesk не настроена');
    }
    
    return new AdeskAPI($settings['api_token']);
}

try {
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
            $api = getAdeskApi($pdo);
            $api->get('legal-entities');
            echo json_encode(['success' => true, 'message' => 'Подключение установлено']);
            break;
        
        /* Получить финансовые данные проекта из Adesk */
        case 'get_project_income':
            $projectId = $_GET['project_id'] ?? null;
            if (!$projectId) throw new Exception('project_id обязателен');
            
            $api = getAdeskApi($pdo);
            $response = $api->get("projects", ['status' => 'all']);
            
            $projects = $response['projects'] ?? [];
            $projectData = null;
            
            foreach ($projects as $project) {
                if ($project['id'] == $projectId) {
                    $income = floatval($project['income'] ?? 0);
                    $outcome = floatval($project['outcome'] ?? 0);
                    $projectData = [
                        'income' => $income,
                        'outcome' => $outcome,
                        'profit' => $income - $outcome
                    ];
                    break;
                }
            }
            
            if ($projectData === null) {
                throw new Exception('Проект не найден в Adesk');
            }
            
            echo json_encode(['success' => true, 'data' => $projectData]);
            break;

            /* Получить сумму расходов по проекту и контрагенту */
            case 'get_contractor_expenses':
                $projectId = $_GET['project_id'] ?? null;
                $contractorId = $_GET['contractor_id'] ?? null;
                
                if (!$projectId) throw new Exception('project_id обязателен');
                if (!$contractorId) throw new Exception('contractor_id обязателен');
                
                $api = getAdeskApi($pdo);
                
                $response = $api->post('transactions', [
                    'range' => 'all_time',
                    'type' => 'outcome',
                    'project' => $projectId,
                    'contractor' => $contractorId,
                    'start' => 0,
                    'length' => 1000
                ]);
                
                $transactions = $response['transactions'] ?? [];
                $totalExpenses = 0;
                
                foreach ($transactions as $transaction) {
                    /* Суммируем только подтверждённые расходы (не плановые) */
                    if (empty($transaction['isPlanned'])) {
                        $totalExpenses += floatval($transaction['amount'] ?? 0);
                    }
                }
                
                echo json_encode([
                    'success' => true, 
                    'data' => [
                        'total' => $totalExpenses,
                        'count' => count($transactions)
                    ]
                ]);
            break;
        
        default:
            throw new Exception('Unknown action');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}