<?php 
require_once __DIR__ . '/../api/check_auth.php'; 
requireRole('admin');
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Отдел продаж</title>
    <?php include __DIR__ . '/../includes/pwa_head.php'; ?>
    
    <!-- Иконка -->
    <link rel="icon" href="/assets/favicon.ico">

    <!-- Tabulator -->
    <link href="https://unpkg.com/tabulator-tables@6.3.0/dist/css/tabulator.min.css" rel="stylesheet">
    <script src="https://unpkg.com/tabulator-tables@6.3.0/dist/js/tabulator.min.js"></script>
    
    <!-- Luxon (для работы с датами) -->
    <script src="https://cdn.jsdelivr.net/npm/luxon@3.4.4/build/global/luxon.min.js"></script>
    
    <!-- Шрифты и стили -->
    <link href="/frontend/css/fonts.css" rel="stylesheet">
    <link href="/frontend/css/style.css" rel="stylesheet">
</head>
<body>
    <?php include __DIR__ . '/../includes/header.php'; ?>

    <div class="container">
        <!-- Панель управления -->
        <div class="controls">
            <button id="add-sales-data-btn" class="btn-add">
                <img src="/assets/add.svg" alt="Добавить">
                Добавить
            </button>
            
            <button id="refresh-btn">
                <img src="/assets/refresh.svg" alt="Обновить">
                Обновить
            </button>
        </div>

        <!-- Фильтры -->
        <div class="date-filters">
            <div class="filter-group">
                <button class="filter-btn filter-btn-select" data-field="year" data-filter-type="select">Год</button>
            </div>
        </div>

        <!-- Индикатор загрузки -->
        <div id="loading" class="loading">Загрузка данных...</div>
        
        <!-- Сообщение об ошибке -->
        <div id="error" class="error"></div>
        
        <!-- Таблица -->
        <div id="sales-data-table"></div>
    </div>
    
    <!-- Конфигурация API -->
    <script src="/frontend/js/config.js"></script>
    <script src="/frontend/js/core/UserService.js"></script>
    
    <!-- Модули -->
    <script type="module">
        import { SalesDataTable } from '/frontend/js/modules/SalesData.js';
    </script>
</body>
</html>