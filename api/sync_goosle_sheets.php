<?php
/* Синхронизация таблицы contracts с Google Sheets
   Запуск: php sync_google_sheets.php
   Или через cron на Timeweb
*/

require_once __DIR__ . '/config.php';

/* URL твоего Google Apps Script — ЗАМЕНИ НА СВОЙ */
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzP7VGTsFd0PsbP0nUpjDUebKzzyljSL6LTTmtP1gmjuWGIVT4nKZcumGgitc2RKkYU/exec';

function logMessage($message) {
    $date = date('Y-m-d H:i:s');
    $logFile = __DIR__ . '/sync_google_sheets.log';
    file_put_contents($logFile, "[$date] $message\n", FILE_APPEND);
    echo "[$date] $message\n";
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

/* Основной код */
try {
    logMessage('Начинаем синхронизацию...');
    
    /* $pdo уже создан в config.php */
    $contracts = getContracts($pdo);
    logMessage('Получено договоров из БД: ' . count($contracts));
    
    $result = sendToGoogleSheets($contracts);
    
    if ($result && $result['success']) {
        logMessage('Успех: ' . $result['message']);
    } else {
        $errorMsg = $result['message'] ?? 'Неизвестная ошибка';
        throw new Exception('Google Sheets ответил ошибкой: ' . $errorMsg);
    }
    
    logMessage('Синхронизация завершена');
    
} catch (Exception $e) {
    logMessage('ОШИБКА: ' . $e->getMessage());
    exit(1);
}