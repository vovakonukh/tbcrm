<?php
require_once __DIR__ . '/../api/config.php';
require_once __DIR__ . '/../api/AdeskAPI.php';

$stmt = $pdo->query("SELECT api_token FROM adesk_settings LIMIT 1");
$token = $stmt->fetchColumn();
$api = new AdeskAPI($token);

$response = $api->get('projects', ['status' => 'all', 'with_amounts' => 'true']);

foreach ($response['projects'] ?? [] as $p) {
    if ($p['id'] == 664224) {
        echo "<pre>";
        print_r($p);
        echo "</pre>";
        break;
    }
}