<?php 
require_once __DIR__ . '/../api/check_auth.php'; 
requirePermission('settings');
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Управление доступом</title>
    <?php include __DIR__ . '/../includes/pwa_head.php'; ?>
    <link rel="icon" href="/assets/favicon.ico">
    <link href="https://unpkg.com/tabulator-tables@6.3.0/dist/css/tabulator.min.css" rel="stylesheet">
    <link href="/frontend/css/style.css" rel="stylesheet">
    <link href="/frontend/css/fonts.css" rel="stylesheet">
    <style>
        .access-container {
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
        }

        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .page-header h1 {
            font-size: 24px;
            margin: 0;
        }

        .header-actions {
            display: flex;
            gap: 10px;
        }

        .header-actions button {
            padding: 8px 16px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            font-family: var(--font-family);
            font-size: 14px;
            font-weight: 500;
            transition: background-color 0.2s;
        }

        .btn-refresh {
            background-color: #e9ecef;
            color: #495057;
        }

        .btn-refresh:hover {
            background-color: #dee2e6;
        }

        /* Таблица */
        #access-table {
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        /* Стили для ячеек с галочками */
        .tabulator-cell[tabulator-field="can_view"],
        .tabulator-cell[tabulator-field="can_create"],
        .tabulator-cell[tabulator-field="can_edit"],
        .tabulator-cell[tabulator-field="can_delete"] {
            cursor: pointer;
        }

        .tabulator-cell[tabulator-field="can_view"]:hover,
        .tabulator-cell[tabulator-field="can_create"]:hover,
        .tabulator-cell[tabulator-field="can_edit"]:hover,
        .tabulator-cell[tabulator-field="can_delete"]:hover {
            background-color: #e7f5ff !important;
        }

        /* Бейдж для скрытых полей */
        .hidden-fields-badge {
            background-color: #ff6b6b;
            color: white;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 600;
        }

        .cell-clickable {
            cursor: pointer;
        }

        .cell-clickable:hover {
            background-color: #fff3bf !important;
        }

        /* Модальное окно */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
            justify-content: center;
            align-items: center;
        }

        .modal-content {
            background: white;
            border-radius: 12px;
            width: 100%;
            max-width: 400px;
            max-height: 80vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        .modal-header {
            padding: 16px 20px;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .modal-title {
            font-size: 18px;
            font-weight: 600;
            margin: 0;
        }

        .modal-header .close {
            font-size: 24px;
            cursor: pointer;
            color: #868e96;
            line-height: 1;
        }

        .modal-header .close:hover {
            color: #495057;
        }

        .modal-body {
            padding: 20px;
            overflow-y: auto;
        }

        .fields-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .checkbox-item {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            padding: 8px 12px;
            border-radius: 6px;
            transition: background-color 0.2s;
        }

        .checkbox-item:hover {
            background-color: #f8f9fa;
        }

        .checkbox-item input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
        }

        .checkbox-item span {
            font-size: 14px;
        }

        .modal-footer {
            padding: 16px 20px;
            border-top: 1px solid #e9ecef;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }

        .modal-footer button {
            padding: 10px 20px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            font-family: var(--font-family);
            font-size: 14px;
            font-weight: 500;
        }

        .btn-secondary {
            background-color: #e9ecef;
            color: #495057;
        }

        .btn-primary {
            background-color: #339af0;
            color: white;
        }

        .btn-primary:hover {
            background-color: #228be6;
        }

        /* Уведомления */
        #notification-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .notification {
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease;
        }

        .notification.success {
            background-color: #40c057;
        }

        .notification.error {
            background-color: #fa5252;
        }

        .notification.info {
            background-color: #339af0;
        }

        .notification.fade-out {
            animation: fadeOut 0.3s ease forwards;
        }

        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }

        /* Описание страницы */
        .page-description {
            background-color: #e7f5ff;
            border-left: 4px solid #339af0;
            padding: 12px 16px;
            margin-bottom: 20px;
            border-radius: 0 8px 8px 0;
            font-size: 14px;
            color: #1971c2;
        }

        /* Группы в таблице */
        .tabulator-group {
            background-color: #f8f9fa !important;
            border-bottom: 2px solid #dee2e6 !important;
        }

        .tabulator-group-header {
            font-weight: 600 !important;
            padding: 10px 15px !important;
        }
    </style>
</head>
<body>
    <?php include __DIR__ . '/../includes/header.php'; ?>

    <div class="access-container">
        <div class="page-header">
            <h1>Управление доступом</h1>
            <div class="header-actions">
                <button id="refresh-btn" class="btn-refresh">
                    <img src="/assets/refresh.svg" alt="" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 6px;">
                    Обновить
                </button>
            </div>
        </div>

        <div class="page-description">
            Нажмите на ячейку с галочкой, чтобы переключить разрешение. 
            Нажмите на число в колонке "Скрытые поля", чтобы настроить скрытые колонки для этой роли.
        </div>

        <div id="access-table"></div>

        <div id="loading" style="display: none; text-align: center; padding: 40px;">
            Загрузка данных...
        </div>
        <div id="error" class="error-message" style="display: none;"></div>
    </div>

    <!-- Модальное окно для скрытых полей -->
    <div id="hidden-fields-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">Скрытые поля</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <p style="color: #868e96; font-size: 13px; margin-bottom: 16px;">
                    Отмеченные поля будут скрыты для этой роли
                </p>
                <div class="fields-list"></div>
            </div>
            <div class="modal-footer">
                <button id="cancel-hidden-fields-btn" class="btn-secondary">Отмена</button>
                <button id="save-hidden-fields-btn" class="btn-primary">Сохранить</button>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/luxon/build/global/luxon.min.js"></script>
    <script src="https://unpkg.com/tabulator-tables@6.3.0/dist/js/tabulator.min.js"></script>
    <script src="/frontend/js/config.js"></script>
    <script src="/frontend/js/core/UserService.js"></script>
    <script src="/frontend/js/modules/Access.js"></script>
    <script src="/frontend/js/pwa.js"></script>
</body>
</html>