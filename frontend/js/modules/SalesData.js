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
                width: 110,
                sorter: "number",
                formatter: (cell) => {
                    const value = cell.getValue();
                    return monthNames[value] || value;
                },
                editor: "list",
                editorParams: {
                    values: monthOptions,
                    clearable: false
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
}

/* Инициализация при загрузке страницы */
document.addEventListener('DOMContentLoaded', () => {
    new SalesDataTable();
});