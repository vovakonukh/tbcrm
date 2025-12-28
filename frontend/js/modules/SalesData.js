import BaseTable from '../core/BaseTable.js';

export class SalesDataTable extends BaseTable {
    constructor() {
        super();
        this.years = [];
    }

    getApiEndpoint() {
        return CONFIG.ENDPOINTS.SALES_DATA;
    }

    getTableSelector() {
        return "#sales-data-table";
    }

    getNewRowData() {
        return {
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear()
        };
    }

    getNameField() {
        return "id";
    }

    getDefaultSort() {
        return [
            { column: "year", dir: "desc" },
            { column: "month", dir: "desc" }
        ];
    }

    getSelectFilters() {
        /* Формируем опции для фильтра по году */
        const yearOptions = {};
        this.years.forEach(year => {
            yearOptions[year] = String(year);
        });
        
        return {
            year: {
                label: 'Год',
                options: yearOptions
            }
        };
    }

    getColumns() {
        const self = this; /* Сохраняем ссылку на this */
        /* Хелпер для параметров редактора списков */
        const listEditorParams = (activeLookupData, allLookupData) => {
            const values = Object.entries(activeLookupData || {}).map(([id, name]) => ({
                label: name,
                value: isNaN(id) ? id : Number(id)
            }));

            return {
                values: values,
                autocomplete: true,
                clearable: true,
                listOnEmpty: true,
                freetext: false,
                filterFunc: (term, label, value, item) => {
                    return String(label).toLowerCase().indexOf(String(term).toLowerCase()) > -1;
                }
            };
        };

        /* Названия месяцев */
        const monthNames = {
            1: 'Январь', 2: 'Февраль', 3: 'Март', 4: 'Апрель',
            5: 'Май', 6: 'Июнь', 7: 'Июль', 8: 'Август',
            9: 'Сентябрь', 10: 'Октябрь', 11: 'Ноябрь', 12: 'Декабрь'
        };

        /* Опции для выбора месяца */
        const monthOptions = Object.entries(monthNames).map(([value, label]) => ({
            label: label,
            value: Number(value)
        }));

        /* Параметры форматирования денег */
        const moneyParams = {
            thousand: " ",
            precision: 0,
            decimal: ","
        };

        /* Форматтер процентов */
        const percentFormatter = (cell) => {
            const value = cell.getValue();
            if (value === null || value === undefined || value === '') return '';
            return parseFloat(value).toFixed(1) + '%';
        };

        return [
            {
                title: "ID",
                field: "id",
                width: 60,
                sorter: "number",
                editable: false,
                visible: false
            },

            {
                title: "Менеджер",
                field: "manager_id",
                width: 150,
                sorter: "number",
                formatter: "lookup",
                formatterParams: this.lookups.managers,
                editor: "list",
                editorParams: listEditorParams(this.activeLookups.managers || this.lookups.managers, this.lookups.managers),
                cssClass: "cell-text-left"
            },

            {
                title: "Месяц",
                field: "month",
                width: 130,
                sorter: "number",
                formatter: (cell) => {
                    const value = cell.getValue();
                    const rowData = cell.getRow().getData();
                    const displayValue = monthNames[value] || value;
                    
                    return `<span class="cell-content">${displayValue}</span>
                            <button class="refresh-cell-btn" data-id="${rowData.id}" title="Пересчитать данные из Битрикс">
                                <img src="/assets/refresh.svg" alt="Обновить"/>
                            </button>`;
                },
                editor: "list",
                editorParams: {
                    values: monthOptions,
                    clearable: false
                },
                cssClass: "cell-with-action",
                cellClick: (e, cell) => {
                    if (e.target.closest('.refresh-cell-btn')) {
                        e.stopPropagation();
                        const id = cell.getRow().getData().id;
                        const btn = e.target.closest('.refresh-cell-btn');
                        self.recalculateRow(id, btn);
                        return false;
                    }
                }
            },

            {
                title: "Год",
                field: "year",
                width: 80,
                sorter: "number",
                editor: "number",
                editorParams: {
                    min: 2020,
                    max: 2030
                }
            },

            {
                title: "ВОРОНКА",
                columns: [
                    {
                        title: "Цел. лиды",
                        field: "target_leads_new",
                        width: 95,
                        sorter: "number",
                        editor: "number",
                        editorParams: { min: 0 },
                        bottomCalc: "sum"
                    },
                    {
                        title: "Квал. лиды",
                        field: "qual_leads_new",
                        width: 95,
                        sorter: "number",
                        editor: "number",
                        editorParams: { min: 0 },
                        bottomCalc: "sum"
                    },
                    {
                        title: "Встречи",
                        field: "meetings_new",
                        width: 85,
                        sorter: "number",
                        editor: "number",
                        editorParams: { min: 0 },
                        bottomCalc: "sum"
                    },
                    {
                        title: "Договоры",
                        field: "contracts_new",
                        width: 90,
                        sorter: "number",
                        editor: "number",
                        editorParams: { min: 0 },
                        bottomCalc: "sum"
                    }
                ]
            },

            {
                title: "ФИНАНСЫ",
                columns: [
                    {
                        title: "Выручка",
                        field: "revenue",
                        width: 120,
                        sorter: "number",
                        editor: "number",
                        editorParams: { min: 0, step: 0.01 },
                        formatter: "money",
                        formatterParams: moneyParams,
                        cssClass: "cell-text-left",
                        bottomCalc: "sum",
                        bottomCalcFormatter: "money",
                        bottomCalcFormatterParams: moneyParams
                    },
                    {
                        title: "Прибыль",
                        field: "profit",
                        width: 120,
                        sorter: "number",
                        editor: "number",
                        editorParams: { min: 0, step: 0.01 },
                        formatter: "money",
                        formatterParams: moneyParams,
                        cssClass: "cell-text-left",
                        bottomCalc: "sum",
                        bottomCalcFormatter: "money",
                        bottomCalcFormatterParams: moneyParams
                    },
                    {
                        title: "Маржа",
                        field: "margin",
                        width: 75,
                        sorter: "number",
                        editable: false,
                        formatter: percentFormatter,
                        cssClass: "cell-calculated",
                        headerTooltip: "Прибыль / Выручка × 100"
                    },
                    {
                        title: "Ср. чек",
                        field: "average_revenue",
                        width: 110,
                        sorter: "number",
                        editable: false,
                        formatter: "money",
                        formatterParams: moneyParams,
                        cssClass: "cell-calculated",
                        headerTooltip: "Выручка / Кол-во договоров"
                    }
                ]
            },

            {
                title: "КОНВЕРСИИ",
                columns: [
                    {
                        title: "Цел→Квал",
                        field: "target_qual_cr",
                        width: 85,
                        sorter: "number",
                        editable: false,
                        formatter: percentFormatter,
                        cssClass: "cell-calculated",
                        headerTooltip: "Квал. лиды / Цел. лиды × 100"
                    },
                    {
                        title: "Квал→Встр",
                        field: "qual_meeting_cr",
                        width: 85,
                        sorter: "number",
                        editable: false,
                        formatter: percentFormatter,
                        cssClass: "cell-calculated",
                        headerTooltip: "Встречи / Квал. лиды × 100"
                    },
                    {
                        title: "Встр→Дог",
                        field: "meeting_contract_cr",
                        width: 85,
                        sorter: "number",
                        editable: false,
                        formatter: percentFormatter,
                        cssClass: "cell-calculated",
                        headerTooltip: "Договоры / Встречи × 100"
                    },
                    {
                        title: "Цел→Дог",
                        field: "target_contract_cr",
                        width: 85,
                        sorter: "number",
                        editable: false,
                        formatter: percentFormatter,
                        cssClass: "cell-calculated",
                        headerTooltip: "Договоры / Цел. лиды × 100"
                    },
                    {
                        title: "Квал→Дог",
                        field: "qual_contract_cr",
                        width: 85,
                        sorter: "number",
                        editable: false,
                        formatter: percentFormatter,
                        cssClass: "cell-calculated",
                        headerTooltip: "Договоры / Квал. лиды × 100"
                    }
                ]
            }
        ];
    }

    /* Переопределяем bindEvents для добавления кнопки */
    bindEvents() {
        super.bindEvents();

        /* Инициализируем обработчики кликов по кнопкам в таблице */
        this.bindTableEvents();
        
        const addBtn = document.getElementById('add-sales-data-btn');
        if (addBtn) {
            if (userService.canEdit()) {
                addBtn.addEventListener('click', () => this.addNewRow());
            } else {
                addBtn.style.display = 'none';
            }
        }
    }

    /* Переопределяем загрузку данных для сохранения списка годов */
    async loadDataAndInit() {
        const loadingElement = document.getElementById('loading');
        const errorElement = document.getElementById('error');
        
        if (loadingElement) loadingElement.style.display = 'block';
        if (errorElement) errorElement.style.display = 'none';

        try {
            const url = `${CONFIG.API_BASE_URL}${this.getApiEndpoint()}`;
            const response = await fetch(url);
            const result = await response.json();

            if (result.success) {
                if (result.options) this.lookups = result.options;
                if (result.activeOptions) this.activeLookups = result.activeOptions;
                if (result.years) this.years = result.years;
                
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

    /* Переопределяем reloadData для обновления списка годов */
    async reloadData() {
        try {
            const url = `${CONFIG.API_BASE_URL}${this.getApiEndpoint()}`;
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.success) {
                if (result.options) this.lookups = result.options;
                if (result.activeOptions) this.activeLookups = result.activeOptions;
                if (result.years) this.years = result.years;
                this.table.setData(result.data);
            }
        } catch (error) {
            this.showNotification('Ошибка обновления данных', 'error');
        }
    }

    /* Пересчёт всей строки: данные из Битрикс + contracts + вычисляемые поля */
    async recalculateRow(id, buttonElement) {
        try {
            /* Показываем индикатор загрузки */
            if (buttonElement) {
                buttonElement.innerHTML = '⏳';
                buttonElement.disabled = true;
            }
            
            const url = `${CONFIG.API_BASE_URL}${this.getApiEndpoint()}?action=recalculate`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id })
            });
            
            const result = await response.json();
            
            if (result.success) {
                /* Обновляем данные в строке */
                const row = this.table.getRow(id);
                if (row) {
                    row.update(result.data);
                }
                
                const bitrixInfo = result.bitrix_id ? ` (Битрикс ID: ${result.bitrix_id})` : ' (без Битрикс)';
                this.showNotification(`Данные обновлены за ${result.period}${bitrixInfo}`, 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Ошибка пересчёта:', error);
            this.showNotification('Ошибка: ' + error.message, 'error');
        } finally {
            /* Восстанавливаем кнопку */
            if (buttonElement) {
                buttonElement.innerHTML = '<img src="/assets/refresh.svg" alt="Обновить"/>';
                buttonElement.disabled = false;
            }
        }
    }

    /* Обработчики событий на элементах таблицы */
    bindTableEvents() {
        const tableElement = document.querySelector(this.getTableSelector());
        if (!tableElement) return;

        /* Остановка всплытия события mousedown, чтобы редактор (list editor) не открывался при клике на кнопку */
        tableElement.addEventListener('mousedown', (e) => {
            const refreshBtn = e.target.closest('.refresh-cell-btn');
            if (refreshBtn) {
                e.stopPropagation();
                e.stopImmediatePropagation(); /* Добавлено для Tabulator 6.x */
            }
        }, true);

        /* Обработчик для мобильных устройств */
        tableElement.addEventListener('touchend', (e) => {
            const refreshBtn = e.target.closest('.refresh-cell-btn');
            if (refreshBtn) {
                e.stopPropagation();
                e.preventDefault();
                
                const id = refreshBtn.getAttribute('data-id');
                if (id) {
                    this.recalculateRow(id, refreshBtn);
                }
            }
        }, true);

        tableElement.addEventListener('click', async (e) => {
            /* Обработчик для кнопки пересчёта строки */
            const refreshBtn = e.target.closest('.refresh-cell-btn');
            if (refreshBtn) {
                e.stopPropagation();
                e.preventDefault();
                
                const id = refreshBtn.getAttribute('data-id');
                if (id) {
                    await this.recalculateRow(id, refreshBtn);
                }
                return;
            }
        }, true);
    }

}

/* Инициализация при загрузке страницы */
document.addEventListener('DOMContentLoaded', () => {
    new SalesDataTable();
});