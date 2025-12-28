<?php
/* sales_report_api.php - API для дашборда отчёта по продажам */

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

    /* 1. Получаем агрегированные данные только по менеджерам с записями в sales_report */
    $stmt = $pdo->prepare("
        SELECT 
            m.id as manager_id,
            m.name as manager_name,
            SUM(sr.revenue) as revenue,
            SUM(sr.profit) as profit,
            SUM(sr.contracts_new) as contracts_new,
            SUM(sr.target_leads_new) as target_leads_new,
            SUM(sr.qual_leads_new) as qual_leads_new,
            SUM(sr.meetings_new) as meetings_new
        FROM sales_report sr
        INNER JOIN managers m ON m.id = sr.manager_id
        WHERE sr.year = ? 
            AND sr.month BETWEEN ? AND ?
        GROUP BY m.id, m.name
        ORDER BY contracts_new DESC
    ");
    $stmt->execute([$year, $monthStart, $monthEnd]);
    $managersData = $stmt->fetchAll(PDO::FETCH_ASSOC);

    /* 2. Формируем данные по менеджерам с расчётом конверсий */
    $managers = [];
    $totals = [
        'revenue' => 0,
        'profit' => 0,
        'contracts_new' => 0,
        'target_leads_new' => 0,
        'qual_leads_new' => 0,
        'meetings_new' => 0
    ];

    foreach ($managersData as $row) {
        $revenue = (float)($row['revenue'] ?? 0);
        $profit = (float)($row['profit'] ?? 0);
        $contracts = (int)($row['contracts_new'] ?? 0);
        $targetLeads = (int)($row['target_leads_new'] ?? 0);
        $qualLeads = (int)($row['qual_leads_new'] ?? 0);
        $meetings = (int)($row['meetings_new'] ?? 0);

        /* Расчёт конверсий */
        $convTargetToQual = $targetLeads > 0 ? ($qualLeads / $targetLeads) * 100 : 0;
        $convQualToMeeting = $qualLeads > 0 ? ($meetings / $qualLeads) * 100 : 0;
        $convMeetingToContract = $meetings > 0 ? ($contracts / $meetings) * 100 : 0;
        
        /* Средний чек и маржинальность */
        $avgCheck = $contracts > 0 ? $revenue / $contracts : 0;
        $margin = $revenue > 0 ? ($profit / $revenue) * 100 : 0;

        /* Лиды в работе - рандомные данные привязанные к manager_id */
        /* Используем manager_id как seed для стабильности в рамках сессии */
        srand($row['manager_id'] * 1000 + date('Ymd'));
        $leadsInWork = rand(15, 50);
        $qualLeadsInWork = rand(5, min(25, $leadsInWork));
        srand(); /* Сбрасываем seed */

        $managers[] = [
            'manager_id' => (int)$row['manager_id'],
            'name' => $row['manager_name'],
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

    /* 3. Расчёт итоговых показателей */
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

    /* 4. Получаем данные для графика (все месяцы выбранного года) */
    $chartStmt = $pdo->prepare("
        SELECT 
            m.id as manager_id,
            m.name as manager_name,
            sr.month,
            sr.revenue
        FROM sales_report sr
        INNER JOIN managers m ON m.id = sr.manager_id
        WHERE sr.year = ?
        ORDER BY m.name, sr.month
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
                'data' => array_fill(0, 12, null) /* 12 месяцев, null по умолчанию */
            ];
        }
        if ($row['month'] !== null) {
            $chartData[$managerId]['data'][$row['month'] - 1] = (float)$row['revenue'];
        }
    }

    /* 5. Получаем доступные годы для фильтра */
    $yearsStmt = $pdo->query("SELECT DISTINCT year FROM sales_report ORDER BY year DESC");
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