<?php
/* sales_report_api.php - API для дашборда отчёта по продажам
   Пункт 2: Прибыль, выручка и кол-во договоров берутся напрямую из contracts
   Лиды и встречи — из sales_report (данные Битрикс) */

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Method not allowed"]);
    exit;
}

try {
    /* Получаем параметры фильтра (по умолчанию - текущий месяц и год) */
    $currentMonth = (int)date('n');
    $currentYear = (int)date('Y');
    
    $year = isset($_GET['year']) ? (int)$_GET['year'] : $currentYear;
    $monthStart = isset($_GET['month_start']) ? (int)$_GET['month_start'] : $currentMonth;
    $monthEnd = isset($_GET['month_end']) ? (int)$_GET['month_end'] : $currentMonth;
    
    /* Валидация */
    if ($monthStart < 1 || $monthStart > 12) $monthStart = 1;
    if ($monthEnd < 1 || $monthEnd > 12) $monthEnd = 12;
    if ($monthStart > $monthEnd) {
        $tmp = $monthStart;
        $monthStart = $monthEnd;
        $monthEnd = $tmp;
    }

    /* Формируем даты для фильтрации contracts */
    $startDate = sprintf('%04d-%02d-01', $year, $monthStart);
    $endDate = date('Y-m-t', strtotime(sprintf('%04d-%02d-01', $year, $monthEnd)));

    /* 1. Получаем данные из contracts (прибыль, выручка, кол-во договоров) напрямую */
    $contractsStmt = $pdo->prepare("
        SELECT 
            manager_id,
            SUM(COALESCE(final_amount, contract_amount, 0)) as revenue,
            SUM(COALESCE(profit, 0)) as profit,
            COUNT(*) as contracts_new
        FROM contracts
        WHERE contract_date BETWEEN ? AND ?
            AND manager_id IS NOT NULL
        GROUP BY manager_id
    ");
    $contractsStmt->execute([$startDate, $endDate]);
    $contractsData = $contractsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    /* Индексируем по manager_id для быстрого доступа */
    $contractsByManager = [];
    foreach ($contractsData as $row) {
        $contractsByManager[$row['manager_id']] = $row;
    }

    /* 2. Получаем данные из sales_report (лиды, встречи из Битрикс) */
    $salesStmt = $pdo->prepare("
        SELECT 
            manager_id,
            SUM(COALESCE(target_leads_new, 0)) as target_leads_new,
            SUM(COALESCE(qual_leads_new, 0)) as qual_leads_new,
            SUM(COALESCE(meetings_new, 0)) as meetings_new,
            SUM(COALESCE(leads_in_work, 0)) as leads_in_work,
            SUM(COALESCE(qual_leads_in_work, 0)) as qual_leads_in_work
        FROM sales_report
        WHERE year = ? 
            AND month BETWEEN ? AND ?
        GROUP BY manager_id
    ");
    $salesStmt->execute([$year, $monthStart, $monthEnd]);
    $salesData = $salesStmt->fetchAll(PDO::FETCH_ASSOC);
    
    /* Индексируем по manager_id */
    $salesByManager = [];
    foreach ($salesData as $row) {
        $salesByManager[$row['manager_id']] = $row;
    }

    /* 3. Собираем уникальных менеджеров из обоих источников */
    $allManagerIds = array_unique(array_merge(
        array_keys($contractsByManager),
        array_keys($salesByManager)
    ));

    /* 4. Получаем имена менеджеров */
    if (!empty($allManagerIds)) {
        $placeholders = implode(',', array_fill(0, count($allManagerIds), '?'));
        $managersStmt = $pdo->prepare("SELECT id, name FROM managers WHERE id IN ($placeholders)");
        $managersStmt->execute(array_values($allManagerIds));
        $managersNames = $managersStmt->fetchAll(PDO::FETCH_KEY_PAIR);
    } else {
        $managersNames = [];
    }

    /* 5. Формируем итоговые данные по менеджерам */
    $managers = [];
    $totals = [
        'revenue' => 0,
        'profit' => 0,
        'contracts_new' => 0,
        'target_leads_new' => 0,
        'qual_leads_new' => 0,
        'meetings_new' => 0
    ];

    foreach ($allManagerIds as $managerId) {
        /* Данные из contracts */
        $cData = $contractsByManager[$managerId] ?? ['revenue' => 0, 'profit' => 0, 'contracts_new' => 0];
        /* Данные из sales_report (Битрикс) */
        $sData = $salesByManager[$managerId] ?? ['target_leads_new' => 0, 'qual_leads_new' => 0, 'meetings_new' => 0];

        $revenue = (float)$cData['revenue'];
        $profit = (float)$cData['profit'];
        $contracts = (int)$cData['contracts_new'];
        $targetLeads = (int)$sData['target_leads_new'];
        $qualLeads = (int)$sData['qual_leads_new'];
        $meetings = (int)$sData['meetings_new'];

        /* Расчёт конверсий */
        $convTargetToQual = $targetLeads > 0 ? ($qualLeads / $targetLeads) * 100 : 0;
        $convQualToMeeting = $qualLeads > 0 ? ($meetings / $qualLeads) * 100 : 0;
        $convMeetingToContract = $meetings > 0 ? ($contracts / $meetings) * 100 : 0;
        
        /* Средний чек и маржинальность */
        $avgCheck = $contracts > 0 ? $revenue / $contracts : 0;
        $margin = $revenue > 0 ? ($profit / $revenue) * 100 : 0;

        /* Лиды в работе - из sales_report (последняя синхронизация с Битрикс) */
        $leadsInWork = (int)($sData['leads_in_work'] ?? 0);
        $qualLeadsInWork = (int)($sData['qual_leads_in_work'] ?? 0);

        $managers[] = [
            'manager_id' => (int)$managerId,
            'name' => $managersNames[$managerId] ?? 'Неизвестный',
            'revenue' => $revenue,
            'profit' => $profit,
            'contracts_new' => $contracts,
            'target_leads_new' => $targetLeads,
            'qual_leads_new' => $qualLeads,
            'meetings_new' => $meetings,
            'conv_target_to_qual' => round($convTargetToQual, 1),
            'conv_qual_to_meeting' => round($convQualToMeeting, 1),
            'conv_meeting_to_contract' => round($convMeetingToContract, 1),
            'avg_check' => round($avgCheck),
            'margin' => round($margin, 1),
            'leads_in_work' => $leadsInWork,
            'qual_leads_in_work' => $qualLeadsInWork
        ];

        /* Суммируем для итогов */
        $totals['revenue'] += $revenue;
        $totals['profit'] += $profit;
        $totals['contracts_new'] += $contracts;
        $totals['target_leads_new'] += $targetLeads;
        $totals['qual_leads_new'] += $qualLeads;
        $totals['meetings_new'] += $meetings;
    }

    /* Сортируем по кол-ву договоров (убывание) */
    usort($managers, function($a, $b) {
        return $b['contracts_new'] - $a['contracts_new'];
    });

    /* 6. Расчёт итоговых показателей */
    $totalLeadsInWork = 0;
    $totalQualLeadsInWork = 0;
    foreach ($managers as $m) {
        $totalLeadsInWork += $m['leads_in_work'];
        $totalQualLeadsInWork += $m['qual_leads_in_work'];
    }

    $summary = [
        'revenue' => $totals['revenue'],
        'profit' => $totals['profit'],
        'contracts_new' => $totals['contracts_new'],
        'target_leads_new' => $totals['target_leads_new'],
        'qual_leads_new' => $totals['qual_leads_new'],
        'meetings_new' => $totals['meetings_new'],
        'conv_target_to_qual' => $totals['target_leads_new'] > 0 
            ? round(($totals['qual_leads_new'] / $totals['target_leads_new']) * 100, 1) : 0,
        'conv_qual_to_meeting' => $totals['qual_leads_new'] > 0 
            ? round(($totals['meetings_new'] / $totals['qual_leads_new']) * 100, 1) : 0,
        'conv_meeting_to_contract' => $totals['meetings_new'] > 0 
            ? round(($totals['contracts_new'] / $totals['meetings_new']) * 100, 1) : 0,
        'avg_check' => $totals['contracts_new'] > 0 
            ? round($totals['revenue'] / $totals['contracts_new']) : 0,
        'margin' => $totals['revenue'] > 0 
            ? round(($totals['profit'] / $totals['revenue']) * 100, 1) : 0,
        'leads_in_work' => $totalLeadsInWork,
        'qual_leads_in_work' => $totalQualLeadsInWork
    ];

    /* 7. Получаем данные для графика (выручка по месяцам из contracts) */
    $chartStmt = $pdo->prepare("
        SELECT 
            c.manager_id,
            m.name as manager_name,
            MONTH(c.contract_date) as month,
            SUM(COALESCE(c.final_amount, c.contract_amount, 0)) as revenue
        FROM contracts c
        INNER JOIN managers m ON m.id = c.manager_id
        WHERE YEAR(c.contract_date) = ?
            AND c.manager_id IS NOT NULL
        GROUP BY c.manager_id, m.name, MONTH(c.contract_date)
        ORDER BY m.name, month
    ");
    $chartStmt->execute([$year]);
    $chartRows = $chartStmt->fetchAll(PDO::FETCH_ASSOC);

    /* Формируем данные для графика */
    $chartData = [];
    foreach ($chartRows as $row) {
        $managerId = $row['manager_id'];
        if (!isset($chartData[$managerId])) {
            $chartData[$managerId] = [
                'name' => $row['manager_name'],
                'data' => array_fill(0, 12, null)
            ];
        }
        if ($row['month'] !== null) {
            $chartData[$managerId]['data'][$row['month'] - 1] = (float)$row['revenue'];
        }
    }

    /* 8. Получаем доступные годы для фильтра (из contracts, не из sales_report) */
    $yearsStmt = $pdo->query("
        SELECT DISTINCT YEAR(contract_date) as year 
        FROM contracts 
        WHERE contract_date IS NOT NULL 
        ORDER BY year DESC
    ");
    $years = $yearsStmt->fetchAll(PDO::FETCH_COLUMN);
    
    /* Если нет данных, добавляем текущий год */
    if (empty($years)) {
        $years = [date('Y')];
    }

    echo json_encode([
        "success" => true,
        "summary" => $summary,
        "managers" => $managers,
        "chart_data" => array_values($chartData),
        "years" => $years,
        "filter" => [
            "year" => $year,
            "month_start" => $monthStart,
            "month_end" => $monthEnd
        ]
    ]);

} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Database error: " . $e->getMessage()
    ]);
}
?>