<?php
/* Скрипт для получения всех полей лида из Битрикс24 */

header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/lib/crest.php';

$leadId = 87526;

/* Получаем лид со всеми полями */
$result = CRest::call('crm.lead.get', [
    'id' => $leadId
]);

if (isset($result['error'])) {
    echo json_encode([
        'success' => false,
        'error' => $result['error'],
        'error_description' => $result['error_description'] ?? ''
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode([
    'success' => true,
    'lead_id' => $leadId,
    'fields' => $result['result'],
    'hint' => 'Ищем поле со значением даты 2025-11-24 или 24.11.2025'
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);