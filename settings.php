<?php 
require_once 'api/check_auth.php';
// Только админы могут заходить в настройки
requireRole('admin');
?>

<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Настройки - Справочники</title>
    <link href="https://unpkg.com/tabulator-tables@6.3.0/dist/css/tabulator.min.css" rel="stylesheet">
    <link href="frontend/css/style.css?v=1.2" rel="stylesheet">
    <link href="frontend/css/fonts.css" rel="stylesheet">
    <style>
        /* Специфичные стили для страницы настроек */
        .settings-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
            margin-top: 20px;
        }

        .reference-table-wrapper {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .reference-table-wrapper h2 {
            margin: 0 0 12px 0;
            font-size: 16px;
            font-weight: 600;
            color: #333;
        }

        .table-controls {
            display: flex;
            gap: 10px;
            margin-bottom: 12px;
        }

        .table-controls button {
            background-color: #339af0;
            color: white;
            border: none;
            padding: 5px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-family: var(--font-family);
            font-size: 13px;
            font-weight: 500;
            transition: background-color 0.2s;
        }

        .table-controls button:hover {
            background-color: #228be6;
        }

        .reference-table {
            border: 1px solid #e9ecef;
            border-radius: 8px;
            overflow: hidden;
        }

        /* Кнопка удаления в справочниках */
        .delete-ref-btn {
            background: none;
            border: none;
            cursor: pointer;
            font-size: 14px;
            padding: 2px 6px;
            opacity: 0.5;
            transition: opacity 0.2s, transform 0.2s;
        }

        .delete-ref-btn:hover {
            opacity: 1;
            transform: scale(1.2);
        }

        /* Адаптивность для мобильных */
        @media (max-width: 900px) {
            .settings-container {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <?php include 'header.php'; ?>

    <div class="container">
        <h1 style="text-align: left; font-size: 24px; margin-bottom: 10px;">Настройки справочников</h1>
        
        <div class="settings-container">
           

            <!-- Типы бригад -->
            <div class="reference-table-wrapper">
                <h2>Типы бригад</h2>
                <div class="table-controls">
                    <button id="add-brigade_types-btn">+ Добавить</button>
                </div>
                <div id="brigade_types-table" class="reference-table"></div>
            </div>

            <!-- Менеджеры -->
            <div class="reference-table-wrapper">
                <h2>Менеджеры</h2>
                <div class="table-controls">
                    <button id="add-managers-btn">+ Добавить</button>
                </div>
                <div id="managers-table" class="reference-table"></div>
            </div>

            <!-- Прорабы -->
            <div class="reference-table-wrapper">
                <h2>Прорабы</h2>
                <div class="table-controls">
                    <button id="add-prorabs-btn">+ Добавить</button>
                </div>
                <div id="prorabs-table" class="reference-table"></div>
            </div>

            <!-- Подрядчики -->
            <div class="reference-table-wrapper">
                <h2>Подрядчики</h2>
                <div class="table-controls">
                    <button id="add-contractors-btn">+ Добавить</button>
                </div>
                <div id="contractors-table" class="reference-table"></div>
            </div>

            <!-- Эскроу агенты -->
            <div class="reference-table-wrapper">
                <h2>Эскроу агенты</h2>
                <div class="table-controls">
                    <button id="add-escrow_agents-btn">+ Добавить</button>
                </div>
                <div id="escrow_agents-table" class="reference-table"></div>
            </div>

            <!-- Типы оплаты -->
            <div class="reference-table-wrapper">
                <h2>Типы оплаты</h2>
                <div class="table-controls">
                    <button id="add-payment_types-btn">+ Добавить</button>
                </div>
                <div id="payment_types-table" class="reference-table"></div>
            </div>

            <!-- Типы комплектаций -->
            <div class="reference-table-wrapper">
                <h2>Типы комплектаций</h2>
                <div class="table-controls">
                    <button id="add-complectation-btn">+ Добавить</button>
                </div>
                <div id="complectation-table" class="reference-table"></div>
            </div>

            <!-- Источники -->
            <div class="reference-table-wrapper">
                <h2>Источники</h2>
                <div class="table-controls">
                    <button id="add-sources-btn">+ Добавить</button>
                </div>
                <div id="sources-table" class="reference-table"></div>
            </div>

            <!-- Типы этапов -->
            <div class="reference-table-wrapper">
                <h2>Типы этапов</h2>
                <div class="table-controls">
                    <button id="add-stage_types-btn">+ Добавить</button>
                </div>
                <div id="stage_types-table" class="reference-table"></div>
            </div>
        </div>

        <div id="loading" style="display: none;">Загрузка данных...</div>
        <div id="error" class="error-message" style="display: none;"></div>
    </div>

    <!-- Модальное окно подтверждения удаления -->
    <div id="delete-confirm-modal" class="modal" style="display: none;">
        <div class="modal-content delete-confirm-content">
            <div class="modal-header">
                <h2>Подтверждение удаления</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <p>Вы уверены, что хотите удалить эту запись?</p>
                <p class="delete-warning">Это действие нельзя отменить.</p>
            </div>
            <div class="modal-actions">
                <button id="confirm-delete-btn" class="danger-btn">Удалить</button>
                <button id="cancel-delete-btn" class="secondary-btn">Отмена</button>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/luxon/build/global/luxon.min.js"></script>
    <script src="https://unpkg.com/tabulator-tables@6.3.0/dist/js/tabulator.min.js"></script>
    <script src="frontend/js/config.js?v=1.0.1"></script>
    <script src="frontend/js/core/ReferenceTable.js?v=1.0.1"></script>
    <script src="frontend/js/modules/Settings.js?v=1.0.1"></script>
</body>
</html>