<?php require_once 'api/check_auth.php'; ?>

<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Бригады</title>
    <link rel="icon" href="/assets/favicon.ico">
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
        
        <!-- Фильтры -->
        <div class="date-filters">
            <div class="filter-group">
                <button class="filter-btn filter-btn-select" data-field="brigade_type_id" data-filter-type="select">Тип бригады</button>
                <button class="filter-btn filter-btn-select" data-field="is_active" data-filter-type="select">Активность</button>
            </div>
        </div>

        <div id="brigades-table"></div>
        <div id="loading">Загрузка данных...</div>
        <div id="error" class="error-message" style="display: none;"></div>
    </div>

    <!-- Модальное окно выбора колонок (создаётся динамически в JS) -->

    <script src="https://cdn.jsdelivr.net/npm/luxon/build/global/luxon.min.js"></script>
    <script src="https://unpkg.com/tabulator-tables@6.3.0/dist/js/tabulator.min.js"></script>
    <script src="frontend/js/config.js"></script>
    <script src="frontend/js/core/UserService.js"></script>
    <script type="module">
        import { BrigadesTable } from './frontend/js/modules/Brigades.js?v=1.0.1';
        document.addEventListener('DOMContentLoaded', function() {
            window.brigadesTableInstance = new BrigadesTable();
        });
    </script>
</body>
</html>