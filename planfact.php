<?php require_once 'api/check_auth.php'; ?>

<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Планфакт</title>
    <?php include 'pwa_head.php'; ?>
    <link rel="icon" href="/assets/favicon.ico">
    <link href="https://unpkg.com/tabulator-tables@6.3.0/dist/css/tabulator.min.css" rel="stylesheet">
    <link href="frontend/css/style.css?v=1.3" rel="stylesheet">
    <link href="frontend/css/fonts.css" rel="stylesheet">
</head>
<body>
    <?php include 'header.php'; ?>
    <div class="container">
        <div class="controls">
            <button id="add-contract-btn"><img src="/assets/plus.svg"/> Добавить</button>
            <button id="refresh-btn"><img src="/assets/refresh.svg"/>Обновить</button>
            <button id="toggle-columns-btn"><img src="/assets/control.svg"/>Настройки</button>
        </div>
        
        <!-- Фильтры по датам -->
        <div class="date-filters">
            <div class="filter-group">
                <button class="filter-btn" data-field="date">Дата</button>
            </div>
        </div>

        <div id="planfact-table"></div>
        <div id="loading">Загрузка данных...</div>
        <div id="error" class="error-message" style="display: none;"></div>
    </div>

    <!-- Модальное окно фильтра по дате -->
    <div id="date-filter-modal" class="modal" style="display: none;">
        <div class="modal-content">
            <div class="modal-body">
                <div class="date-range-picker">
                    <div class="date-inputs">
                        <div class="date-input-group">
                            <label for="start-date">Начало периода</label>
                            <input type="date" id="start-date" class="date-input">
                        </div>
                        <div class="date-input-group">
                            <label for="end-date">Конец периода</label>
                            <input type="date" id="end-date" class="date-input">
                        </div>
                    </div>
                    <div class="quick-dates">
                        <button class="quick-date-btn" data-period="this-month">Этот месяц</button>
                        <button class="quick-date-btn" data-period="this-quarter">Этот квартал</button>
                        <button class="quick-date-btn" data-period="this-year">Этот год</button>
                        <button class="quick-date-btn" data-period="last-month">Прошлый месяц</button>
                        <button class="quick-date-btn" data-period="last-30-days">Прошлые 30 дней</button>
                        <button class="quick-date-btn" data-period="last-quarter">Прошлый квартал</button>
                        <button class="quick-date-btn" data-period="last-90-days">Прошлые 90 дней</button>
                        <button class="quick-date-btn" data-period="last-year">Прошлый год</button>
                        <button class="quick-date-btn" data-period="last-365-days">Прошлые 365 дней</button>
                        <button class="quick-date-btn" data-period="all-time">Всё время</button>
                    </div>
                </div>
                <div class="modal-actions">
                    <button id="apply-date-filter">Применить</button>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/luxon/build/global/luxon.min.js"></script>
    <script src="https://unpkg.com/tabulator-tables@6.3.0/dist/js/tabulator.min.js"></script>
    <script src="frontend/js/config.js"></script>
    <script src="frontend/js/core/UserService.js"></script>
    <script type="module">
        import { PlanfactTable } from './frontend/js/modules/Planfact.js?v=1.0.0';
        document.addEventListener('DOMContentLoaded', function() {
            window.planfactTableInstance = new PlanfactTable();
        });
    </script>
    <script src="/frontend/js/pwa.js"></script>
</body>
</html>