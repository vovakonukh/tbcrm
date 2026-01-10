<?php 
require_once __DIR__ . '/../api/check_auth.php'; 
requirePermission('sales_data');
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
    
    <style>
        /* Стили для модалки синхронизации */
        .sync-modal {
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
        .sync-modal.active { display: flex; }
        .sync-modal-content {
            background: #fff;
            padding: 24px;
            border-radius: 12px;
            width: 100%;
            max-width: 400px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        .sync-modal-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
        }
        .sync-form-group {
            margin-bottom: 16px;
        }
        .sync-form-group label {
            display: block;
            font-size: 14px;
            color: #666;
            margin-bottom: 6px;
        }
        .sync-form-group select {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
            font-family: var(--font-family);
        }
        .sync-modal-actions {
            display: flex;
            gap: 12px;
            margin-top: 20px;
        }
        .sync-modal-actions button {
            flex: 1;
            padding: 12px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            border: none;
        }
        .sync-btn-cancel { background: #f5f5f5; color: #333; }
        .sync-btn-run { background: #2196F3; color: #fff; }
        .sync-btn-run:disabled { background: #ccc; cursor: not-allowed; }
        .sync-result {
            margin-top: 16px;
            padding: 12px;
            border-radius: 8px;
            font-size: 13px;
            display: none;
        }
        .sync-result.success { background: #e8f5e9; color: #2e7d32; display: block; }
        .sync-result.error { background: #ffebee; color: #c62828; display: block; }
        .sync-result.loading { background: #e3f2fd; color: #1565c0; display: block; }
    </style>
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
            
            <button id="sync-bitrix-btn" class="btn-add">
                <img src="/assets/refresh.svg" alt="Синхронизировать">
                Синхронизировать
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
    
    <!-- Модальное окно синхронизации -->
    <div id="sync-modal" class="sync-modal">
        <div class="sync-modal-content">
            <div class="sync-modal-title">Синхронизация с Битрикс24</div>
            
            <div class="sync-form-group">
                <label for="sync-month">Месяц</label>
                <select id="sync-month">
                    <option value="1">Январь</option>
                    <option value="2">Февраль</option>
                    <option value="3">Март</option>
                    <option value="4">Апрель</option>
                    <option value="5">Май</option>
                    <option value="6">Июнь</option>
                    <option value="7">Июль</option>
                    <option value="8">Август</option>
                    <option value="9">Сентябрь</option>
                    <option value="10">Октябрь</option>
                    <option value="11">Ноябрь</option>
                    <option value="12">Декабрь</option>
                </select>
            </div>
            
            <div class="sync-form-group">
                <label for="sync-year">Год</label>
                <select id="sync-year"></select>
            </div>
            
            <div id="sync-result" class="sync-result"></div>
            
            <div class="sync-modal-actions">
                <button class="sync-btn-cancel" id="sync-cancel">Отмена</button>
                <button class="sync-btn-run" id="sync-run">Запустить</button>
            </div>
        </div>
    </div>
    
    <!-- Конфигурация API -->
    <script src="/frontend/js/config.js"></script>
    <script src="/frontend/js/core/UserService.js"></script>
    
    <!-- Модуль таблицы -->
    <script type="module" src="/frontend/js/modules/SalesData.js"></script>
    
    <!-- Логика модалки синхронизации -->
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const syncBtn = document.getElementById('sync-bitrix-btn');
            const syncModal = document.getElementById('sync-modal');
            const syncCancel = document.getElementById('sync-cancel');
            const syncRun = document.getElementById('sync-run');
            const syncMonth = document.getElementById('sync-month');
            const syncYear = document.getElementById('sync-year');
            const syncResult = document.getElementById('sync-result');
            
            /* Заполняем годы */
            const currentYear = new Date().getFullYear();
            for (let y = currentYear; y >= 2020; y--) {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                syncYear.appendChild(opt);
            }
            
            /* Устанавливаем текущий месяц */
            syncMonth.value = new Date().getMonth() + 1;
            
            /* Открытие модалки */
            syncBtn.addEventListener('click', () => {
                syncResult.className = 'sync-result';
                syncResult.textContent = '';
                syncModal.classList.add('active');
            });
            
            /* Закрытие модалки */
            syncCancel.addEventListener('click', () => {
                syncModal.classList.remove('active');
            });
            
            /* Закрытие по клику вне модалки */
            syncModal.addEventListener('click', (e) => {
                if (e.target === syncModal) {
                    syncModal.classList.remove('active');
                }
            });
            
            /* Запуск синхронизации */
            syncRun.addEventListener('click', async () => {
                const month = syncMonth.value;
                const year = syncYear.value;
                
                syncRun.disabled = true;
                syncResult.className = 'sync-result loading';
                syncResult.textContent = 'Синхронизация... Это может занять несколько секунд.';
                
                try {
                    const response = await fetch(
                        `/api/sync_sales_bitrix.php?month=${month}&year=${year}`
                    );
                    const result = await response.json();
                    
                    if (result.success) {
                        syncResult.className = 'sync-result success';
                        syncResult.innerHTML = `
                            Готово!<br>
                            Обработано: ${result.managers_processed} менеджеров<br>
                            Пропущено: ${result.managers_skipped}<br>
                            Создано строк: ${result.rows_created}<br>
                            Обновлено: ${result.rows_updated}
                        `;
                        
                        /* Перезагружаем таблицу */
                        if (window.salesDataTableInstance) {
                            window.salesDataTableInstance.reloadData();
                        }
                    } else {
                        throw new Error(result.errors?.join(', ') || 'Неизвестная ошибка');
                    }
                } catch (error) {
                    syncResult.className = 'sync-result error';
                    syncResult.textContent = 'Ошибка: ' + error.message;
                } finally {
                    syncRun.disabled = false;
                }
            });
        });
    </script>
</body>
</html>