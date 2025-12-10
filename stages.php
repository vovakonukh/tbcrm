<?php require_once 'api/check_auth.php'; ?>

<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Этапы работ - Tabulator Table</title>
    <link href="https://unpkg.com/tabulator-tables@6.3.0/dist/css/tabulator.min.css" rel="stylesheet">
    <link href="frontend/css/style.css?v=1.2" rel="stylesheet">
    <link href="frontend/css/fonts.css" rel="stylesheet">
</head>
<body>
    <?php include 'header.php'; ?>
    <div class="container">
        <div class="controls">
            <button id="add-contract-btn"><img src="/assets/plus.svg"/></button>
            <button id="refresh-btn"><img src="/assets/refresh.svg"/></button>
            <button id="toggle-columns-btn"><img src="/assets/control.svg"/></button>
            <button id="save-all-btn"><img src="/assets/save.svg"/></button>
            <!-- <button id="debug-btn">Отладка</button> -->
        </div>
        
        <!-- Фильтры по датам -->
        <div class="date-filters">
            <div class="filter-group">
                <button class="filter-btn filter-btn-select" data-field="contract_id" data-filter-type="select">Договор</button>
                <button class="filter-btn filter-btn-select" data-field="stage_type_id" data-filter-type="select">Тип этапа</button>
                <button class="filter-btn filter-btn-select" data-field="brigade_id" data-filter-type="select">Бригада</button>
                <button class="filter-btn filter-btn-select" data-field="prorab_id" data-filter-type="select">Прораб</button>
                <button class="filter-btn filter-btn-select" data-field="status" data-filter-type="select">Статус</button>
                <button class="filter-btn" data-field="start_date">Дата начала</button>
                <button class="filter-btn" data-field="end_date">Дата окончания</button>
            </div>
        </div>

        <div id="stages-table"></div>
        <div id="loading">Загрузка данных...</div>
        <div id="error" class="error-message" style="display: none;"></div>
    </div>

    <!-- Модальное окно выбора колонок (создаётся динамически в JS) -->

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
                        <button class="quick-date-btn" data-clear="true">Сбросить</button>
                    </div>
                </div>
                <div class="modal-actions">
                    <button id="apply-date-filter">Применить фильтр</button>
                    <button id="clear-date-filter">Отмена</button>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/luxon/build/global/luxon.min.js"></script>
    <script src="https://unpkg.com/tabulator-tables@6.3.0/dist/js/tabulator.min.js"></script>
    <script src="frontend/js/config.js"></script>
    <script type="module">
        import { StagesTable } from './frontend/js/modules/Stages.js?v=1.0.1';
        document.addEventListener('DOMContentLoaded', function() {
            window.stagesTableInstance = new StagesTable();  // Для отладки
        });
    </script>
</body>
</html>