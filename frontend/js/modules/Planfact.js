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

    getResourceName() {
        return 'planfact';
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
            /* Зависимости для процентов */
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
            'budget_fact': 'budget_percent',
            'target_lead_price_plan': 'target_lead_price_percent',
            'target_lead_price_fact': 'target_lead_price_percent',
            'qual_lead_price_plan': 'qual_lead_price_percent',
            'qual_lead_price_fact': 'qual_lead_price_percent',
            'meeting_price_plan': 'meeting_price_percent',
            'meeting_price_fact': 'meeting_price_percent',
            'contract_price_plan': 'contract_price_percent',
            'contract_price_fact': 'contract_price_percent'
        };
    }

    /* Зависимости для расчёта стоимостных показателей (price_fact = budget_fact / count_fact) */
    getPriceDependencies() {
        return {
            'target_lead_price_fact': { budgetField: 'budget_fact', countField: 'target_lead_fact' },
            'qual_lead_price_fact': { budgetField: 'budget_fact', countField: 'qual_lead_fact' },
            'meeting_price_fact': { budgetField: 'budget_fact', countField: 'meetings_fact' },
            'contract_price_fact': { budgetField: 'budget_fact', countField: 'contracts_fact' }
        };
    }

    /* Какие price_fact поля нужно пересчитать при изменении данного поля */
    getFieldsToPriceRecalc() {
        return {
            'budget_fact': ['target_lead_price_fact', 'qual_lead_price_fact', 'meeting_price_fact', 'contract_price_fact'],
            'target_lead_fact': ['target_lead_price_fact'],
            'qual_lead_fact': ['qual_lead_price_fact'],
            'meetings_fact': ['meeting_price_fact'],
            'contracts_fact': ['contract_price_fact']
        };
    }

    /* Конфигурация конверсий: поле → { numerator, denominator } */
    getConversionConfig() {
        return {
            'cr_target_qual_plan': { numerator: 'qual_lead_plan', denominator: 'target_lead_plan' },
            'cr_target_qual_fact': { numerator: 'qual_lead_fact', denominator: 'target_lead_fact' },
            'cr_qual_meet_plan': { numerator: 'meetings_plan', denominator: 'qual_lead_plan' },
            'cr_qual_meet_fact': { numerator: 'meetings_fact', denominator: 'qual_lead_fact' },
            'cr_meet_contract_plan': { numerator: 'contracts_plan', denominator: 'meetings_plan' },
            'cr_meet_contract_fact': { numerator: 'contracts_fact', denominator: 'meetings_fact' },
            'cr_target_contract_plan': { numerator: 'contracts_plan', denominator: 'target_lead_plan' },
            'cr_target_contract_fact': { numerator: 'contracts_fact', denominator: 'target_lead_fact' }
        };
    }

    /* Какие конверсии пересчитать при изменении поля */
    getFieldsToConversionRecalc() {
        return {
            'target_lead_plan': ['cr_target_qual_plan', 'cr_target_contract_plan'],
            'qual_lead_plan': ['cr_target_qual_plan', 'cr_qual_meet_plan'],
            'meetings_plan': ['cr_qual_meet_plan', 'cr_meet_contract_plan'],
            'contracts_plan': ['cr_meet_contract_plan', 'cr_target_contract_plan'],
            'target_lead_fact': ['cr_target_qual_fact', 'cr_target_contract_fact'],
            'qual_lead_fact': ['cr_target_qual_fact', 'cr_qual_meet_fact'],
            'meetings_fact': ['cr_qual_meet_fact', 'cr_meet_contract_fact'],
            'contracts_fact': ['cr_meet_contract_fact', 'cr_target_contract_fact']
        };
    }

    getSelectFilters() {
        return {};
    }

    getFieldDisplayName(field) {
        const names = { 'date': 'Дата' };
        return names[field] || field;
    }

    getColumnGroups() {
        return [
            {
                title: 'Выручка',
                fields: ['revenue_plan', 'revenue_fact', 'revenue_percent']
            },
            {
                title: 'Договоры',
                fields: ['contracts_plan', 'contracts_fact', 'contracts_percent']
            },
            {
                title: 'Стоимость договора',
                fields: ['contract_price_plan', 'contract_price_fact', 'contract_price_percent']
            },
            {
                title: 'Встречи',
                fields: ['meetings_plan', 'meetings_fact', 'meetings_percent']
            },
            {
                title: 'Стоимость встречи',
                fields: ['meeting_price_plan', 'meeting_price_fact', 'meeting_price_percent']
            },
            {
                title: 'Целевые лиды',
                fields: ['target_lead_plan', 'target_lead_fact', 'target_lead_percent']
            },
            {
                title: 'Стоимость целевого лида',
                fields: ['target_lead_price_plan', 'target_lead_price_fact', 'target_lead_price_percent']
            },
            {
                title: 'Квал. лиды',
                fields: ['qual_lead_plan', 'qual_lead_fact', 'qual_lead_percent']
            },
            {
                title: 'Стоимость квал. лида',
                fields: ['qual_lead_price_plan', 'qual_lead_price_fact', 'qual_lead_price_percent']
            },
            {
                title: 'Рекламный бюджет',
                fields: ['budget_plan', 'budget_fact', 'budget_percent']
            },

            {
                title: 'Конверсия Цел→Квал',
                fields: ['cr_target_qual_plan', 'cr_target_qual_fact']
            },
            {
                title: 'Конверсия Квал→Встр',
                fields: ['cr_qual_meet_plan', 'cr_qual_meet_fact']
            },
            {
                title: 'Конверсия Встр→Дог',
                fields: ['cr_meet_contract_plan', 'cr_meet_contract_fact']
            },
            {
                title: 'Конверсия Цел→Дог',
                fields: ['cr_target_contract_plan', 'cr_target_contract_fact']
            }
        ];
    }

    getColumnPresets() {
        return [
            { id: 'default', label: 'По умолчанию' },
            { id: 'all', label: 'Все' },
            { id: 'none', label: 'Ничего' },
            {
                id: 'target_leads',
                label: 'Целевые лиды',
                fields: [
                    'date',
                    'target_lead_plan', 'target_lead_fact', 'target_lead_percent',
                    'cr_target_qual_plan', 'cr_target_qual_fact',
                    'target_lead_price_plan', 'target_lead_price_fact', 'target_lead_price_percent'
                ]
            },
            {
                id: 'qual_leads',
                label: 'Квал. лиды',
                fields: [
                    'date',
                    'qual_lead_plan', 'qual_lead_fact', 'qual_lead_percent',
                    'cr_qual_meet_plan', 'cr_qual_meet_fact',
                    'qual_lead_price_plan', 'qual_lead_price_fact', 'qual_lead_price_percent'
                ]
            },
            {
                id: 'meetings',
                label: 'Встречи',
                fields: [
                    'date',
                    'meetings_plan', 'meetings_fact', 'meetings_percent',
                    'cr_meet_contract_plan', 'cr_meet_contract_fact',
                    'meeting_price_plan', 'meeting_price_fact', 'meeting_price_percent'
                ]
            },
            {
                id: 'contracts',
                label: 'Договоры',
                fields: [
                    'date',
                    'contracts_plan', 'contracts_fact', 'contracts_percent',
                    'cr_target_contract_plan', 'cr_target_contract_fact',
                    'contract_price_plan', 'contract_price_fact', 'contract_price_percent'
                ]
            }
        ];
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

        /* Калькулятор стоимости для итоговой строки: сумма бюджета / сумма количества */
        const priceBottomCalc = (values, data, calcParams) => {
            const budgetField = calcParams.budgetField;
            const countField = calcParams.countField;
            
            let totalBudget = 0;
            let totalCount = 0;
            
            data.forEach(row => {
                totalBudget += parseFloat(row[budgetField]) || 0;
                totalCount += parseFloat(row[countField]) || 0;
            });
            
            if (totalCount === 0) return '';
            return Math.round(totalBudget / totalCount);
        };

        /* Калькулятор конверсии для итоговой строки: сумма числителя / сумма знаменателя * 100 */
        const conversionBottomCalc = (values, data, calcParams) => {
            const numField = calcParams.numerator;
            const denField = calcParams.denominator;
            
            let totalNum = 0;
            let totalDen = 0;
            
            data.forEach(row => {
                totalNum += parseFloat(row[numField]) || 0;
                totalDen += parseFloat(row[denField]) || 0;
            });
            
            if (totalDen === 0) return '';
            return Math.round((totalNum / totalDen) * 100) + '%';
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
                title: "ВЫРУЧКА",
                columns: [
                    {
                        title: "План",
                        field: "revenue_plan",
                        width: 110,
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
                        width: 110,
                        headerSort: false,
                        editor: "number",
                        editorParams: { min: 0 },
                        formatter: cellWithRefreshFormatter,
                        formatterParams: { isMoney: true },
                        editable: true,
                        headerTooltip:"При нажатии кнопки загружаем выручку из Договоров",
                        cssClass: "cell-with-action",
                        bottomCalc: "sum",
                        bottomCalcFormatter: "money",
                        bottomCalcFormatterParams: { thousand: " ", precision: 0, decimal: "," }
                    },
                    {
                        title: "% вып",
                        field: "revenue_percent",
                        width: 70,
                        headerSort: false,
                        editable: false,
                        formatter: percentFormatter,
                        cssClass: "cell-calculated",
                        bottomCalc: percentBottomCalc,
                        bottomCalcParams: { planField: "revenue_plan", factField: "revenue_fact" }
                    },
                ]
             },
            {
                title: "ДОГОВОРЫ",
                columns: [
                    {
                        title: "План",
                        field: "contracts_plan",
                        width: 70,
                        headerSort: false,
                        editor: "number",
                        editorParams: { min: 0 },
                        editable: true,
                        bottomCalc: "sum",
                        cssClass: "cell-border-left"
                    },
                    {
                        title: "Факт",
                        field: "contracts_fact",
                        width: 70,
                        headerSort: false,
                        editor: "number",
                        editorParams: { min: 0 },
                        formatter: cellWithRefreshFormatter,
                        formatterParams: { isMoney: false },
                        editable: true,
                        headerTooltip:"При нажатии кнопки загружаем количество из Договоров",
                        cssClass: "cell-with-action",
                        bottomCalc: "sum"
                    },
                    {
                        title: "% вып",
                        field: "contracts_percent",
                        width: 70,
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
                title: "ВСТРЕЧИ",
                columns: [
                    {
                        title: "План",
                        field: "meetings_plan",
                        width: 70,
                        headerSort: false,
                        editor: "number",
                        editorParams: { min: 0 },
                        editable: true,
                        bottomCalc: "sum",
                        cssClass: "cell-border-left"
                    },
                                        {
                        title: "Факт",
                        field: "meetings_fact",
                        width: 70,
                        headerSort: false,
                        editor: "number",
                        editorParams: { min: 0 },
                        formatter: cellWithRefreshFormatter,
                        formatterParams: { isMoney: false },
                        editable: true,
                        headerTooltip:"При нажатии кнопки загружаем количество из Битрикса",
                        cssClass: "cell-with-action",
                        bottomCalc: "sum"
                    },
                    {
                        title: "% вып",
                        field: "meetings_percent",
                        width: 70,
                        headerSort: false,
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
                title: "ЦЕЛЕВЫЕ ЛИДЫ",
                columns: [
                    {
                        title: "План",
                        field: "target_lead_plan",
                        width: 70,
                        headerSort: false,
                        editor: "number",
                        editorParams: { min: 0 },
                        editable: true,
                        bottomCalc: "sum",
                        cssClass: "cell-border-left"
                    },
                    {
                        title: "Факт",
                        field: "target_lead_fact",
                        width: 70,
                        headerSort: false,
                        editor: "number",
                        editorParams: { min: 0 },
                        formatter: cellWithRefreshFormatter,
                        formatterParams: { isMoney: false },
                        editable: true,
                        headerTooltip:"При нажатии кнопки загружаем количество из Битрикса",
                        cssClass: "cell-with-action",
                        bottomCalc: "sum"
                    },
                    {
                        title: "% вып",
                        field: "target_lead_percent",
                        width: 70,
                        headerSort: false,
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
                title: "КВАЛ. ЛИДЫ",
                columns: [
                    {
                        title: "План",
                        field: "qual_lead_plan",
                        width: 70,
                        headerSort: false,
                        editor: "number",
                        editorParams: { min: 0 },
                        editable: true,
                        bottomCalc: "sum",
                        cssClass: "cell-border-left"
                    },
                    {
                        title: "Факт",
                        field: "qual_lead_fact",
                        width: 70,
                        headerSort: false,
                        editor: "number",
                        editorParams: { min: 0 },
                        formatter: cellWithRefreshFormatter,
                        formatterParams: { isMoney: false },
                        editable: true,
                        headerTooltip:"При нажатии кнопки загружаем количество из Битрикса",
                        cssClass: "cell-with-action",
                        bottomCalc: "sum"
                    },
                    {
                        title: "% вып",
                        field: "qual_lead_percent",
                        width: 70,
                        headerSort: false,
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
                title: "РЕКЛАМНЫЙ БЮДЖЕТ",
                columns: [
                    {
                        title: "План",
                        field: "budget_plan",
                        width: 120,
                        headerSort: false,
                        editor: "number",
                        editorParams: { min: 0 },
                        formatter: "money",
                        formatterParams: moneyParams,
                        editable: true,
                        headerTooltip:"Вводим вручную",
                        cssClass: "cell-border-left",
                        bottomCalc: "sum",
                        bottomCalcFormatter: "money",
                        bottomCalcFormatterParams: { thousand: " ", precision: 0, decimal: "," }
                    },
                    {
                        title: "Факт",
                        field: "budget_fact",
                        width: 120,
                        headerSort: false,
                        editor: "number",
                        editorParams: { min: 0 },
                        formatter: "money",
                        formatterParams: moneyParams,
                        editable: true,
                        headerTooltip:"Вводим вручную",
                        bottomCalc: "sum",
                        bottomCalcFormatter: "money",
                        bottomCalcFormatterParams: { thousand: " ", precision: 0, decimal: "," }
                    },
                    {
                        title: "% вып",
                        field: "budget_percent",
                        width: 70,
                        headerSort: false,
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
                title: "Цел→Квал",
                columns: [
                    {
                        title: "План",
                        field: "cr_target_qual_plan",
                        width: 70,
                        headerSort: false,
                        editable: false,
                        formatter: percentFormatter,
                        cssClass: "cell-calculated cell-border-left",
                        visible: false,
                        bottomCalc: conversionBottomCalc,
                        bottomCalcParams: { numerator: "qual_lead_plan", denominator: "target_lead_plan" }
                    },
                    {
                        title: "Факт",
                        field: "cr_target_qual_fact",
                        width: 70,
                        headerSort: false,
                        editable: false,
                        formatter: percentFormatter,
                        cssClass: "cell-calculated",
                        visible: false,
                        bottomCalc: conversionBottomCalc,
                        bottomCalcParams: { numerator: "qual_lead_fact", denominator: "target_lead_fact" }
                    }
                ]
            },
            {
                title: "Квал→Встр",
                columns: [
                    {
                        title: "План",
                        field: "cr_qual_meet_plan",
                        width: 70,
                        headerSort: false,
                        editable: false,
                        formatter: percentFormatter,
                        cssClass: "cell-calculated",
                        visible: false,
                        bottomCalc: conversionBottomCalc,
                        bottomCalcParams: { numerator: "meetings_plan", denominator: "qual_lead_plan" }
                    },
                    {
                        title: "Факт",
                        field: "cr_qual_meet_fact",
                        width: 70,
                        headerSort: false,
                        editable: false,
                        formatter: percentFormatter,
                        cssClass: "cell-calculated",
                        visible: false,
                        bottomCalc: conversionBottomCalc,
                        bottomCalcParams: { numerator: "meetings_fact", denominator: "qual_lead_fact" }
                    }
                ]
            },
            {
                title: "Встр→Дог",
                columns: [
                    {
                        title: "План",
                        field: "cr_meet_contract_plan",
                        width: 70,
                        headerSort: false,
                        editable: false,
                        formatter: percentFormatter,
                        cssClass: "cell-calculated",
                        visible: false,
                        bottomCalc: conversionBottomCalc,
                        bottomCalcParams: { numerator: "contracts_plan", denominator: "meetings_plan" }
                    },
                    {
                        title: "Факт",
                        field: "cr_meet_contract_fact",
                        width: 70,
                        headerSort: false,
                        editable: false,
                        formatter: percentFormatter,
                        cssClass: "cell-calculated",
                        visible: false,
                        bottomCalc: conversionBottomCalc,
                        bottomCalcParams: { numerator: "contracts_fact", denominator: "meetings_fact" }
                    }
                ]
            },
            {
                title: "Цел→Дог",
                columns: [
                    {
                        title: "План",
                        field: "cr_target_contract_plan",
                        width: 70,
                        headerSort: false,
                        editable: false,
                        formatter: percentFormatter,
                        cssClass: "cell-calculated",
                        visible: false,
                        bottomCalc: conversionBottomCalc,
                        bottomCalcParams: { numerator: "contracts_plan", denominator: "target_lead_plan" }
                    },
                    {
                        title: "Факт",
                        field: "cr_target_contract_fact",
                        width: 70,
                        headerSort: false,
                        editable: false,
                        formatter: percentFormatter,
                        cssClass: "cell-calculated",
                        visible: false,
                        bottomCalc: conversionBottomCalc,
                        bottomCalcParams: { numerator: "contracts_fact", denominator: "target_lead_fact" }
                    }
                ]
            },

            {
                title: "СТОИМОСТЬ ЦЕЛ. ЛИДА",
                columns: [
                    {
                        title: "План",
                        field: "target_lead_price_plan",
                        width: 100,
                        headerSort: false,
                        editor: "number",
                        editorParams: { min: 0 },
                        formatter: "money",
                        formatterParams: moneyParams,
                        editable: true,
                        cssClass: "cell-border-left",
                        bottomCalc: priceBottomCalc,
                        bottomCalcParams: { budgetField: "budget_plan", countField: "target_lead_plan" },
                        bottomCalcFormatter: "money",
                        bottomCalcFormatterParams: { thousand: " ", precision: 0, decimal: "," },
                        visible: false
                    },
                    {
                        title: "Факт",
                        field: "target_lead_price_fact",
                        width: 100,
                        headerSort: false,
                        editor: "number",
                        editorParams: { min: 0 },
                        formatter: "money",
                        formatterParams: moneyParams,
                        editable: true,
                        headerTooltip:"Пересчитываем автоматически при изменении показателей",
                        bottomCalc: priceBottomCalc,
                        bottomCalcParams: { budgetField: "budget_fact", countField: "target_lead_fact" },
                        bottomCalcFormatter: "money",
                        bottomCalcFormatterParams: { thousand: " ", precision: 0, decimal: "," },
                        visible: false
                    },
                    {
                        title: "% вып",
                        field: "target_lead_price_percent",
                        width: 70,
                        headerSort: false,
                        editable: false,
                        formatter: percentFormatter,
                        cssClass: "cell-calculated",
                        bottomCalc: percentBottomCalc,
                        bottomCalcParams: { planField: "target_lead_price_plan", factField: "target_lead_price_fact" },
                        visible: false
                    }
                ]
            },
            {
                title: "СТОИМОСТЬ КВАЛ. ЛИДА",
                columns: [
                    {
                        title: "План",
                        field: "qual_lead_price_plan",
                        width: 100,
                        headerSort: false,
                        editor: "number",
                        editorParams: { min: 0 },
                        formatter: "money",
                        formatterParams: moneyParams,
                        editable: true,
                        cssClass: "cell-border-left",
                        bottomCalc: priceBottomCalc,
                        bottomCalcParams: { budgetField: "budget_plan", countField: "qual_lead_plan" },
                        bottomCalcFormatter: "money",
                        bottomCalcFormatterParams: { thousand: " ", precision: 0, decimal: "," },
                        visible: false
                    },
                    {
                        title: "Факт",
                        field: "qual_lead_price_fact",
                        width: 100,
                        headerSort: false,
                        editor: "number",
                        editorParams: { min: 0 },
                        formatter: "money",
                        formatterParams: moneyParams,
                        editable: true,
                        headerTooltip:"Пересчитываем автоматически при изменении показателей",
                        bottomCalc: priceBottomCalc,
                        bottomCalcParams: { budgetField: "budget_fact", countField: "qual_lead_fact" },
                        bottomCalcFormatter: "money",
                        bottomCalcFormatterParams: { thousand: " ", precision: 0, decimal: "," },
                        visible: false
                    },
                    {
                        title: "% вып",
                        field: "qual_lead_price_percent",
                        width: 70,
                        headerSort: false,
                        editable: false,
                        formatter: percentFormatter,
                        cssClass: "cell-calculated",
                        bottomCalc: percentBottomCalc,
                        bottomCalcParams: { planField: "qual_lead_price_plan", factField: "qual_lead_price_fact" },
                        visible: false
                    }
                ]
            },
            {
                title: "СТОИМОСТЬ ВСТРЕЧИ",
                columns: [
                    {
                        title: "План",
                        field: "meeting_price_plan",
                        width: 100,
                        headerSort: false,
                        editor: "number",
                        editorParams: { min: 0 },
                        formatter: "money",
                        formatterParams: moneyParams,
                        editable: true,
                        cssClass: "cell-border-left",
                        bottomCalc: priceBottomCalc,
                        bottomCalcParams: { budgetField: "budget_plan", countField: "meetings_plan" },
                        bottomCalcFormatter: "money",
                        bottomCalcFormatterParams: { thousand: " ", precision: 0, decimal: "," },
                        visible: false
                    },
                    {
                        title: "Факт",
                        field: "meeting_price_fact",
                        width: 100,
                        headerSort: false,
                        editor: "number",
                        editorParams: { min: 0 },
                        formatter: "money",
                        formatterParams: moneyParams,
                        editable: true,
                        headerTooltip:"Пересчитываем автоматически при изменении показателей",
                        bottomCalc: priceBottomCalc,
                        bottomCalcParams: { budgetField: "budget_fact", countField: "meetings_fact" },
                        bottomCalcFormatter: "money",
                        bottomCalcFormatterParams: { thousand: " ", precision: 0, decimal: "," },
                        visible: false
                    },
                    {
                        title: "% вып",
                        field: "meeting_price_percent",
                        width: 70,
                        headerSort: false,
                        editable: false,
                        formatter: percentFormatter,
                        cssClass: "cell-calculated",
                        bottomCalc: percentBottomCalc,
                        bottomCalcParams: { planField: "meeting_price_plan", factField: "meeting_price_fact" },
                        visible: false
                    }
                ]
            },
            {
                title: "СТОИМОСТЬ ДОГОВОРА",
                columns: [
                    {
                        title: "План",
                        field: "contract_price_plan",
                        width: 100,
                        headerSort: false,
                        editor: "number",
                        editorParams: { min: 0 },
                        formatter: "money",
                        formatterParams: moneyParams,
                        editable: true,
                        cssClass: "cell-border-left",
                        bottomCalc: priceBottomCalc,
                        bottomCalcParams: { budgetField: "budget_plan", countField: "contracts_plan" },
                        bottomCalcFormatter: "money",
                        bottomCalcFormatterParams: { thousand: " ", precision: 0, decimal: "," },
                        visible: false
                    },
                    {
                        title: "Факт",
                        field: "contract_price_fact",
                        width: 100,
                        headerSort: false,
                        editor: "number",
                        editorParams: { min: 0 },
                        formatter: "money",
                        formatterParams: moneyParams,
                        editable: true,
                        headerTooltip:"Пересчитываем автоматически при изменении показателей",
                        bottomCalc: priceBottomCalc,
                        bottomCalcParams: { budgetField: "budget_fact", countField: "contracts_fact" },
                        bottomCalcFormatter: "money",
                        bottomCalcFormatterParams: { thousand: " ", precision: 0, decimal: "," },
                        visible: false
                    },
                    {
                        title: "% вып",
                        field: "contract_price_percent",
                        width: 70,
                        headerSort: false,
                        editable: false,
                        formatter: percentFormatter,
                        cssClass: "cell-calculated",
                        bottomCalc: percentBottomCalc,
                        bottomCalcParams: { planField: "contract_price_plan", factField: "contract_price_fact" },
                        visible: false
                    }
                ]
            },

            {
                title: "ID",
                field: "id",
                width: 80,
                headerSort: false,
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

        /* Кнопка "Пересчитать всё" */
        const recalcAllBtn = document.getElementById('recalc-all-btn');
        if (recalcAllBtn) {
            recalcAllBtn.addEventListener('click', () => this.recalcAll());
        }
    }

    onCellEdited(cell) {
        const field = cell.getField();
        const row = cell.getRow();
        const rowData = row.getData();
        const rowId = rowData.id;
        
        /* 1. Пересчёт процента для изменённого поля */
        const dependencies = this.getCalculatedFieldsDependencies();
        const percentField = dependencies[field];
        
        if (percentField) {
            const prefix = percentField.replace('_percent', '');
            const planField = prefix + '_plan';
            const factField = prefix + '_fact';
            
            const percentValue = this.calculatePercent(rowData[planField], rowData[factField]);
            
            row.update({ [percentField]: percentValue });
            this.updatePercentField(rowId, percentField, percentValue);
        }
        
        /* 2. Пересчёт стоимостных показателей */
        const fieldsToPriceRecalc = this.getFieldsToPriceRecalc();
        const priceFieldsToUpdate = fieldsToPriceRecalc[field];
        
        if (priceFieldsToUpdate) {
            const priceDependencies = this.getPriceDependencies();
            const updatedData = row.getData(); /* Получаем актуальные данные после update */
            const fieldsToSave = {};
            
            priceFieldsToUpdate.forEach(priceField => {
                const deps = priceDependencies[priceField];
                const budgetValue = parseFloat(updatedData[deps.budgetField]) || 0;
                const countValue = parseFloat(updatedData[deps.countField]) || 0;
                
                /* Расчёт: бюджет / количество */
                const priceValue = countValue > 0 ? Math.round(budgetValue / countValue) : null;
                
                fieldsToSave[priceField] = priceValue;
                
                /* Также пересчитываем процент для стоимости */
                const pricePercentField = priceField.replace('_fact', '_percent');
                const pricePlanField = priceField.replace('_fact', '_plan');
                const pricePercentValue = this.calculatePercent(updatedData[pricePlanField], priceValue);
                
                fieldsToSave[pricePercentField] = pricePercentValue;
            });
            
            /* Обновляем UI */
            row.update(fieldsToSave);
            
            /* Сохраняем в БД */
            this.savePriceFields(rowId, fieldsToSave);
        }
        
        /* 3. Пересчёт конверсий */
        const conversionFields = this.getFieldsToConversionRecalc()[field];
        if (conversionFields) {
            const convConfig = this.getConversionConfig();
            const currentData = row.getData();
            const convFieldsToSave = {};

            conversionFields.forEach(crField => {
                const cfg = convConfig[crField];
                const num = parseFloat(currentData[cfg.numerator]) || 0;
                const den = parseFloat(currentData[cfg.denominator]) || 0;
                convFieldsToSave[crField] = den > 0 ? Math.round((num / den) * 100) : null;
            });

            row.update(convFieldsToSave);
            this.savePriceFields(rowId, convFieldsToSave);
        }

        /* 4. Вызываем сохранение основного поля */
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
                const fieldNames = {
                    'revenue_fact': 'Выручка',
                    'contracts_fact': 'Договоры',
                    'meetings_fact': 'Встречи',
                    'qual_lead_fact': 'Квал. лиды',
                    'target_lead_fact': 'Целевые лиды'
                };
                this.showNotification(`${fieldNames[field] || field}: ${result.value.toLocaleString('ru-RU')}`, 'success');
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

    async savePriceFields(rowId, fields) {
        try {
            const url = `${CONFIG.API_BASE_URL}${this.getApiEndpoint()}`;
            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: rowId,
                    ...fields
                })
            });
            
            const result = await response.json();
            if (!result.success) {
                console.error('Ошибка сохранения стоимостных полей:', result.error);
            }
        } catch (error) {
            console.error('Ошибка сохранения стоимостных полей:', error);
        }
    }


async recalcAll() {
        const rows = this.table.getRows();
        if (!rows.length) return;

        this.showNotification('Пересчёт...', 'info');
        const convConfig = this.getConversionConfig();
        const priceDeps = this.getPriceDependencies();
        let count = 0;

        for (const row of rows) {
            const d = row.getData();
            const updates = {};

            /* Проценты выполнения */
            const percentPairs = [
                ['revenue', 'revenue'], ['contracts', 'contracts'], ['meetings', 'meetings'],
                ['target_lead', 'target_lead'], ['qual_lead', 'qual_lead'], ['budget', 'budget'],
                ['target_lead_price', 'target_lead_price'], ['qual_lead_price', 'qual_lead_price'],
                ['meeting_price', 'meeting_price'], ['contract_price', 'contract_price']
            ];
            percentPairs.forEach(([prefix]) => {
                const plan = parseFloat(d[prefix + '_plan']) || 0;
                const fact = parseFloat(d[prefix + '_fact']) || 0;
                updates[prefix + '_percent'] = plan > 0 ? Math.round((fact / plan) * 100) : null;
            });

            /* Стоимостные факт-поля */
            Object.entries(priceDeps).forEach(([field, cfg]) => {
                const budget = parseFloat(d[cfg.budgetField]) || 0;
                const cnt = parseFloat(d[cfg.countField]) || 0;
                updates[field] = cnt > 0 ? Math.round(budget / cnt) : null;
            });

            /* Конверсии */
            Object.entries(convConfig).forEach(([field, cfg]) => {
                const num = parseFloat(d[cfg.numerator]) || 0;
                const den = parseFloat(d[cfg.denominator]) || 0;
                updates[field] = den > 0 ? Math.round((num / den) * 100) : null;
            });

            row.update(updates);

            /* Сохраняем в БД */
            try {
                const url = `${CONFIG.API_BASE_URL}${this.getApiEndpoint()}`;
                await fetch(url, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: d.id, ...updates })
                });
                count++;
            } catch (e) {
                console.error('Ошибка сохранения строки', d.id, e);
            }
        }

        this.showNotification(`Пересчитано: ${count} строк`, 'success');
    }
}