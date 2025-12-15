<?php require_once 'api/check_auth.php'; ?>

<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Adesk - Операции</title>
    <link href="https://unpkg.com/tabulator-tables@6.3.0/dist/css/tabulator.min.css" rel="stylesheet">
    <link href="frontend/css/style.css?v=1.2" rel="stylesheet">
    <link href="frontend/css/fonts.css" rel="stylesheet">
</head>
<body>
    <?php include 'header.php'; ?>
    <div class="container">
        <div class="controls">
            <button id="sync-btn" class="btn-primary" style="padding: 10px 20px;">
                <img src="/assets/refresh.svg" /> 
                <span>Синхронизировать</span>
            </button>
            <button id="refresh-btn"><img src="/assets/refresh.svg"/></button>
            <button id="toggle-columns-btn"><img src="/assets/control.svg"/></button>
        </div>
        
        <div id="sync-status" style="margin-bottom: 15px; display: none;"></div>

        <div id="adesk-table"></div>
        <div id="loading">Загрузка данных...</div>
        <div id="error" class="error-message" style="display: none;"></div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/luxon/build/global/luxon.min.js"></script>
    <script src="https://unpkg.com/tabulator-tables@6.3.0/dist/js/tabulator.min.js"></script>
    <script src="frontend/js/config.js?v=1.0.2"></script>
    <script src="frontend/js/core/UserService.js"></script>
    <script type="module">
        import { AdeskTable } from './frontend/js/modules/Adesk.js?v=1.0.1';
        document.addEventListener('DOMContentLoaded', function() {
            window.adeskTableInstance = new AdeskTable();
        });
    </script>
</body>
</html>