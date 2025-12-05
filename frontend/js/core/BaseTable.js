/**
 * BaseTable.js
 * Родительский класс для всех таблиц проекта.
 * Содержит общую логику: инициализацию Tabulator, фильтры, модальные окна,
 * обработку API и сохранение данных.
 */

export default class BaseTable {
    constructor() {
        this.table = null;
        this.currentFilterField = null;
        this.activeFilters = new Map();
        // Tabulator persistence будет управлять сохранением состояния
        this.persistenceId = this.getTableSelector().replace('#', '');

        
        // Справочники (будут заполнены при загрузке данных)
        this.lookups = {};
        
        // Блокировка повторных сохранений
        this.savingLocks = new Set();
        
        // Определяем, мобильное ли устройство
        this.isMobile = window.innerWidth < 768;
        
        // Слушаем изменение размера окна
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth < 768;
            
            // Если изменился режим, пересоздаём таблицу
            if (wasMobile !== this.isMobile && this.table) {
                this.rebuildTable();
            }
        });

        // Запуск
        this.init();
    }

    // --- АБСТРАКТНЫЕ МЕТОДЫ (Должны быть переопределены в дочерних классах) ---

    /**
     * Возвращает URL для API запросов (например, CONFIG.ENDPOINTS.CONTRACTS)
     */
    getApiEndpoint() {
        throw new Error("Метод getApiEndpoint() должен быть реализован в дочернем классе");
    }

    /**
     * Возвращает CSS селектор для контейнера таблицы (например, "#contracts-table")
     */
    getTableSelector() {
        throw new Error("Метод getTableSelector() должен быть реализован в дочернем классе");
    }

    /**
     * Возвращает массив определений колонок для Tabulator
     */
    getColumns() {
        throw new Error("Метод getColumns() должен быть реализован в дочернем классе");
    }

    /**
     * Возвращает настройки сортировки по умолчанию
     */
    getDefaultSort() {
        return [{column: "id", dir: "desc"}];
    }

    /*
         * Возвращает конфигурацию группировки для Tabulator.
         * По умолчанию возвращает null (без группировки).
         * Дочерние классы могут переопределить для добавления группировки.
     */
    getGroupConfig() {
        return null;
    }

    /**
     * Возвращает конфигурацию выпадающих фильтров.
     * Дочерние классы должны переопределить этот метод.
     * Формат: { field: { label: 'Название', options: {id: name} или [{value, label}] } }
     */
    getSelectFilters() {
        return {};
    }

    /*
         * Вспомогательный метод для склонения слова "запись"
     */
    getRecordWord(count) {
        const lastTwo = count % 100;
        const lastOne = count % 10;

        if (lastTwo >= 11 && lastTwo <= 19) {
            return 'записей';
        }
        if (lastOne === 1) {
            return 'запись';
        }
        if (lastOne >= 2 && lastOne <= 4) {
            return 'записи';
        }
        return 'записей';
    }

    // --- ОСНОВНАЯ ЛОГИКА ---

    async init() {
        await this.loadDataAndInit();
        this.bindEvents();
        this.bindDateFilterEvents();
        this.bindSelectFilterEvents();
        this.createDeleteConfirmModal();
        this.createSelectFilterModal();
    }

    async loadDataAndInit() {
        const loadingElement = document.getElementById('loading');
        const errorElement = document.getElementById('error');
        
        if (loadingElement) loadingElement.style.display = 'block';
        if (errorElement) errorElement.style.display = 'none';

        try {
            // Используем абстрактный метод для получения URL
            const url = `${CONFIG.API_BASE_URL}${this.getApiEndpoint()}`;
            
            const response = await fetch(url);
            const result = await response.json();

            if (result.success) {
                // Сохраняем справочники, если они пришли
                if (result.options) this.lookups = result.options;
                
                this.createTable(result.data);
                this.createColumnSelectorModal();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            if (errorElement) {
                errorElement.textContent = 'Ошибка загрузки данных: ' + error.message;
                errorElement.style.display = 'block';
            }
        } finally {
            if (loadingElement) loadingElement.style.display = 'none';
        }
    }

    async reloadData() {
        try {
            const url = `${CONFIG.API_BASE_URL}${this.getApiEndpoint()}`;
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.success) {
                if (result.options) this.lookups = result.options;
                this.table.setData(result.data);
            }
        } catch (error) {
            this.showNotification('Ошибка обновления данных', 'error');
        }
    }

    /**
     * Пересоздаёт таблицу (используется при изменении размера экрана)
     */
    async rebuildTable() {
        if (!this.table) return;
        
        // Сохраняем текущие данные
        const currentData = this.table.getData();
        
        // Уничтожаем старую таблицу
        this.table.destroy();
        
        // Создаём новую с актуальными настройками
        this.createTable(currentData);
    }

    /**
     * Применяет или убирает frozen в зависимости от ширины экрана
     */
    applyResponsiveFrozen(columns) {
        return columns.map(column => {
            // Если это группа колонок
            if (column.columns) {
                column.columns = this.applyResponsiveFrozen(column.columns);
                return column;
            }

            // На мобильных устройствах убираем frozen
            if (this.isMobile && column.frozen) {
                return { ...column, frozen: false };
            }
            
            return column;
        });
    }

    /**
     * Сохраняет порядок колонок в localStorage
     */
    saveColumnOrder() {
        try {
            const columns = this.table.getColumns();
            const order = columns.map(col => col.getField()).filter(Boolean);
            localStorage.setItem(`${this.persistenceId}_column_order`, JSON.stringify(order));
        } catch (error) {
            console.error('Error saving column order:', error);
        }
    }

    /**
     * Полный сброс всех настроек таблицы к значениям по умолчанию
     */
    
    resetAllTableSettings() {
        // Собираем все ключи localStorage связанные с Tabulator
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes(this.persistenceId) || key.includes('tabulator'))) {
                keysToRemove.push(key);
            }
        }
        
        console.log('Removing keys:', keysToRemove);
        
        // Удаляем все найденные ключи
        keysToRemove.forEach(key => {
            try {
                localStorage.removeItem(key);
                console.log(`Removed: ${key}`);
            } catch (error) {
                console.error(`Error removing ${key}:`, error);
            }
        });
        
        // Сохраняем данные до уничтожения таблицы
        const currentData = this.table.getData();
        
        // Уничтожаем таблицу
        this.table.destroy();
        
        // Пересоздаём таблицу БЕЗ persistence, чтобы применились дефолтные настройки
        this.createTableWithoutPersistence(currentData);
        
        this.showNotification('Все настройки сброшены', 'success');
    }

    /**
     * Создаёт таблицу без persistence (для сброса к дефолтным настройкам)
     */
    createTableWithoutPersistence(tableData) {
        let tableColumns = this.getColumns();
        tableColumns = this.applyResponsiveFrozen(tableColumns);

        const config = {
            data: tableData,
            layout: "fitColumns",
            responsiveLayout: false,
            pagination: "local",
            paginationSize: 100,
            paginationSizeSelector: [10, 20, 50, 100],
            movableColumns: true,
            resizableColumns: true,
            resizableRows: true,
            height: "calc(100vh - 30px)",
            initialSort: this.getDefaultSort(),
            columns: tableColumns,
            locale: "ru-ru",
            editTrigger: "click",
            langs: { "ru-ru": { "pagination": { "first": "Первая", "last": "Последняя", "prev": "Пред", "next": "След" } } },
            
            // Persistence ОТКЛЮЧЕН для этого создания
            persistence: false
        };

        const groupConfig = this.getGroupConfig();
        if (groupConfig) {
            Object.assign(config, groupConfig);
        }

        this.table = new Tabulator(this.getTableSelector(), config);
        this.table.on("cellEdited", (cell) => this.onCellEdited(cell));
        this.table.on("columnMoved", () => this.saveColumnOrder());
        this.bindTableEvents();
        
        // После создания таблицы с дефолтными настройками - 
        // уничтожаем её и создаём заново С persistence, чтобы новые изменения сохранялись
        setTimeout(() => {
            const data = this.table.getData();
            this.table.destroy();
            this.createTable(data);
        }, 100);
    }

    createTable(tableData) {
        // Получаем колонки и применяем responsive frozen
        let tableColumns = this.getColumns();
        tableColumns = this.applyResponsiveFrozen(tableColumns);

        console.log('=== createTable вызван ===');
        console.log('Количество строк:', tableData.length);
        console.log('Количество колонок:', tableColumns.length);
        console.log('isMobile:', this.isMobile);

        // Базовая конфигурация Tabulator
        const config = {
            data: tableData,
            layout: "fitColumns",
            responsiveLayout: false,
            pagination: "local",
            paginationSize: 100,
            paginationSizeSelector: [10, 20, 50, 100],
            movableColumns: true,
            resizableColumns: true,
            resizableRows: true,
            height: "calc(100vh - 30px)",
            initialSort: this.getDefaultSort(),
            columns: tableColumns,
            locale: "ru-ru",
            editTrigger: "click",
            langs: { "ru-ru": { "pagination": { "first": "Первая", "last": "Последняя", "prev": "Пред", "next": "След" } } },
            
            // Persistence - встроенное сохранение состояния Tabulator
            persistence: {
                sort: false,           // Не сохраняем сортировку
                filter: false,         // Не сохраняем фильтры
                headerFilter: false,   // Не сохраняем фильтры заголовков
                group: false,          // Не сохраняем группировку
                page: false,           // Не сохраняем страницу пагинации
                columns: ["width", "visible"]  // Сохраняем ширину и видимость колонок
            },
            persistenceID: this.persistenceId,
            persistenceMode: "local"   // Используем localStorage
        };

        // Получаем настройки группировки (если есть)
        const groupConfig = this.getGroupConfig();
        if (groupConfig) {
            Object.assign(config, groupConfig);
        }

        // Создаём таблицу
        this.table = new Tabulator(this.getTableSelector(), config);

        // Регистрируем события
        this.table.on("cellEdited", (cell) => this.onCellEdited(cell));
        
        // Сохраняем порядок колонок при перемещении
        this.table.on("columnMoved", () => this.saveColumnOrder());

        this.bindTableEvents();
    }



    // --- СОХРАНЕНИЕ ДАННЫХ ---

    onCellEdited(cell) {
        const field = cell.getField();
        const value = cell.getValue();
        const row = cell.getRow();

    // Пересчитываем вычисляемые поля если изменились исходные данные
        const fieldsToRecalc = this.getCalculatedFieldsDependencies();
        if (fieldsToRecalc[field]) {
        // Получаем актуальные данные строки и обновляем её
            const rowData = row.getData();
            row.update(rowData);
        }

        this.showNotification(`Изменено поле: ${field}`, 'success');
        this.saveChanges(cell);
    }
    
    /**
     * Возвращает зависимости вычисляемых полей.
     * Ключ - поле, при изменении которого нужно пересчитать.
     * Дочерние классы могут переопределить этот метод.
     */
    getCalculatedFieldsDependencies() {
        return {};
    }

    async saveChanges(cell) {
        try {
            const field = cell.getField();
            const value = cell.getValue();
            const rowData = cell.getRow().getData();
            
            const lockKey = `${rowData.id}:${field}`;
            
            if (this.savingLocks.has(lockKey)) {
                console.log('Сохранение уже выполняется для', lockKey);
                return;
            }
            
            this.savingLocks.add(lockKey);
            console.log('Начало сохранения:', { field, value, id: rowData.id });
            
            const updateData = {
                id: rowData.id,
                [field]: value,
                updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
            };
            
            const url = `${CONFIG.API_BASE_URL}${this.getApiEndpoint()}`;

            const response = await fetch(url, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(updateData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✓ Сохранено успешно');
                cell.clearEdited();
                this.showNotification('Изменения сохранены', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('✗ Ошибка сохранения:', error);
            this.showNotification('Ошибка: ' + error.message, 'error');
        } finally {
            const field = cell.getField();
            const rowData = cell.getRow().getData();
            const lockKey = `${rowData.id}:${field}`;
            this.savingLocks.delete(lockKey);
        }
    }

    saveAllEditedCells() {
        const editedCells = this.table.getEditedCells();
        if (editedCells.length > 0) {
            console.log('Принудительное сохранение, ячеек:', editedCells.length);
            editedCells.forEach(cell => this.saveChanges(cell));
        }
    }

    async addNewRow() {
        try {
            const url = `${CONFIG.API_BASE_URL}${this.getApiEndpoint()}`;

        // Получаем данные для новой записи из дочернего класса
            const newData = this.getNewRowData();

            const response = await fetch(url, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(newData)
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Запись создана', 'success');
            // Перезагружаем данные таблицы
                await this.reloadData();

            // Прокручиваем к первой строке (если сортировка по id desc)
                setTimeout(() => {
                    this.table.scrollToRow(result.id, "top", false);
                }, 100);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Ошибка создания записи:', error);
            this.showNotification('Ошибка создания записи: ' + error.message, 'error');
        }
    }

    async deleteRow(id) {
        try {
            const url = `${CONFIG.API_BASE_URL}${this.getApiEndpoint()}`;

            const response = await fetch(url, {
                method: 'DELETE',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ id: id })
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Запись удалена', 'success');
                await this.reloadData();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Ошибка удаления записи:', error);
            this.showNotification('Ошибка удаления: ' + error.message, 'error');
        }
    }

    // Абстрактный метод для получения данных новой записи
    // Должен быть переопределен в дочерних классах
    getNewRowData() {
        throw new Error("Метод getNewRowData() должен быть реализован в дочернем классе");
    }

    // Абстрактный метод для получения имени поля с названием записи
    // Должен быть переопределен в дочерних классах
    getNameField() {
        throw new Error("Метод getNameField() должен быть реализован в дочернем классе");
    }

    // --- СОБЫТИЯ И UI ---

    bindEvents() {
        // Проверяем наличие кнопок перед добавлением событий
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.reloadData());

        const toggleColBtn = document.getElementById('toggle-columns-btn');
        if (toggleColBtn) toggleColBtn.addEventListener('click', () => this.showColumnSelector());

        const saveAllBtn = document.getElementById('save-all-btn');
        if (saveAllBtn) saveAllBtn.addEventListener('click', () => this.saveAllEditedCells());

        const debugBtn = document.getElementById('debug-btn');
        if (debugBtn) debugBtn.addEventListener('click', () => this.debugTable());

        const addContractBtn = document.getElementById('add-contract-btn');
        if (addContractBtn) addContractBtn.addEventListener('click', () => this.addNewRow());

        const addStageBtn = document.getElementById('add-stage-btn');
        if (addStageBtn) addStageBtn.addEventListener('click', () => this.addNewRow());

        const addBrigadeBtn = document.getElementById('add-brigade-btn');
        if (addBrigadeBtn) addBrigadeBtn.addEventListener('click', () => this.addNewRow());

        // Обработка кнопок фильтров по датам
        document.querySelectorAll('.filter-btn:not(.filter-btn-select)').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetBtn = e.currentTarget;
                const field = targetBtn.getAttribute('data-field');
                
                // Логика клика по крестику (сброс фильтра)
                if (targetBtn.classList.contains('has-filter')) {
                    const rect = targetBtn.getBoundingClientRect();
                    if (e.clientX - rect.left > rect.width - 30) {
                        this.currentFilterField = field;
                        this.clearDateFilter();
                        return;
                    }
                }
                
                this.showDateFilter(field, targetBtn);
            });
        });

        // Обработка кнопок выпадающих фильтров
        document.querySelectorAll('.filter-btn-select').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetBtn = e.currentTarget;
                const field = targetBtn.getAttribute('data-field');
                
                // Логика клика по крестику (сброс фильтра)
                if (targetBtn.classList.contains('has-filter')) {
                    const rect = targetBtn.getBoundingClientRect();
                    if (e.clientX - rect.left > rect.width - 30) {
                        this.clearSelectFilter(field);
                        return;
                    }
                }
                
                this.showSelectFilter(field, targetBtn);
            });
        });
    }

    bindTableEvents() {
        const tableElement = document.querySelector(this.getTableSelector());
        if (tableElement) {
/*            tableElement.addEventListener('focusout', (e) => {
            // Небольшая задержка, чтобы убедиться, что фокус действительно ушел
                setTimeout(() => {
                    this.saveAllEditedCells();
                }, 200);
            });*/

        // Обработчик для кнопок удаления
            tableElement.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-row-btn')) {
                    e.stopPropagation();
                    const id = e.target.getAttribute('data-id');
                    if (id) {
                        this.showDeleteConfirm(id);
                    }
                }
            });
        }
    }

    // --- ЛОГИКА ФИЛЬТРОВ ПО ДАТЕ ---

    // --- ЛОГИКА ФИЛЬТРОВ ПО ДАТЕ ---

    bindDateFilterEvents() {
        const modal = document.getElementById('date-filter-modal');
        if (!modal) return;

        const content = modal.querySelector('.modal-content');

        // ИСПРАВЛЕНИЕ: Используем 'click' вместо 'mousedown' для большей стабильности
        // 1. Обработчик на самой модалке (серый фон/обертка)
        modal.addEventListener('click', (e) => {
            // Если клик пришелся ровно по обертке (а не по контенту внутри)
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        // 2. ВАЖНО: Останавливаем всплытие клика из контента.
        // Это гарантирует, что клик по инпутам, лейблам или пустому месту внутри белого окна
        // никогда не дойдет до modal.addEventListener и не закроет окно.
        if (content) {
            content.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // Обработчики кнопок внутри модального окна
        const applyBtn = document.getElementById('apply-date-filter');
        const clearBtn = document.getElementById('clear-date-filter');
        const quickDateBtns = document.querySelectorAll('.quick-date-btn');

        if(applyBtn) applyBtn.onclick = () => {
            this.applyDateFilter();
            modal.style.display = 'none';
        };

        if(clearBtn) clearBtn.onclick = () => {
            modal.style.display = 'none';
        };

        quickDateBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                const days = e.target.getAttribute('data-days');
                const clear = e.target.getAttribute('data-clear');
                if (clear) {
                    const startEl = document.getElementById('start-date');
                    const endEl = document.getElementById('end-date');
                    if(startEl) startEl.value = '';
                    if(endEl) endEl.value = '';
                } else if (days) {
                    this.setQuickDateRange(parseInt(days));
                }
            });
        });
    }



    showDateFilter(field, buttonElement) {
        this.currentFilterField = field;
        const modal = document.getElementById('date-filter-modal');
        if (!modal) return;

        const content = modal.querySelector('.modal-content');
        
        // Заполняем текущие значения
        const currentFilter = this.activeFilters.get(field);
        const startInput = document.getElementById('start-date');
        const endInput = document.getElementById('end-date');

        if (currentFilter) {
            if(startInput) startInput.value = currentFilter.start || '';
            if(endInput) endInput.value = currentFilter.end || '';
        } else {
            if(startInput) startInput.value = '';
            if(endInput) endInput.value = '';
        }
        
        // Позиционирование
        if (buttonElement && content) {
            const rect = buttonElement.getBoundingClientRect();
            content.style.top = (rect.bottom + 5) + 'px';
            content.style.left = rect.left + 'px';
        }

        modal.style.display = 'block';
    }

    setQuickDateRange(days) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const startInput = document.getElementById('start-date');
        const endInput = document.getElementById('end-date');
        
        if(startInput) startInput.value = this.formatDateForInput(startDate);
        if(endInput) endInput.value = this.formatDateForInput(endDate);
    }
    
    formatDateForInput(date) {
        return date.toISOString().split('T')[0];
    }
    
    applyDateFilter() {
        const startInput = document.getElementById('start-date');
        const endInput = document.getElementById('end-date');
        
        const startDate = startInput ? startInput.value : null;
        const endDate = endInput ? endInput.value : null;

        if (!startDate && !endDate) { this.clearDateFilter(); return; }
        this.activeFilters.set(this.currentFilterField, {start: startDate, end: endDate});
        this.updateFilterButton(this.currentFilterField);
        this.applyAllFilters();
    }
    
    clearDateFilter() {
        if (this.currentFilterField) {
            this.activeFilters.delete(this.currentFilterField);
            this.updateFilterButton(this.currentFilterField);
            this.applyAllFilters();
        }
    }
    
    updateFilterButton(field) {
        const button = document.querySelector(`.filter-btn[data-field="${field}"]`);
        if (!button) return;

        const hasFilter = this.activeFilters.has(field);
        if (hasFilter) {
            button.classList.add('has-filter');
            const filter = this.activeFilters.get(field);
            const startText = filter.start ? this.formatDateDisplay(filter.start) : '';
            const endText = filter.end ? this.formatDateDisplay(filter.end) : '';
            const dateText = startText && endText ? `${startText} – ${endText}` : startText || endText;
            button.innerHTML = `${this.getFieldDisplayName(field)} <span>${dateText}</span>`;
        } else {
            button.classList.remove('has-filter');
            button.textContent = this.getFieldDisplayName(field);
        }
    }
    
    // Этот метод можно переопределять в наследниках, если нужны специфичные названия
    getFieldDisplayName(field) {
        const names = {
            'lead_date': 'Дата лида', 
            'contract_date': 'Дата договора', 
            'construction_start_date': 'Дата заезда', 
            'delivery_date': 'Дата сдачи',
            'start_date': 'Дата начала',
            'end_date': 'Дата окончания'
        };
        return names[field] || field;
    }
    
    formatDateDisplay(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU');
    }
    
    applyAllFilters() {
        const filters = [];
        
        this.activeFilters.forEach((value, field) => {
            // Фильтр по выпадающему списку
            if (value.type === 'select') {
                filters.push((data) => {
                    const cellValue = data[field];
                    // Сравниваем как строки для универсальности
                    return String(cellValue) === String(value.value);
                });
            }
            // Фильтр по дате (существующая логика)
            else if (value.start || value.end) {
                if (value.start && value.end) {
                    filters.push((data) => {
                        const cellDate = new Date(data[field]);
                        const startDate = new Date(value.start);
                        const endDate = new Date(value.end);
                        endDate.setHours(23, 59, 59, 999);
                        return cellDate >= startDate && cellDate <= endDate;
                    });
                } else if (value.start) {
                    filters.push((data) => {
                        const cellDate = new Date(data[field]);
                        const startDate = new Date(value.start);
                        return cellDate >= startDate;
                    });
                } else if (value.end) {
                    filters.push((data) => {
                        const cellDate = new Date(data[field]);
                        const endDate = new Date(value.end);
                        endDate.setHours(23, 59, 59, 999);
                        return cellDate <= endDate;
                    });
                }
            }
        });
        
        if (filters.length > 0) {
            this.table.setFilter((data) => filters.every(filterFn => filterFn(data)));
        } else {
            this.table.clearFilter();
        }
    }

    // --- ЛОГИКА ВЫПАДАЮЩИХ ФИЛЬТРОВ ---

    createSelectFilterModal() {
        const existingModal = document.getElementById('select-filter-modal');
        if (existingModal) existingModal.remove();

        const modalHTML = `
            <div id="select-filter-modal" class="modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-body">
                        <div class="select-filter-list"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    bindSelectFilterEvents() {
        // Закрытие модалки при клике вне её
        document.addEventListener('click', (e) => {
            const modal = document.getElementById('select-filter-modal');
            if (modal && modal.style.display === 'block') {
                const content = modal.querySelector('.modal-content');
                if (content && !content.contains(e.target) && !e.target.classList.contains('filter-btn-select')) {
                    modal.style.display = 'none';
                }
            }
        });
    }

    showSelectFilter(field, buttonElement) {
    const modal = document.getElementById('select-filter-modal');
    if (!modal) return;

    const content = modal.querySelector('.modal-content');
    const listContainer = modal.querySelector('.select-filter-list');
    
    // Получаем опции для этого поля
    const filterConfig = this.getSelectFilters()[field];
    if (!filterConfig) return;

    // Текущее выбранное значение
    const currentFilter = this.activeFilters.get(field);
    const currentValue = currentFilter ? currentFilter.value : null;

    // Проверяем, нужен ли поиск
    const isSearchable = filterConfig.searchable === true;

    // Строим HTML
    let html = '';
    
    // Добавляем поле поиска, если searchable
    if (isSearchable) {
        html += `<div class="select-filter-search">
            <input type="text" class="select-filter-search-input" placeholder="Поиск..." autocomplete="off">
        </div>`;
    }
    
    html += `<div class="select-filter-items">`;
    html += `<div class="select-filter-item clear-option" data-value="">Сбросить фильтр</div>`;
    
    const options = filterConfig.options;
    
    // Если options — объект {id: name}
    if (options && typeof options === 'object' && !Array.isArray(options)) {
        Object.entries(options).forEach(([value, label]) => {
            const isSelected = String(currentValue) === String(value);
            html += `<div class="select-filter-item ${isSelected ? 'selected' : ''}" data-value="${value}" data-label="${String(label).toLowerCase()}">${label}</div>`;
        });
    } 
    // Если options — массив [{value, label}]
    else if (Array.isArray(options)) {
        options.forEach(opt => {
            const isSelected = String(currentValue) === String(opt.value);
            html += `<div class="select-filter-item ${isSelected ? 'selected' : ''}" data-value="${opt.value}" data-label="${String(opt.label).toLowerCase()}">${opt.label}</div>`;
        });
    }

    html += `</div>`;
    listContainer.innerHTML = html;

    // Обработчик поиска (если есть)
    if (isSearchable) {
        const searchInput = listContainer.querySelector('.select-filter-search-input');
        const itemsContainer = listContainer.querySelector('.select-filter-items');
        
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            const items = itemsContainer.querySelectorAll('.select-filter-item:not(.clear-option)');
            
            items.forEach(item => {
                const label = item.getAttribute('data-label') || '';
                if (term === '' || label.includes(term)) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        });
        
        // Фокус на поле поиска после открытия
        setTimeout(() => searchInput.focus(), 50);
    }

    // Обработчики кликов по опциям
    listContainer.querySelectorAll('.select-filter-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const value = item.getAttribute('data-value');
            
            if (value === '') {
                this.clearSelectFilter(field);
            } else {
                this.applySelectFilter(field, value, filterConfig);
            }
            
            modal.style.display = 'none';
        });
    });

    // Позиционирование
    if (buttonElement && content) {
        const rect = buttonElement.getBoundingClientRect();
        content.style.top = (rect.bottom + 5) + 'px';
        content.style.left = rect.left + 'px';
    }

    modal.style.display = 'block';
}

    applySelectFilter(field, value, filterConfig) {
        // Находим label для отображения
        let displayLabel = value;
        const options = filterConfig.options;
        
        if (options && typeof options === 'object' && !Array.isArray(options)) {
            displayLabel = options[value] || value;
        } else if (Array.isArray(options)) {
            const found = options.find(opt => String(opt.value) === String(value));
            if (found) displayLabel = found.label;
        }

        this.activeFilters.set(field, { 
            type: 'select', 
            value: value,
            label: displayLabel
        });
        
        this.updateSelectFilterButton(field, displayLabel);
        this.applyAllFilters();
    }

    clearSelectFilter(field) {
        this.activeFilters.delete(field);
        this.updateSelectFilterButton(field, null);
        this.applyAllFilters();
    }

    updateSelectFilterButton(field, label) {
        const button = document.querySelector(`.filter-btn-select[data-field="${field}"]`);
        if (!button) return;

        const filterConfig = this.getSelectFilters()[field];
        const baseName = filterConfig ? filterConfig.label : field;

        if (label) {
            button.classList.add('has-filter');
            button.innerHTML = `${baseName} <span>${label}</span>`;
        } else {
            button.classList.remove('has-filter');
            button.textContent = baseName;
        }
    }

   // --- COLUMN VISIBILITY METHODS ---


    resetColumnVisibility() {
        // Получаем оригинальные настройки колонок из определения
        const originalColumns = this.getColumns();
        
        // Рекурсивная функция для получения дефолтных значений
        const getOriginalSettings = (columns) => {
            const settings = {};
            columns.forEach(col => {
                if (col.columns) {
                    Object.assign(settings, getOriginalSettings(col.columns));
                } else if (col.field) {
                    settings[col.field] = {
                        visible: col.visible !== false,
                        width: col.width || null
                    };
                }
            });
            return settings;
        };
        
        const originalSettings = getOriginalSettings(originalColumns);
        
        // Применяем оригинальные настройки
        const columns = this.table.getColumns();
        columns.forEach(column => {
            const field = column.getField();
            if (field && originalSettings.hasOwnProperty(field)) {
                // Восстанавливаем видимость
                if (originalSettings[field].visible) {
                    column.show();
                } else {
                    column.hide();
                }
            }
        });
        
        this.showNotification('Настройки видимости сброшены', 'success');
    }

    // --- МОДАЛКА ВЫБОРА КОЛОНОК ---

    createColumnSelectorModal() {
        const existingModal = document.getElementById('column-selector-modal');
        if (existingModal) existingModal.remove();

        const modalHTML = `
            <div id="column-selector-modal" class="modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Выбор колонок</h2>
                        <span class="close">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div id="columns-list" class="columns-list"></div>
                    </div>
                    <div class="modal-actions">
                        <div class="modal-actions-left">
                            <button id="select-all-btn" class="secondary-btn">Все</button>
                            <button id="deselect-all-btn" class="secondary-btn">Ничего</button>
                            <button id="reset-columns-btn" class="secondary-btn">По умолчанию</button>
                            <button id="reset-all-btn" class="secondary-btn danger-outline-btn">Сбросить всё</button>
                        </div>
                        <div class="modal-actions-right">
                            <button id="apply-columns-btn">Применить</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.bindModalEvents();
    }
    
    bindModalEvents() {
        const modal = document.getElementById('column-selector-modal');
        const closeBtn = modal.querySelector('.close');
        const applyBtn = document.getElementById('apply-columns-btn');
        const selectAllBtn = document.getElementById('select-all-btn');
        const deselectAllBtn = document.getElementById('deselect-all-btn');
        const resetBtn = document.getElementById('reset-columns-btn');
        const resetAllBtn = document.getElementById('reset-all-btn');

        closeBtn.onclick = () => modal.style.display = 'none';
        
        window.addEventListener('click', (event) => {
            if (event.target === modal) modal.style.display = 'none';
        });
        
        applyBtn.onclick = () => {
            this.applySelectedColumns();
            modal.style.display = 'none';
        };
        
        selectAllBtn.onclick = () => {
            document.querySelectorAll('#column-selector-modal input[type="checkbox"]').forEach(checkbox => checkbox.checked = true);
        };
        
        deselectAllBtn.onclick = () => {
            document.querySelectorAll('#column-selector-modal input[type="checkbox"]').forEach(checkbox => checkbox.checked = false);
        };
        
        resetBtn.onclick = () => {
            this.resetColumnVisibility();
            modal.style.display = 'none';
        };
        
        // Новая кнопка: сброс ВСЕХ настроек (видимость, ширина, порядок)
        resetAllBtn.onclick = () => {
            if (confirm('Сбросить все настройки таблицы (порядок, ширину и видимость колонок)?')) {
                this.resetAllTableSettings();
                modal.style.display = 'none';
            }
        };
    }
    
    showColumnSelector() {
        const modal = document.getElementById('column-selector-modal');
        this.populateColumnSelector();
        modal.style.display = 'block';
    }
    
    populateColumnSelector() {
        const columnsContainer = document.getElementById('columns-list');
        columnsContainer.innerHTML = '';
        
        const columns = this.table.getColumns();
        
        columns.forEach(column => {
            const field = column.getField();
            const title = column.getDefinition().title;
            
            // Пропускаем колонки без field (например, колонки-группы)
            if (!field) return;
            
            this.createCheckbox(column, columnsContainer);
        });
    }
    
    createCheckbox(column, container) {
        const checkbox = document.createElement('div');
        checkbox.className = 'checkbox-item';
        checkbox.innerHTML = `
            <label>
                <input type="checkbox" value="${column.getField()}" ${column.isVisible() ? 'checked' : ''}>
                ${column.getDefinition().title}
            </label>
        `;
        container.appendChild(checkbox);
    }
    
    applySelectedColumns() {
        document.querySelectorAll('#column-selector-modal input[type="checkbox"]').forEach(checkbox => {
            const column = this.table.getColumn(checkbox.value);
            if (column) {
                if (checkbox.checked) {
                    column.show();
                } else {
                    column.hide();
                }
            }
        });
        // Tabulator persistence автоматически сохранит изменения
    }

    createDeleteConfirmModal() {
        const existingModal = document.getElementById('delete-confirm-modal');
        if (existingModal) existingModal.remove();

        const modalHTML = `
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
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.bindDeleteModalEvents();
    }

    bindDeleteModalEvents() {
        const modal = document.getElementById('delete-confirm-modal');
        const closeBtn = modal.querySelector('.close');
        const cancelBtn = document.getElementById('cancel-delete-btn');
        const confirmBtn = document.getElementById('confirm-delete-btn');

        const closeModal = () => {
            modal.style.display = 'none';
            delete this.pendingDeleteId;
        };

        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;

        window.onclick = (event) => {
            if (event.target === modal) closeModal();
        };

        confirmBtn.onclick = async () => {
            if (this.pendingDeleteId) {
                await this.deleteRow(this.pendingDeleteId);
                closeModal();
            }
        };
    }

    showDeleteConfirm(id) {
        this.pendingDeleteId = id;
        const modal = document.getElementById('delete-confirm-modal');
        modal.style.display = 'block';
    }


    // --- УВЕДОМЛЕНИЯ И ОТЛАДКА ---

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 12px 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white; border-radius: 4px; z-index: 10000; box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) notification.parentNode.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    debugTable() {
        console.log('=== DEBUG TABLE ===');
        console.log('Persistence ID:', this.persistenceId);
        console.log('Edited cells:', this.table.getEditedCells().length);
        console.log('Data count:', this.table.getDataCount());
        
        // Показываем все ключи localStorage связанные с таблицей
        console.log('=== localStorage keys ===');
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.includes(this.persistenceId) || key.includes('tabulator')) {
                console.log(`Key: "${key}"`, localStorage.getItem(key));
            }
        }
    }
}