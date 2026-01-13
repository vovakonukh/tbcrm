<?php
/* Синхронизация таблицы contracts с Google Sheets
   Запуск: php sync_google_sheets.php
   Или через cron на Timeweb
*/

require_once __DIR__ . '/config.php';

/* URL твоего Google Apps Script — ЗАМЕНИ НА СВОЙ */
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzP7VGTsFd0PsbP0nUpjDUebKzzyljSL6LTTmtP1gmjuWGIVT4nKZcumGgitc2RKkYU/exec';

$isCli = php_sapi_name() === 'cli';

function logMessage($message) {
    global $isCli;
    if ($isCli) {
        $date = date('Y-m-d H:i:s');
        echo "[$date] $message\n";
    }
}

function jsonResponse($success, $message, $count = null) {
    header('Content-Type: application/json; charset=utf-8');
    $response = ['success' => $success, 'message' => $message];
    if ($count !== null) $response['count'] = $count;
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

function getContracts($pdo) {
    $sql = "SELECT 
                c.id,
                c.contract_name,
                c.contract_amount,
                c.final_amount,
                c.profit
            FROM contracts c
            ORDER BY c.id";
    
    $stmt = $pdo->query($sql);
    $contracts = [];
    
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        
        $contracts[] = [
            'id' => (int)$row['id'],
            'contract_name' => $row['contract_name'],
            'contract_amount' => $row['contract_amount'] ? (float)$row['contract_amount'] : null,
            'final_amount' => $row['final_amount'] ? (float)$row['final_amount'] : null,
            'profit' => $row['profit'] ? (float)$row['profit'] : null
        ];
    }
    
    return $contracts;
}

function sendToGoogleSheets($contracts) {
    $data = json_encode(['contracts' => $contracts], JSON_UNESCAPED_UNICODE);
    
    $ch = curl_init(GOOGLE_SCRIPT_URL);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $data,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 60
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        throw new Exception('CURL ошибка: ' . $error);
    }
    
    if ($httpCode !== 200) {
        throw new Exception('HTTP ошибка: ' . $httpCode);
    }
    
    return json_decode($response, true);
}

//* Основной код */
try {
    logMessage('Начинаем синхронизацию...');
    
    $contracts = getContracts($pdo);
    $count = count($contracts);
    logMessage('Получено договоров из БД: ' . $count);
    
    $result = sendToGoogleSheets($contracts);
    
    if ($result && $result['success']) {
        $message = 'Синхронизировано договоров: ' . $count;
        logMessage('Успех: ' . $result['message']);
        logMessage('Синхронизация завершена');
        
        if (!$isCli) {
            jsonResponse(true, $message, $count);
        }
    } else {
        $errorMsg = $result['message'] ?? 'Неизвестная ошибка';
        throw new Exception('Google Sheets ответил ошибкой: ' . $errorMsg);
    }
    
} catch (Exception $e) {
    logMessage('ОШИБКА: ' . $e->getMessage());
    
    if (!$isCli) {
        jsonResponse(false, $e->getMessage());
    }
    exit(1);
}