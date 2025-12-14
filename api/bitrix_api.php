<?php
/* API для работы с Битрикс24 */

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../lib/crest.php';
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

/* GET запрос - получение данных из Битрикс24 */
if ($method == 'GET') {
    
    /* Подсчёт встреч за месяц */
    if ($action === 'meetings_count') {
        $year = $_GET['year'] ?? null;
        $month = $_GET['month'] ?? null;
        
        if (!$year || !$month) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Не указаны year и month"]);
            exit;
        }
        
        /* Формируем диапазон дат для фильтра */
        $startDate = sprintf("%04d-%02d-01", $year, $month);
        $endDate = date("Y-m-t", strtotime($startDate)); /* Последний день месяца */
        
        /* Запрашиваем сделки из двух воронок с фильтром по дате встречи
           CATEGORY_ID = 0 (Основная воронка)
           CATEGORY_ID = 10 (Перспектива)
           UF_CRM_1669280228 - поле "Дата встречи" */
        
        $totalCount = 0;
        $categories = [0, 10]; /* Основная воронка и Перспектива */
        
        foreach ($categories as $categoryId) {
            $result = CRest::call('crm.deal.list', [
                'filter' => [
                    'CATEGORY_ID' => $categoryId,
                    '>=UF_CRM_1669280228' => $startDate,
                    '<=UF_CRM_1669280228' => $endDate
                ],
                'select' => ['ID']
            ]);
            
            if (isset($result['error'])) {
                http_response_code(500);
                echo json_encode([
                    "success" => false, 
                    "error" => "Ошибка Битрикс24: " . ($result['error_description'] ?? $result['error'])
                ]);
                exit;
            }
            
            /* total - общее количество записей, соответствующих фильтру */
            $totalCount += $result['total'] ?? 0;
        }
        
        echo json_encode([
            "success" => true,
            "value" => $totalCount,
            "period" => "$startDate — $endDate",
            "debug" => [
                "categories" => $categories,
                "filter_field" => "UF_CRM_1669280228"
            ]
        ]);
        exit;
    }
    
    /* Неизвестный action */
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Unknown action: $action"]);
}

else {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Method not allowed"]);
}
?>