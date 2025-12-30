<?php
/* sync_sales_bitrix.php - Синхронизация данных из Битрикс24 в sales_report
   Использование:
   - Через браузер/AJAX: /api/sync_sales_bitrix.php?month=12&year=2025
   - Через cron: php /path/to/api/sync_sales_bitrix.php
   
   Параметры (опционально):
   - month: месяц (1-12), по умолчанию текущий
   - year: год, по умолчанию текущий
   
   Логика работы:
   1. Получает список активных менеджеров с bitrix_id
   2. Для каждого менеджера запрашивает данные из Битрикс
   3. Если данные есть и строки нет — создаёт строку
   4. Если данных нет и строки нет — пропускает менеджера
   5. Обновляет строку в sales_report */

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');

/* Определяем режим запуска (CLI или HTTP) */
$isCli = php_sapi_name() === 'cli';

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/../lib/crest.php';

/* Получаем параметры */
if ($isCli) {
    $options = getopt('', ['month::', 'year::']);
    $month = isset($options['month']) ? (int)$options['month'] : (int)date('n');
    $year = isset($options['year']) ? (int)$options['year'] : (int)date('Y');
} else {
    $month = isset($_GET['month']) ? (int)$_GET['month'] : (int)date('n');
    $year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');
}

/* Валидация */
if ($month < 1 || $month > 12) $month = (int)date('n');
if ($year < 2020 || $year > 2030) $year = (int)date('Y');

/* Формируем даты периода */
$startDate = sprintf('%04d-%02d-01', $year, $month);
$endDate = date('Y-m-t', strtotime($startDate));

$results = [
    'success' => true,
    'period' => [
        'month' => $month,
        'year' => $year,
        'start_date' => $startDate,
        'end_date' => $endDate
    ],
    'managers_processed' => 0,
    'managers_skipped' => 0,
    'rows_created' => 0,
    'rows_updated' => 0,
    'errors' => [],
    'details' => []
];

try {
    /* 1. Получаем активных менеджеров с bitrix_id */
    $managersStmt = $pdo->query("
        SELECT id, name, bitrix_id 
        FROM managers 
        WHERE is_active = 1 
        ORDER BY name
    ");
    $managers = $managersStmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($managers)) {
        throw new Exception("Нет активных менеджеров в базе данных");
    }

    /* 2. Обрабатываем каждого менеджера */
    foreach ($managers as $manager) {
        $managerId = $manager['id'];
        $managerName = $manager['name'];
        $bitrixId = $manager['bitrix_id'];
        
        $managerResult = [
            'manager_id' => $managerId,
            'name' => $managerName,
            'bitrix_id' => $bitrixId,
            'action' => null,
            'data' => null
        ];

        try {
            /* 2.1 Получаем данные из Битрикс */
            $bitrixData = [
                'target_leads' => 0,
                'qual_leads' => 0,
                'meetings' => 0
            ];

            if (!empty($bitrixId)) {
                $filterStart = $startDate . 'T00:00:00';
                $filterEnd = $endDate . 'T23:59:59';

                /* Целевые лиды - по дате взятия в работу */
                $targetLeadsResult = CRest::call('crm.lead.list', [
                    'filter' => [
                        'ASSIGNED_BY_ID' => $bitrixId,
                        '>=UF_CRM_1687959404' => $filterStart,
                        '<=UF_CRM_1687959404' => $filterEnd,
                        '!=ASSIGNED_BY_ID' => '2150'
                    ],
                    'select' => ['ID']
                ]);
                if (!isset($targetLeadsResult['error'])) {
                    $bitrixData['target_leads'] = $targetLeadsResult['total'] ?? 0;
                }

                /* Квал. лиды - сделки из Основной воронки по дате создания */
                $qualLeadsResult = CRest::call('crm.deal.list', [
                    'filter' => [
                        'ASSIGNED_BY_ID' => $bitrixId,
                        'CATEGORY_ID' => 0,
                        '>=DATE_CREATE' => $filterStart,
                        '<=DATE_CREATE' => $filterEnd
                    ],
                    'select' => ['ID']
                ]);
                if (!isset($qualLeadsResult['error'])) {
                    $bitrixData['qual_leads'] = $qualLeadsResult['total'] ?? 0;
                }

                /* Встречи - сделки с датой встречи из двух воронок */
                $categories = [0, 10];
                $meetingsTotal = 0;
                foreach ($categories as $categoryId) {
                    $meetingsResult = CRest::call('crm.deal.list', [
                        'filter' => [
                            'ASSIGNED_BY_ID' => $bitrixId,
                            'CATEGORY_ID' => $categoryId,
                            '>=UF_CRM_1669280228' => $startDate,
                            '<=UF_CRM_1669280228' => $endDate
                        ],
                        'select' => ['ID']
                    ]);
                    if (!isset($meetingsResult['error'])) {
                        $meetingsTotal += $meetingsResult['total'] ?? 0;
                    }
                }
                $bitrixData['meetings'] = $meetingsTotal;
            }

            /* 2.2 Проверяем, есть ли данные для сохранения */
            $hasData = $bitrixData['target_leads'] > 0 
                    || $bitrixData['qual_leads'] > 0 
                    || $bitrixData['meetings'] > 0;

            /* 2.3 Проверяем существование строки в sales_report */
            $checkStmt = $pdo->prepare("
                SELECT id FROM sales_report 
                WHERE manager_id = ? AND month = ? AND year = ?
            ");
            $checkStmt->execute([$managerId, $month, $year]);
            $existingRow = $checkStmt->fetch(PDO::FETCH_ASSOC);

            /* Если строки нет и данных нет — пропускаем менеджера */
            if (!$existingRow && !$hasData) {
                $managerResult['action'] = 'skipped';
                $managerResult['data'] = $bitrixData;
                $results['managers_skipped']++;
                $results['details'][] = $managerResult;
                continue;
            }

            /* Если строки нет, но данные есть — создаём */
            if (!$existingRow) {
                $insertStmt = $pdo->prepare("
                    INSERT INTO sales_report (manager_id, month, year) 
                    VALUES (?, ?, ?)
                ");
                $insertStmt->execute([$managerId, $month, $year]);
                $rowId = $pdo->lastInsertId();
                $results['rows_created']++;
                $managerResult['action'] = 'created';
            } else {
                $rowId = $existingRow['id'];
                $managerResult['action'] = 'updated';
            }

            /* 2.4 Обновляем строку в sales_report (только данные Битрикс) */
            $updateStmt = $pdo->prepare("
                UPDATE sales_report SET 
                    target_leads_new = ?,
                    qual_leads_new = ?,
                    meetings_new = ?
                WHERE id = ?
            ");
            $updateStmt->execute([
                $bitrixData['target_leads'],
                $bitrixData['qual_leads'],
                $bitrixData['meetings'],
                $rowId
            ]);

            if ($managerResult['action'] === 'updated') {
                $results['rows_updated']++;
            }

            $managerResult['data'] = $bitrixData;
            $results['managers_processed']++;

        } catch (Exception $e) {
            $managerResult['error'] = $e->getMessage();
            $results['errors'][] = "Менеджер {$managerName}: " . $e->getMessage();
        }

        $results['details'][] = $managerResult;
    }

} catch (Exception $e) {
    $results['success'] = false;
    $results['errors'][] = $e->getMessage();
}

/* Вывод результата */
if ($isCli) {
    echo "=== Синхронизация sales_report из Битрикс24 ===\n";
    echo "Период: {$results['period']['month']}/{$results['period']['year']} ({$startDate} — {$endDate})\n";
    echo "Обработано менеджеров: {$results['managers_processed']}\n";
    echo "Пропущено (нет данных): {$results['managers_skipped']}\n";
    echo "Создано строк: {$results['rows_created']}\n";
    echo "Обновлено строк: {$results['rows_updated']}\n";
    
    if (!empty($results['errors'])) {
        echo "\nОшибки:\n";
        foreach ($results['errors'] as $error) {
            echo "  - {$error}\n";
        }
    }
    
    echo "\nДетали:\n";
    foreach ($results['details'] as $detail) {
        $action = $detail['action'] ?? '-';
        if (isset($detail['error'])) {
            $status = 'ОШИБКА';
        } elseif ($action === 'skipped') {
            $status = 'ПРОПУЩЕН';
        } else {
            $status = 'OK';
        }
        $data = $detail['data'] ?? [];
        echo sprintf(
            "  %s: %s | Лиды: %d, Квал: %d, Встречи: %d [%s]\n",
            $detail['name'],
            $action,
            $data['target_leads'] ?? 0,
            $data['qual_leads'] ?? 0,
            $data['meetings'] ?? 0,
            $status
        );
    }
} else {
    echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
?>