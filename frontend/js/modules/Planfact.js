import BaseTable from '../core/BaseTable.js';

export class PlanfactTable extends BaseTable {
    constructor() {
        super();
    }

    getApiEndpoint() {
        return CONFIG.ENDPOINTS.PLANFACT;
    }

    getTableSelector() {
        return "#planfact-table";
    }

    getNewRowData() {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
            date: firstDayOfMonth.toISOString().split('T')[0]
        };
    }

    getNameField() {
        return "date";
    }

    getDefaultSort() {
        return [{column: "date", dir: "asc"}];
    }

    getGroupConfig() {
        return {
            groupBy: (data) => {
                if (!data.date) return "Без даты";
                const date = new Date(data.date);
                return date.getFullYear().toString();
            },
            
            groupHeader: (value, count, data, group) => {
                return `<span style="font-weight: 600;">${value} год</span> <span style="margin-left: 10px;">(${count} ${this.getRecordWord(count)})</span>`;
            },
            
            groupStartOpen: true,
            groupToggleElement: "header"
        };
    }

    getCalculatedFieldsDependencies() {
        return {
            'revenue_plan': 'revenue_percent',
            'revenue_fact': 'revenue_percent',
            'contracts_plan': 'contracts_percent',
            'contracts_fact': 'contracts_percent',
            'meetings_plan': 'meetings_percent',
            'meetings_fact': 'meetings_percent',
            'target_lead_plan': 'target_lead_percent',
            'target_lead_fact': 'target_lead_percent',
            'qual_lead_plan': 'qual_lead_percent',
            'qual_lead_fact': 'qual_lead_percent',
            'budget_plan': 'budget_percent',
            'budget_fact': 'budget_percent'
        };
    }

    getSelectFilters() {
        return {};
    }

    getFieldDisplayName(field) {
        const names = { 'date': 'Дата' };
        return names[field] || field;
    }

    getColumns() {
        /* Хелпер для форматирования процентов */
        const percentFormatter = (cell) => {
        const value = cell.getValue();
        if (value === null || value === undefined || value === '') return '';
        return Math.round(parseFloat(value)) + '%';
        };

        /* Калькулятор процента для итоговой строки */
        const percentBottomCalc = (values, data, calcParams) => {
            const planField = calcParams.planField;
            const factField = calcParams.factField;
            
            let totalPlan = 0;
            let totalFact = 0;
            
            data.forEach(row => {
                totalPlan += parseFloat(row[planField]) || 0;
                totalFact += parseFloat(row[factField]) || 0;
            });
            
            if (totalPlan === 0) return '';
            return Math.round((totalFact / totalPlan) * 100) + '%';
        };

        /* Хелпер для форматирования денег */
        const moneyParams = { thousand: " ", precision: 0, decimal: "," };

        /* Хелпер для ячейки с кнопкой обновления */
        const cellWithRefreshFormatter = (cell, formatterParams) => {
            const value = cell.getValue();
            const rowData = cell.getRow().getData();
            const field = cell.getField();
            
            let displayValue = '';
            if (value !== null && value !== undefined && value !== '') {
                if (formatterParams && formatterParams.isMoney) {
                    displayValue = Number(value).toLocaleString('ru-RU');
                } else {
                    displayValue = value;
                }
            }
            
            return `<span class="cell-content">${displayValue}</span>
                    <button class="refresh-cell-btn" data-id="${rowData.id}" data-field="${field}" title="Пересчитать">
                        <img src="/assets/refresh.svg" alt="Обновить"/>
                    </button>`;
        };

        return [
            {
                title: "Дата",
                field: "date",
                width: 120,
                sorter: "date",
                sorterParams: { format: "yyyy-MM-dd", alignEmptyValues: "bottom" },
                formatter: "datetime",
                formatterParams: { inputFormat: "yyyy-MM-dd", outputFormat: "MM.yyyy", invalidPlaceholder: "" },
                editor: "date",
                editorParams: { format: "yyyy-MM-dd" },
                editable: true,
                frozen: true
            },
            {
                title: "Выручка",
                columns: [
                    {
                        title: "План",
                        field: "revenue_plan",
                        width: 130,
                        headerSort: false,
                        editor: "number",
                        editorParams: { min: 0 },
                        formatter: "money",
                        formatterParams: moneyParams,
                        editable: true,
                        bottomCalc: "sum",
                        bottomCalcFormatter: "money",
                        bottomCalcFormatterParams: { thousand: " ", precision: 0, decimal: "," }
                    },
                    {
                        title: "Факт",
                        field: "revenue_fact",
                        width: 150,
                        headerSort: false,
                        editor: "number",
                        editorParams: { min: 0 },
                        formatter: cellWithRefreshFormatter,
                        formatterParams: { isMoney: true },
                        editable: true,
                        cssClass: "cell-with-action",
                        bottomCalc: "sum",
                        bottomCalcFormatter: "money",
                        bottomCalcFormatterParams: { thousand: " ", precision: 0, decimal: "," }
                    },
                    {
                        title: "% вып",
                        field: "revenue_percent",
                        width: 100,
                        headerSort: false,
                        editable: false,
                        formatter: percentFormatter,
                        editable: true,
                        cssClass: "cell-calculated",
                        bottomCalc: percentBottomCalc,
                        bottomCalcParams: { planField: "revenue_plan", factField: "revenue_fact" }
                    },
                ]
             },
            {
                title: "Договоры",
                columns: [
                    {
                        title: "План",
                        field: "contracts_plan",
                        width: 130,
                        headerSort: false,
                        editor: "number",
                        editorParams: { min: 0 },
                        editable: true,
                        bottomCalc: "sum"
                    },
                    {
                        title: "Факт",
                        field: "contracts_fact",
                        width: 150,
                        headerSort: false,
                        editor: "number",
                        editorParams: { min: 0 },
                        formatter: cellWithRefreshFormatter,
                        formatterParams: { isMoney: false },
                        editable: true,
                        cssClass: "cell-with-action",
                        bottomCalc: "sum"
                    },
                    {
                        title: "% вып",
                        field: "contracts_percent",
                        width: 100,
                        headerSort: false,
                        editable: false,
                        editorParams: { min: 0, max: 1000, step: 0.1 },
                        formatter: percentFormatter,
                        editable: true,
                        cssClass: "cell-calculated",
                        bottomCalc: percentBottomCalc,
                        bottomCalcParams: { planField: "contracts_plan", factField: "contracts_fact" }
                    },
                ]
            },
            {
                title: "Встречи",
                columns: [
                    {
                        title: "План",
                        field: "meetings_plan",
                        width: 120,
                        sorter: "number",
                        editor: "number",
                        editorParams: { min: 0 },
                        editable: true,
                        bottomCalc: "sum"
                    },
                                        {
                        title: "Факт",
                        field: "meetings_fact",
                        width: 150,
                        headerSort: false,
                        editor: "number",
                        editorParams: { min: 0 },
                        formatter: cellWithRefreshFormatter,
                        formatterParams: { isMoney: false },
                        editable: true,
                        cssClass: "cell-with-action",
                        bottomCalc: "sum"
                    },
                    {
                        title: "% вып",
                        field: "meetings_percent",
                        width: 100,
                        sorter: "number",
                        editable: false,
                        editorParams: { min: 0, max: 1000, step: 0.1 },
                        formatter: percentFormatter,
                        editable: true,
                        cssClass: "cell-calculated",
                        bottomCalc: percentBottomCalc,
                        bottomCalcParams: { planField: "meetings_plan", factField: "meetings_fact" }
                    },
                ]
            },
            {
                title: "Целевые лиды",
                columns: [
            {
                title: "План",
                field: "target_lead_plan",
                width: 140,
                sorter: "number",
                editor: "number",
                editorParams: { min: 0 },
                editable: true,
                bottomCalc: "sum"
            },
            {
                title: "Факт",
                field: "target_lead_fact",
                width: 140,
                sorter: "number",
                editor: "number",
                editorParams: { min: 0 },
                editable: true,
                bottomCalc: "sum"
            },
            {
                title: "% вып",
                field: "target_lead_percent",
                width: 120,
                sorter: "number",
                editable: false,
                editorParams: { min: 0, max: 1000, step: 0.01 },
                formatter: percentFormatter,
                editable: true,
                cssClass: "cell-calculated",
                bottomCalc: percentBottomCalc,
                bottomCalcParams: { planField: "target_lead_plan", factField: "target_lead_fact" }
            },
                ]
            },
            {
                title: "Квал. лиды",
                columns: [
                    {
                        title: "План",
                        field: "qual_lead_plan",
                        width: 130,
                        sorter: "number",
                        editor: "number",
                        editorParams: { min: 0 },
                        editable: true,
                        bottomCalc: "sum"
                    },
                    {
                        title: "Факт",
                        field: "qual_lead_fact",
                        width: 130,
                        sorter: "number",
                        editor: "number",
                        editorParams: { min: 0 },
                        editable: true,
                        bottomCalc: "sum"
                    },
                    {
                        title: "% вып",
                        field: "qual_lead_percent",
                        width: 110,
                        sorter: "number",
                        editable: false,
                        editorParams: { min: 0, max: 1000, step: 0.01 },
                        formatter: percentFormatter,
                        editable: true,
                        cssClass: "cell-calculated",
                        bottomCalc: percentBottomCalc,
                        bottomCalcParams: { planField: "qual_lead_plan", factField: "qual_lead_fact" }
                    },
                ]
            },
            {
                title: "Бюджет",
                columns: [
                    {
                        title: "План",
                        field: "budget_plan",
                        width: 120,
                        sorter: "number",
                        editor: "number",
                        editorParams: { min: 0 },
                        formatter: "money",
                        formatterParams: moneyParams,
                        editable: true,
                        bottomCalc: "sum",
                        bottomCalcFormatter: "money",
                        bottomCalcFormatterParams: { thousand: " ", precision: 0, decimal: "," }
                    },
                    {
                        title: "Факт",
                        field: "budget_fact",
                        width: 120,
                        sorter: "number",
                        editor: "number",
                        editorParams: { min: 0 },
                        formatter: "money",
                        formatterParams: moneyParams,
                        editable: true,
                        bottomCalc: "sum",
                        bottomCalcFormatter: "money",
                        bottomCalcFormatterParams: { thousand: " ", precision: 0, decimal: "," }
                    },
                    {
                        title: "% вып",
                        field: "budget_percent",
                        width: 100,
                        sorter: "number",
                        editable: false,
                        editorParams: { min: 0, max: 1000, step: 0.01 },
                        formatter: percentFormatter,
                        editable: true,
                        cssClass: "cell-calculated",
                        bottomCalc: percentBottomCalc,
                        bottomCalcParams: { planField: "budget_plan", factField: "budget_fact" }
                    },
                ]
            },
            {
                title: "ID",
                field: "id",
                width: 80,
                sorter: "number",
                editable: false,
                visible: false
            },
            {
                title: "Создан",
                field: "created_at",
                width: 140,
                sorter: "datetime",
                sorterParams: { format: "yyyy-MM-dd HH:mm:ss", alignEmptyValues: "bottom" },
                formatter: "datetime",
                formatterParams: { inputFormat: "yyyy-MM-dd HH:mm:ss", outputFormat: "dd.MM.yyyy HH:mm", invalidPlaceholder: "" },
                editable: false,
                visible: false
            },
            {
                title: "Обновлен",
                field: "updated_at",
                width: 140,
                sorter: "datetime",
                sorterParams: { format: "yyyy-MM-dd HH:mm:ss", alignEmptyValues: "bottom" },
                formatter: "datetime",
                formatterParams: { inputFormat: "yyyy-MM-dd HH:mm:ss", outputFormat: "dd.MM.yyyy HH:mm", invalidPlaceholder: "" },
                editable: false,
                visible: false
            }
        ];
    }

    bindTableEvents() {
        const tableElement = document.querySelector(this.getTableSelector());
        if (!tableElement) return;

        tableElement.addEventListener('click', async (e) => {
            /* Обработчик для кнопки пересчёта */
            const refreshBtn = e.target.closest('.refresh-cell-btn');
            if (refreshBtn) {
                e.stopPropagation();
                e.preventDefault();
                
                const id = refreshBtn.getAttribute('data-id');
                const field = refreshBtn.getAttribute('data-field');
                
                if (id && field) {
                    await this.recalculateField(id, field, refreshBtn);
                }
                return;
            }
        }, true);
    }

    onCellEdited(cell) {
        const field = cell.getField();
        const row = cell.getRow();
        const rowData = row.getData();
        const rowId = rowData.id;
        
        /* Проверяем, нужно ли пересчитать процент */
        const dependencies = this.getCalculatedFieldsDependencies();
        const percentField = dependencies[field];
        
        if (percentField) {
            /* Определяем какие поля plan и fact использовать */
            const prefix = percentField.replace('_percent', '');
            const planField = prefix + '_plan';
            const factField = prefix + '_fact';
            
            const planValue = rowData[planField];
            const factValue = rowData[factField];
            
            const percentValue = this.calculatePercent(planValue, factValue);
            
            /* Обновляем значение в строке */
            row.update({ [percentField]: percentValue });
            
            /* Сохраняем процент в БД */
            this.updatePercentField(rowId, percentField, percentValue);
        }
        
        /* Вызываем родительский метод для сохранения основного поля */
        this.showNotification(`Изменено поле: ${field}`, 'success');
        this.saveChanges(cell);
    }

    async recalculateField(id, field, buttonElement) {
        try {
            /* Показываем индикатор загрузки */
            const originalImg = buttonElement.innerHTML;
            buttonElement.innerHTML = '⏳';
            buttonElement.disabled = true;
            
            const url = `${CONFIG.API_BASE_URL}${this.getApiEndpoint()}`;
            const response = await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id, field: field })
            });
            
            const result = await response.json();
            
            if (result.success) {
                /* Обновляем данные в строке */
                const row = this.table.getRow(id);
                if (row) {
                    row.update({ [field]: result.value });
                    
                    /* Пересчитываем процент */
                    const rowData = row.getData();
                    const prefix = field.replace('_fact', '').replace('_plan', '');
                    const percentField = prefix + '_percent';
                    const planField = prefix + '_plan';
                    const factField = prefix + '_fact';
                    
                    const percentValue = this.calculatePercent(rowData[planField], rowData[factField]);
                    row.update({ [percentField]: percentValue });
                    
                    /* Сохраняем процент в БД */
                    this.updatePercentField(id, percentField, percentValue);
                }
                this.showNotification(`${field === 'revenue_fact' ? 'Выручка' : 'Договоры'}: ${result.value.toLocaleString('ru-RU')}`, 'success');
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

    calculatePercent(planValue, factValue) {
        const plan = parseFloat(planValue);
        const fact = parseFloat(factValue);
        
        if (isNaN(plan) || isNaN(fact) || plan === 0) {
            return null;
        }
        
        /*return Math.round((fact / plan) * 100 * 100) / 100;  Округление до 2 знаков */
        return Math.round((fact / plan) * 100); /* Округление до целых */
    }

    async updatePercentField(rowId, percentField, percentValue) {
        try {
            const url = `${CONFIG.API_BASE_URL}${this.getApiEndpoint()}`;
            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: rowId,
                    [percentField]: percentValue
                })
            });
            
            const result = await response.json();
            if (!result.success) {
                console.error('Ошибка сохранения процента:', result.error);
            }
        } catch (error) {
            console.error('Ошибка сохранения процента:', error);
        }
    }
}