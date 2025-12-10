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
     * Возвращает группировку колонок для селектора.
     * Дочерние классы могут переопределить этот метод.
     * Формат: [{ title: 'Название группы', fields: ['field1', 'field2'] }]
     */
    getColumnGroups() {
        return null; /* По умолчанию без группировки */
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
            // Обработчик для кнопок удаления
            tableElement.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-row-btn')) {
                    e.stopPropagation();
                    const id = e.target.getAttribute('data-id');
                    if (id) {
                        this.showDeleteConfirm(id);
                    }
                }
            
                // Обработчик для кнопки открытия договора
                const openBtn = e.target.closest('.open-contract-btn');
                if (openBtn) {
                    e.stopPropagation();
                    const id = openBtn.getAttribute('data-id');
                    if (id) {
                        window.location.href = `/contract.php?id=${id}`;
                    }
                }
            });
        }
    }
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
                <div class="modal-body">
                    <div class="columns-search">
                        <input type="text" class="columns-search-input" placeholder="Поиск колонок..." autocomplete="off">
                    </div>
                    <div class="columns-quick-actions">
                        <span id="select-all-columns">Все</span>
                        <span class="separator">/</span>
                        <span id="deselect-all-columns">Ничего</span>
                        <span class="separator">/</span>
                        <span id="reset-columns-visibility">По умолчанию</span>
                    </div>
                    <div id="columns-list" class="columns-list"></div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.bindColumnSelectorEvents();
}
    
    bindColumnSelectorEvents() {
    const modal = document.getElementById('column-selector-modal');
    const content = modal.querySelector('.modal-content');
    
    /* Закрытие по клику вне контента */
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    /* Останавливаем всплытие кликов внутри контента */
    if (content) {
        content.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    /* Быстрые действия */
    document.getElementById('select-all-columns').onclick = () => {
        modal.querySelectorAll('.checkbox-item:not(.hidden) input[type="checkbox"]').forEach(cb => {
            if (!cb.checked) {
                cb.checked = true;
                this.toggleColumnVisibility(cb.value, true);
            }
        });
    };
    
    document.getElementById('deselect-all-columns').onclick = () => {
        modal.querySelectorAll('.checkbox-item:not(.hidden) input[type="checkbox"]').forEach(cb => {
            if (cb.checked) {
                cb.checked = false;
                this.toggleColumnVisibility(cb.value, false);
            }
        });
    };
    
    document.getElementById('reset-columns-visibility').onclick = () => {
        this.resetColumnVisibility();
        this.populateColumnSelector();
    };
    
    /* Поиск по колонкам */
    const searchInput = modal.querySelector('.columns-search-input');
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        
        modal.querySelectorAll('.columns-group').forEach(group => {
            let hasVisibleItems = false;
            
            group.querySelectorAll('.checkbox-item').forEach(item => {
                const label = item.querySelector('label').textContent.toLowerCase();
                if (term === '' || label.includes(term)) {
                    item.classList.remove('hidden');
                    hasVisibleItems = true;
                } else {
                    item.classList.add('hidden');
                }
            });
            
            /* Скрываем группу если нет видимых элементов */
            if (term !== '' && !hasVisibleItems) {
                group.style.display = 'none';
            } else {
                group.style.display = '';

            }
        });
        
        /* Для простого списка без групп */
        modal.querySelectorAll('#columns-list > .checkbox-item').forEach(item => {
            const label = item.querySelector('label').textContent.toLowerCase();
            if (term === '' || label.includes(term)) {
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
        });
    });
}
    
    showColumnSelector() {
    const modal = document.getElementById('column-selector-modal');
    const content = modal.querySelector('.modal-content');
    const toggleBtn = document.getElementById('toggle-columns-btn');
    
    this.populateColumnSelector();
    
    /* Позиционируем под кнопкой */
    if (toggleBtn && content) {
        const rect = toggleBtn.getBoundingClientRect();
        const modalWidth = 320;
        
        /* Проверяем, не выходит ли за правый край экрана */
        let leftPos = rect.left;
        if (leftPos + modalWidth > window.innerWidth - 20) {
            leftPos = window.innerWidth - modalWidth - 20;
        }
        if (leftPos < 20) {
            leftPos = 20;
        }
        
        content.style.top = (rect.bottom + 5) + 'px';
        content.style.left = leftPos + 'px';
    }
    
    modal.style.display = 'block';
    
    /* Фокус на поле поиска */
    setTimeout(() => {
        const searchInput = modal.querySelector('.columns-search-input');
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
    }, 50);
}
    
    populateColumnSelector() {
    const columnsContainer = document.getElementById('columns-list');
    columnsContainer.innerHTML = '';
    
    const columns = this.table.getColumns();
    const columnGroups = this.getColumnGroups();
    
    /* Если есть группировка */
    if (columnGroups && columnGroups.length > 0) {
        const usedFields = new Set();
        
        columnGroups.forEach((group, groupIndex) => {
            const groupEl = document.createElement('div');
            groupEl.className = 'columns-group';
            groupEl.dataset.groupIndex = groupIndex;
            
            /* Собираем колонки группы */
            const groupColumns = [];
            group.fields.forEach(field => {
                const column = this.table.getColumn(field);
                if (column) {
                    groupColumns.push({ field, column, title: column.getDefinition().title });
                    usedFields.add(field);
                }
            });
            
            if (groupColumns.length === 0) return;
            
            /* Определяем состояние группы */
            const visibleCount = groupColumns.filter(c => c.column.isVisible()).length;
            const allVisible = visibleCount === groupColumns.length;
            const someVisible = visibleCount > 0 && visibleCount < groupColumns.length;
            
            /* Заголовок группы */
            const headerEl = document.createElement('div');
            headerEl.className = 'columns-group-header';
            headerEl.innerHTML = `
                <input type="checkbox" class="columns-group-checkbox" data-group="${groupIndex}" 
                    ${allVisible ? 'checked' : ''}>
                <span class="columns-group-title">${group.title}</span>
            `;
            
            /* Устанавливаем indeterminate если частично выбрано */
            const groupCheckbox = headerEl.querySelector('.columns-group-checkbox');
            if (someVisible) {
                groupCheckbox.indeterminate = true;
            }
            
            /* Элементы группы */
            const itemsEl = document.createElement('div');
            itemsEl.className = 'columns-group-items';
            
            groupColumns.forEach(({ field, column, title }) => {
                const checkbox = document.createElement('div');
                checkbox.className = 'checkbox-item';
                checkbox.dataset.field = field;
                checkbox.innerHTML = `
                    <label>
                        <input type="checkbox" value="${field}" ${column.isVisible() ? 'checked' : ''}>
                        ${title}
                    </label>
                `;
                
                const input = checkbox.querySelector('input');
                input.addEventListener('change', (e) => {
                    this.toggleColumnVisibility(e.target.value, e.target.checked);
                    this.updateGroupCheckboxState(groupEl);
                });
                
                itemsEl.appendChild(checkbox);
            });
            
            /* Обработчик чекбокса группы */
            groupCheckbox.addEventListener('change', (e) => {
                e.stopPropagation();
                const checked = e.target.checked;
                itemsEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    if (cb.checked !== checked) {
                        cb.checked = checked;
                        this.toggleColumnVisibility(cb.value, checked);
                    }
                });
                groupCheckbox.indeterminate = false;
            });
            
            groupEl.appendChild(headerEl);
            groupEl.appendChild(itemsEl);
            columnsContainer.appendChild(groupEl);
        });
        
        /* Добавляем колонки, которые не попали ни в одну группу */
        const ungroupedColumns = [];
        columns.forEach(column => {
            const field = column.getField();
            if (field && !usedFields.has(field)) {
                ungroupedColumns.push({ field, column, title: column.getDefinition().title });
            }
        });
        
        if (ungroupedColumns.length > 0) {
            const groupEl = document.createElement('div');
            groupEl.className = 'columns-group';
            groupEl.dataset.groupIndex = 'other';
            
            const visibleCount = ungroupedColumns.filter(c => c.column.isVisible()).length;
            const allVisible = visibleCount === ungroupedColumns.length;
            const someVisible = visibleCount > 0 && visibleCount < ungroupedColumns.length;
            
            const headerEl = document.createElement('div');
            headerEl.className = 'columns-group-header';
            headerEl.innerHTML = `
                <input type="checkbox" class="columns-group-checkbox" data-group="other" 
                    ${allVisible ? 'checked' : ''}>
                <span class="columns-group-title">Разное</span>
            `;
            
            const groupCheckbox = headerEl.querySelector('.columns-group-checkbox');
            if (someVisible) {
                groupCheckbox.indeterminate = true;
            }
            
            const itemsEl = document.createElement('div');
            itemsEl.className = 'columns-group-items';
            
            ungroupedColumns.forEach(({ field, column, title }) => {
                const checkbox = document.createElement('div');
                checkbox.className = 'checkbox-item';
                checkbox.dataset.field = field;
                checkbox.innerHTML = `
                    <label>
                        <input type="checkbox" value="${field}" ${column.isVisible() ? 'checked' : ''}>
                        ${title}
                    </label>
                `;
                
                const input = checkbox.querySelector('input');
                input.addEventListener('change', (e) => {
                    this.toggleColumnVisibility(e.target.value, e.target.checked);
                    this.updateGroupCheckboxState(groupEl);
                });
                
                itemsEl.appendChild(checkbox);
            });
        
            
            groupCheckbox.addEventListener('change', (e) => {
                e.stopPropagation();
                const checked = e.target.checked;
                itemsEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    if (cb.checked !== checked) {
                        cb.checked = checked;
                        this.toggleColumnVisibility(cb.value, checked);
                    }
                });
                groupCheckbox.indeterminate = false;
            });
            
            groupEl.appendChild(headerEl);
            groupEl.appendChild(itemsEl);
            columnsContainer.appendChild(groupEl);
        }
    } else {
        /* Без группировки — простой список */
        columns.forEach(column => {
            const field = column.getField();
            const title = column.getDefinition().title;
            
            if (!field) return;
            
            const checkbox = document.createElement('div');
            checkbox.className = 'checkbox-item';
            checkbox.dataset.field = field;
            checkbox.innerHTML = `
                <label>
                    <input type="checkbox" value="${field}" ${column.isVisible() ? 'checked' : ''}>
                    ${title}
                </label>
            `;
            
            const input = checkbox.querySelector('input');
            input.addEventListener('change', (e) => {
                this.toggleColumnVisibility(e.target.value, e.target.checked);
            });
            
            columnsContainer.appendChild(checkbox);
        });
    }
}

    toggleColumnVisibility(field, visible) {
        const column = this.table.getColumn(field);
        if (column) {
            if (visible) {
                column.show();
            } else {
                column.hide();
            }
        }
    }

    updateGroupCheckboxState(groupEl) {
    const groupCheckbox = groupEl.querySelector('.columns-group-checkbox');
    const itemCheckboxes = groupEl.querySelectorAll('.columns-group-items input[type="checkbox"]');
    
    const total = itemCheckboxes.length;
    const checked = Array.from(itemCheckboxes).filter(cb => cb.checked).length;
    
    if (checked === 0) {
        groupCheckbox.checked = false;
        groupCheckbox.indeterminate = false;
    } else if (checked === total) {
        groupCheckbox.checked = true;
        groupCheckbox.indeterminate = false;
    } else {
        groupCheckbox.checked = false;
        groupCheckbox.indeterminate = true;
    }
}

    /**
     * Привязка событий для чекбоксов групп
     */
    bindGroupCheckboxEvents() {
        /* Клик по чекбоксу группы — выбрать/снять все колонки в группе */
        document.querySelectorAll('#column-selector-modal .group-checkbox').forEach(groupCheckbox => {
            groupCheckbox.addEventListener('change', (e) => {
                const groupIndex = e.target.getAttribute('data-group-index');
                const isChecked = e.target.checked;
                
                document.querySelectorAll(`#column-selector-modal .column-checkbox[data-group-index="${groupIndex}"]`).forEach(checkbox => {
                    /* Выбираем только видимые (не скрытые поиском) */
                    const item = checkbox.closest('.checkbox-item');
                    if (!item.classList.contains('hidden-by-search')) {
                        checkbox.checked = isChecked;
                    }
                });
            });
        });
        
        /* Клик по чекбоксу колонки — обновить состояние группы */
        document.querySelectorAll('#column-selector-modal .column-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const groupIndex = e.target.getAttribute('data-group-index');
                this.updateGroupCheckbox(groupIndex);
            });
        });
    }

    /**
     * Обновление состояния чекбокса группы (checked/unchecked/indeterminate)
     */
    updateGroupCheckbox(groupIndex) {
        const groupCheckbox = document.querySelector(`#column-selector-modal .group-checkbox[data-group-index="${groupIndex}"]`);
        if (!groupCheckbox) return;
        
        const columnCheckboxes = document.querySelectorAll(`#column-selector-modal .column-checkbox[data-group-index="${groupIndex}"]`);
        
        /* Считаем только видимые чекбоксы */
        let total = 0;
        let checked = 0;
        
        columnCheckboxes.forEach(cb => {
            const item = cb.closest('.checkbox-item');
            if (!item.classList.contains('hidden-by-search')) {
                total++;
                if (cb.checked) checked++;
            }
        });
        
        if (total === 0) {
            groupCheckbox.checked = false;
            groupCheckbox.indeterminate = false;
        } else if (checked === 0) {
            groupCheckbox.checked = false;
            groupCheckbox.indeterminate = false;
        } else if (checked === total) {
            groupCheckbox.checked = true;
            groupCheckbox.indeterminate = false;
        } else {
            groupCheckbox.checked = false;
            groupCheckbox.indeterminate = true;
        }
    }

    /**
     * Обновление всех групповых чекбоксов
     */
    updateAllGroupCheckboxes() {
        document.querySelectorAll('#column-selector-modal .group-checkbox').forEach(groupCheckbox => {
            const groupIndex = groupCheckbox.getAttribute('data-group-index');
            this.updateGroupCheckbox(groupIndex);
        });
    }

    /**
     * Фильтрация списка колонок по поисковому запросу
     */
    filterColumnsList(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const groups = document.querySelectorAll('#column-selector-modal .column-group');
        
        groups.forEach(group => {
            const items = group.querySelectorAll('.checkbox-item');
            let visibleCount = 0;
            
            items.forEach(item => {
                const title = item.getAttribute('data-title') || '';
                const field = item.getAttribute('data-field') || '';
                
                if (term === '' || title.includes(term) || field.includes(term)) {
                    item.classList.remove('hidden-by-search');
                    item.style.display = '';
                    visibleCount++;
                } else {
                    item.classList.add('hidden-by-search');
                    item.style.display = 'none';
                }
            });
            
            /* Скрываем группу, если в ней нет видимых колонок */
            if (visibleCount === 0) {
                group.style.display = 'none';
            } else {
                group.style.display = '';
            }
        });
        
        /* Обновляем состояние групповых чекбоксов с учётом фильтра */
        this.updateAllGroupCheckboxes();
    }

    /**
     * Базовый метод getColumnGroups — возвращает null
     * Дочерние классы могут переопределить
     */
    getColumnGroups() {
        return null;
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