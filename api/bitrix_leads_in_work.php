<?php
/* bitrix_leads_in_work.php - Получение актуальных данных "В работе" из Битрикс24 с кэшированием
   Возвращает количество лидов и квал.лидов в работе по каждому менеджеру
   Кэш: 10 минут */

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/../lib/crest.php';

define('CACHE_KEY', 'leads_in_work');
define('CACHE_TTL_MINUTES', 10);

/* Получить данные из кэша */
function getFromCache($pdo) {
    $stmt = $pdo->prepare("
        SELECT cache_data FROM bitrix_cache 
        WHERE cache_key = ? AND expires_at > NOW()
    ");
    $stmt->execute([CACHE_KEY]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($row) {
        return json_decode($row['cache_data'], true);
    }
    return null;
}

/* Сохранить данные в кэш */
function saveToCache($pdo, $data) {
    $expiresAt = date('Y-m-d H:i:s', strtotime('+' . CACHE_TTL_MINUTES . ' minutes'));
    
    $stmt = $pdo->prepare("
        INSERT INTO bitrix_cache (cache_key, cache_data, expires_at) 
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE cache_data = VALUES(cache_data), expires_at = VALUES(expires_at)
    ");
    $stmt->execute([CACHE_KEY, json_encode($data), $expiresAt]);
}

/* Получить данные из Битрикс */
function fetchFromBitrix($pdo) {
    /* Получаем активных менеджеров с bitrix_id */
    $managersStmt = $pdo->query("
        SELECT id, bitrix_id FROM managers 
        WHERE is_active = 1 AND bitrix_id IS NOT NULL
    ");
    $managers = $managersStmt->fetchAll(PDO::FETCH_ASSOC);
    
    $result = [];
    
    foreach ($managers as $manager) {
        $managerId = $manager['id'];
        $bitrixId = $manager['bitrix_id'];
        
        $leadsInWork = 0;
        $qualLeadsInWork = 0;
        
        if (!empty($bitrixId)) {
            /* Лидов в работе: STATUS_SEMANTIC_ID = P, UF_CRM_1687959404 (дата взятия в работу) заполнено */
            $leadsResult = CRest::call('crm.lead.list', [
                'filter' => [
                    'ASSIGNED_BY_ID' => $bitrixId,
                    'STATUS_SEMANTIC_ID' => 'P',
                    '!UF_CRM_1687959404' => '',
                    '!=ASSIGNED_BY_ID' => '2150'
                ],
                'select' => ['ID']
            ]);
            if (!isset($leadsResult['error'])) {
                $leadsInWork = $leadsResult['total'] ?? 0;
            }
            
            /* Квал.лидов в работе: сделки из Основной воронки (CATEGORY_ID=0) со статусом "В работе" */
            $dealsResult = CRest::call('crm.deal.list', [
                'filter' => [
                    'ASSIGNED_BY_ID' => $bitrixId,
                    'CATEGORY_ID' => 0,
                    'STAGE_SEMANTIC_ID' => 'P'
                ],
                'select' => ['ID']
            ]);
            if (!isset($dealsResult['error'])) {
                $qualLeadsInWork = $dealsResult['total'] ?? 0;
            }
        }
        
        $result[$managerId] = [
            'leads_in_work' => $leadsInWork,
            'qual_leads_in_work' => $qualLeadsInWork
        ];
    }
    
    return $result;
}

/* Основная логика */
try {
    $forceRefresh = isset($_GET['refresh']) && $_GET['refresh'] === '1';
    
    /* Пробуем получить из кэша */
    $data = null;
    $fromCache = false;
    
    if (!$forceRefresh) {
        $data = getFromCache($pdo);
        if ($data !== null) {
            $fromCache = true;
        }
    }
    
    /* Если кэш пустой или принудительное обновление — запрашиваем Битрикс */
    if ($data === null) {
        $data = fetchFromBitrix($pdo);
        saveToCache($pdo, $data);
    }
    
    echo json_encode([
        'success' => true,
        'data' => $data,
        'from_cache' => $fromCache,
        'cache_ttl_minutes' => CACHE_TTL_MINUTES
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}