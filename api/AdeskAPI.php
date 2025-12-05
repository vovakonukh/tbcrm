<?php
/**
 * AdeskAPI.php
 * Класс для HTTP-запросов к API Adesk
 */

class AdeskAPI {
    
    private $apiToken;
    private $baseUrl = 'https://api.adesk.ru/v1';
    
    public function __construct($apiToken) {
        $this->apiToken = $apiToken;
    }
    
    /**
     * GET запрос
     */
    public function get($endpoint, $params = []) {
        $params['api_token'] = $this->apiToken;
        $url = "{$this->baseUrl}/{$endpoint}?" . http_build_query($params);
        
        return $this->request($url, 'GET');
    }
    
    /* POST запрос */
    public function post($endpoint, $data = []) {
        $url = "{$this->baseUrl}/{$endpoint}?api_token={$this->apiToken}";
        
        return $this->request($url, 'POST', $data);
    }
    
    /**
     * Выполнение запроса
     */
    private function request($url, $method, $data = null) {
        $ch = curl_init();
        
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30
        ]);
        
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        }
        
        $response = curl_exec($ch);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error) {
            throw new Exception("cURL Error: {$error}");
        }
        
        $result = json_decode($response, true);
        
        if (isset($result['success']) && $result['success'] === false) {
            throw new Exception($result['message'] ?? 'Adesk API Error');
        }
        
        return $result;
    }
    
    /**
     * Получить операции за период
     */
    public function getTransactions($dateFrom, $dateTo, $offset = 0) {
        return $this->post('transactions', [
            'range' => 'custom',
            'range_start' => $dateFrom,
            'range_end' => $dateTo,
            'start' => $offset,
            'length' => 500
        ]);
    }
    
    /**
     * Проверка соединения
     */
    public function testConnection() {
        return $this->get('legal-entities');
    }
}