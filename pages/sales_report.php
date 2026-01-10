<?php 
require_once __DIR__ . '/../api/check_auth.php'; 
requirePermission('sales_report');
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Отчет по продажам</title>
    <?php include __DIR__ . '/../includes/pwa_head.php'; ?>
    
    <!-- Иконка -->
    <link rel="icon" href="/assets/favicon.ico">
    
    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
    
    <!-- Шрифты и стили -->
    <link href="/frontend/css/fonts.css" rel="stylesheet">
    <link href="/frontend/css/style.css" rel="stylesheet">
    
    <style>
        /* Контейнер карточек с горизонтальной прокруткой */
        .cards-container {
            display: flex;
            gap: 20px;
            overflow-x: auto;
            padding-bottom: 16px;
            scroll-snap-type: x mandatory;
            scrollbar-width: thin;
            scrollbar-color: var(--color-border-dark) var(--color-bg-light);
        }

        .cards-container::-webkit-scrollbar {
            height: 8px;
        }

        .cards-container::-webkit-scrollbar-track {
            background: var(--color-bg-light);
            border-radius: 4px;
        }

        .cards-container::-webkit-scrollbar-thumb {
            background: var(--color-border-dark);
            border-radius: 4px;
        }

        .cards-container::-webkit-scrollbar-thumb:hover {
            background: #adb5bd;
        }

        /* Карточка менеджера */
        .manager-card {
            flex: 0 0 calc(33.333% - 14px);
            min-width: 340px;
            max-width: 420px;
            background: var(--color-bg-white);
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-sm);
            scroll-snap-align: start;
            transition: box-shadow var(--transition-normal);
        }

        .manager-card:hover {
            box-shadow: var(--shadow-md);
        }

        /* Шапка карточки */
        .card-header {
            padding: 20px;
            border-bottom: 1px solid var(--color-border);
        }

        .manager-name {
            font-size: 18px;
            font-weight: var(--font-weight-bold);
            color: var(--color-text);
            margin: 0;
        }

        /* Тело карточки */
        .card-body {
            padding: 16px 20px;
        }

        /* Секция метрик */
        .metrics-section {
            margin-bottom: 16px;
        }

        .metrics-section:last-child {
            margin-bottom: 0;
        }

        .section-title {
            font-size: 15px;
            font-weight: var(--font-weight-bold);
            color: var(--color-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 20px;
            margin-bottom: 10px;
            padding-bottom: 6px;
            border-bottom: 1px solid var(--color-border);
        }

        /* Строка метрики */
        .metric-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #f1f3f5;
        }

        .metric-row:last-child {
            border-bottom: none;
        }

        .metric-label {
            font-size: 15px;
            color: var(--color-text-secondary);
        }

        .metric-value {
            font-size: 16px;
            font-weight: var(--font-weight-bold);
            color: var(--color-text);
        }

        .metric-value.positive {
            color: var(--color-success);
        }

        /* Главные KPI */
        .main-kpi {
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
        }

        .kpi-item {
            flex: 1;
            text-align: center;
            padding: 12px;
            background: var(--color-bg-light);
            border-radius: var(--radius-md);
        }

        .kpi-value {
            font-size: 20px;
            font-weight: var(--font-weight-bold);
            color: var(--color-text);
            margin-bottom: 4px;
        }

        .kpi-label {
            font-size: 13px;
            color: var(--color-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        /* Блок Всего */
        .summary-section {
            background: linear-gradient(135deg, #339af0 0%, #228be6 100%);
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-sm);
            padding: 24px;
            margin-bottom: 24px;
            color: white;
        }

        .summary-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 16px;
        }

        .summary-title {
            font-size: 20px;
            font-weight: var(--font-weight-bold);
            margin: 0 0 4px 0;
        }

        .summary-subtitle {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.8);
        }

        .summary-metrics {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0;
        }

        .summary-metrics-group {
            padding: 16px 20px;
            background: rgba(255, 255, 255, 0.08);
            border-radius: var(--radius-md);
            margin: 0 6px;
        }

        .summary-metrics-group:first-child {
            margin-left: 0;
        }

        .summary-metrics-group:last-child {
            margin-right: 0;
        }

        .summary-group-title {
            font-size: 14px;
            font-weight: var(--font-weight-bold);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: rgba(255, 255, 255, 0.9);
            padding-bottom: 10px;
            margin-bottom: 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.15);
        }

        .summary-metric-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0;
        }

        .summary-metric-label {
            font-size: 15px;
            color: rgba(255, 255, 255, 0.75);
        }

        .summary-metric-value {
            font-size: 14px;
            font-weight: var(--font-weight-bold);
        }

        .summary-main-kpi {
            display: flex;
            gap: 12px;
            margin-bottom: 20px;
        }

        .summary-kpi-item {
            flex: 1;
            text-align: center;
            padding: 16px 12px;
            background: rgba(255, 255, 255, 0.15);
            border-radius: var(--radius-md);
        }

        .summary-kpi-value {
            font-size: 18px;
            font-weight: var(--font-weight-bold);
            margin-bottom: 4px;
            white-space: nowrap;
        }

        .summary-kpi-label {
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            color: rgba(255, 255, 255, 0.8);
        }

        /* Bar Chart секция */
        .bar-chart-section {
            background: var(--color-bg-white);
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-sm);
            padding: 20px;
            margin-bottom: 24px;
        }

        .bar-chart-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }

        .bar-chart-title {
            font-size: 16px;
            font-weight: var(--font-weight-bold);
            color: var(--color-text);
            margin: 0;
        }

        .bar-chart-year {
            font-size: 14px;
            color: var(--color-text-muted);
            background: var(--color-bg-light);
            padding: 4px 12px;
            border-radius: var(--radius-sm);
        }

        .bar-chart-container {
            position: relative;
            height: 280px;
        }

        /* Подсказка прокрутки */
        .scroll-hint {
            display: none;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: var(--color-text-muted);
            margin-bottom: 12px;
        }

        .scroll-hint svg {
            animation: bounceRight 1s ease-in-out infinite;
        }

        @keyframes bounceRight {
            0%, 100% { transform: translateX(0); }
            50% { transform: translateX(4px); }
        }

        /* Индикатор загрузки */
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }

        .loading-overlay.hidden {
            display: none;
        }

        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--color-border);
            border-top-color: var(--color-primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* Адаптив */
        @media (max-width: 900px) {
            .summary-metrics {
                grid-template-columns: 1fr;
                gap: 12px;
            }
            
            .summary-metrics-group {
                margin: 0;
            }
        }

        @media (max-width: 768px) {
            .manager-card {
                flex: 0 0 calc(85vw);
                min-width: 300px;
            }

            .main-kpi {
                flex-direction: column;
                gap: 8px;
            }

            .scroll-hint {
                display: flex;
            }

            .summary-main-kpi {
                flex-wrap: wrap;
            }

            .summary-kpi-item {
                flex: 1 1 45%;
            }
        }

        @media (max-width: 1200px) {
            .scroll-hint {
                display: flex;
            }
        }

        /* Переопределяем стиль пункта "Любой" - как обычный пункт */
        .select-filter-item.clear-option:hover {
            color: var(--color-text-secondary);
            background-color: var(--color-bg-light);
        }
    </style>
</head>
<body>
    <?php include __DIR__ . '/../includes/header.php'; ?>

    <!-- Индикатор загрузки -->
    <div class="loading-overlay" id="loading-overlay">
        <div class="loading-spinner"></div>
    </div>

    <div class="container">
        <!-- Панель управления с фильтрами периода -->
        <div class="date-filters" style="margin-top: 20px;">
            <div class="filter-group">
                <button class="filter-btn filter-btn-select" id="filter-start" data-field="month_start">Начало <span class="filter-value"></span></button>
                <button class="filter-btn filter-btn-select" id="filter-end" data-field="month_end">Конец <span class="filter-value"></span></button>
                <button class="filter-btn filter-btn-select" id="filter-year" data-field="year">Год <span class="filter-value"></span></button>
            </div>
        </div>
        
        <!-- Модалка выпадающего фильтра -->
        <div id="select-filter-modal" class="modal" style="display: none;">
            <div class="modal-content">
                <div class="modal-body">
                    <div class="select-filter-list"></div>
                </div>
            </div>
        </div>

        <!-- Блок Всего -->
        <div class="summary-section" id="summary-section">
            <!-- Генерируется JavaScript -->
        </div>

        <!-- Столбчатая диаграмма по месяцам -->
        <div class="bar-chart-section">
            <div class="bar-chart-header">
                <h2 class="bar-chart-title">Продажи по месяцам</h2>
                <span class="bar-chart-year" id="chart-year"></span>
            </div>
            <div class="bar-chart-container">
                <canvas id="sales-bar-chart"></canvas>
            </div>
        </div>

        <div class="scroll-hint">
            <span>Прокрутите для просмотра</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>

        <!-- Карточки менеджеров -->
        <div class="cards-container" id="cards-container">
            <!-- Карточки генерируются JavaScript -->
        </div>
    </div>
    
    <!-- Конфигурация API -->
    <script src="/frontend/js/config.js"></script>
    
    <script src="/frontend/js/modules/SalesReport.js"></script>
</body>
</html>