<?php
/**
 * AdeskSyncService.php
 * Сервис синхронизации — получает данные из Adesk, сохраняет в БД
 */

require_once __DIR__ . '/AdeskAPI.php';
require_once __DIR__ . '/config.php';

class AdeskSyncService {
    
    private $pdo;
    private $api;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    /**
     * Инициализация API с токеном из БД
     */
    private function initApi() {
        if ($this->api) return;
        
        $stmt = $this->pdo->query("SELECT api_token, is_enabled FROM adesk_settings LIMIT 1");
        $settings = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$settings || !$settings['is_enabled'] || empty($settings['api_token'])) {
            throw new Exception('Интеграция с Adesk не настроена');
        }
        
        $this->api = new AdeskAPI($settings['api_token']);
    }
    
    /**
     * Главный метод — синхронизация операций
     */
    public function syncTransactions($dateFrom, $dateTo) {
        $this->initApi();
        
        $result = ['fetched' => 0, 'created' => 0, 'updated' => 0];
        $offset = 0;
        
        do {
            $response = $this->api->getTransactions($dateFrom, $dateTo, $offset);
            $transactions = $response['transactions'] ?? [];
            
            foreach ($transactions as $t) {
                $saved = $this->saveTransaction($t);
                $result[$saved]++;
                $result['fetched']++;
            }
            
            $offset += count($transactions);
            $hasMore = $offset < ($response['recordsFiltered'] ?? 0);
            
        } while ($hasMore && count($transactions) > 0);
        
        // Обновляем время синхронизации
        $this->pdo->exec("UPDATE adesk_settings SET last_sync_at = NOW()");
        
        return $result;
    }
    
    /**
     * Сохранение одной операции
     */
    private function saveTransaction($t) {
        $adeskId = $t['id'];
        
        // Проверяем, есть ли уже такая запись
        $stmt = $this->pdo->prepare("SELECT id FROM adesk_transactions WHERE adesk_id = ?");
        $stmt->execute([$adeskId]);
        $exists = $stmt->fetch();
        
        // Собираем данные
        $data = [
            'adesk_id' => $adeskId,
            'amount' => floatval($t['amount'] ?? 0),
            'transaction_type' => intval($t['type'] ?? 0),
            'category_name' => $t['category']['name'] ?? null,
            'category_group_name' => $t['category']['group']['name'] ?? null,
            'description' => $t['description'] ?? null,
            'project_id' => $t['project']['id'] ?? null,
            'project_name' => $t['project']['name'] ?? null,
            'business_unit_name' => $t['businessUnit']['name'] ?? null,
            'contractor_name' => $t['contractor']['name'] ?? null,
            'bank_account_name' => $t['bankAccount']['name'] ?? null,
            'transaction_date' => $this->parseDate($t['dateIso'] ?? $t['date'] ?? null)
        ];
        
        if ($exists) {
            // UPDATE
            $sets = [];
            $values = [];
            foreach ($data as $key => $val) {
                if ($key === 'adesk_id') continue;
                $sets[] = "{$key} = ?";
                $values[] = $val;
            }
            $values[] = $adeskId;
            
            $sql = "UPDATE adesk_transactions SET " . implode(', ', $sets) . " WHERE adesk_id = ?";
            $this->pdo->prepare($sql)->execute($values);
            return 'updated';
        } else {
            // INSERT
            $fields = implode(', ', array_keys($data));
            $placeholders = implode(', ', array_fill(0, count($data), '?'));
            
            $sql = "INSERT INTO adesk_transactions ({$fields}) VALUES ({$placeholders})";
            $this->pdo->prepare($sql)->execute(array_values($data));
            return 'created';
        }
    }
    
    /**
     * Парсинг даты
     */
    private function parseDate($dateStr) {
        if (!$dateStr) return null;
        
        // YYYY-MM-DD
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateStr)) {
            return $dateStr;
        }
        
        // DD.MM.YYYY
        if (preg_match('/^(\d{2})\.(\d{2})\.(\d{4})$/', $dateStr, $m)) {
            return "{$m[3]}-{$m[2]}-{$m[1]}";
        }
        
        return null;
    }
    
    /**
     * Проверка подключения
     */
    public function testConnection() {
        $this->initApi();
        $this->api->testConnection();
        return ['success' => true, 'message' => 'Подключение установлено'];
    }
}