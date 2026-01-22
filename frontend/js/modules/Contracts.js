import BaseTable from '../core/BaseTable.js';

export class ContractsTable extends BaseTable {
    constructor() {
        super();
        this.bindSearchInput();
    }
    
    getApiEndpoint() {
        return CONFIG.ENDPOINTS.CONTRACTS;
    }

    getTableSelector() {
        return "#contracts-table";
    }

    getNewRowData() {
        const today = new Date().toISOString().split('T')[0]; /* Формат YYYY-MM-DD */
        return {
            contract_name: 'Новый договор',
            contract_date: today,
            is_active: 1
        };
    }

    getNameField() {
        return "contract_name";
    }

    getDefaultSort() {
        return [{column: "contract_date", dir: "desc"}];
    }

    getResourceName() {
        return 'contracts';
    }

    getCalculatedFieldsDependencies() {
        return {
            'profit': true,
            'final_amount': true
        };
    }

    /* 
    Зависимости для расчёта ЗП:
    - manager_zp = contract_amount * manager_percent / 100
    - sop_zp = contract_amount * sop_percent / 100
    - manager_balance = manager_zp - manager_paid
    - sop_balance = sop_zp - sop_paid
    */
    getSalaryDependencies() {
        return {
            /* Поля ЗП, которые зависят от изменения указанных полей */
            'contract_amount': ['manager_zp', 'sop_zp'],
            'manager_percent': ['manager_zp'],
            'sop_percent': ['sop_zp'],
            'manager_paid': ['manager_balance'],
            'sop_paid': ['sop_balance']
        };
    }

    /* Формулы для расчёта полей ЗП */
    getSalaryFormulas() {
        return {
            'manager_zp': (data) => {
                const amount = parseFloat(data.contract_amount) || 0;
                const percent = parseFloat(data.manager_percent) || 0;
                return Math.round(amount * percent / 100);
            },
            'sop_zp': (data) => {
                const amount = parseFloat(data.contract_amount) || 0;
                const percent = parseFloat(data.sop_percent) || 0;
                return Math.round(amount * percent / 100);
            },
            'manager_balance': (data) => {
                const zp = parseFloat(data.manager_zp) || 0;
                const paid = parseFloat(data.manager_paid) || 0;
                return Math.round(zp - paid);
            },
            'sop_balance': (data) => {
                const zp = parseFloat(data.sop_zp) || 0;
                const paid = parseFloat(data.sop_paid) || 0;
                return Math.round(zp - paid);
            }
        };
    }

    getSelectFilters() {
        return {
            is_active: {
                label: 'В работе',
                options: [
                    { value: '1', label: 'Да' },
                    { value: '0', label: 'Нет' }
                ]
            },
            complectation_id: {
                label: 'Комплектация',
                options: this.lookups.complectation || {}
            },
            payment_type_id: {
                label: 'Тип оплаты',
                options: this.lookups.payment_types || {}
            },

            ipoteka_status_id: {
                label: 'Статус ипотеки',
                options: this.lookups.ipoteka_status || {}
            },
            source_id: {
                label: 'Источник',
                options: this.lookups.sources || {},
                searchable: true
            },
            manager_id: {
                label: 'Менеджер',
                options: this.lookups.managers || {}
            }
        };
    }

    getColumns() {
        
        /* 
            Хелпер для параметров редактора списков
            - activeLookupData: только активные записи для выбора
            - allLookupData: все записи (для сохранения текущего значения если оно неактивно)
        */
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
                },
                /* Если текущее значение неактивно, добавляем его в список */
                valueLookup: (value) => {
                    if (value === null || value === undefined || value === '') return null;
                    const numValue = isNaN(value) ? value : Number(value);
                    const activeLabel = (activeLookupData || {})[numValue];
                    if (activeLabel) return { label: activeLabel, value: numValue };
                    const allLabel = (allLookupData || {})[numValue];
                    if (allLabel) return { label: allLabel + ' (неактивен)', value: numValue };
                    return null;
                }
            };
        };

        // Хелпер для многострочного текста
        const textareaParams = {
            shiftEnterSubmit: true,  // Shift+Enter сохраняет
            verticalNavigation: "editor", // Стрелки управляют курсором внутри текста
            elementAttributes: {
                style: "min-height: 120px; line-height: 1.4;" // Делаем поле высоким сразу при открытии
            }
        };

        return [
            {
                title: "Название договора", 
                field: "contract_name", 
                width: 300, 
                sorter: "string", 
                editor: "input", 
                editable: true, 
                frozen: true,
                cssClass: "tabulator-cell-contract-name cell-with-action",
                formatter: (cell) => {
                    const value = cell.getValue();
                    const rowData = cell.getRow().getData();

                    return `<span class="cell-content">${value || ''}</span>
                            <button class="open-contract-btn" data-id="${rowData.id}" title="Открыть договор">
                                <img src="/assets/arrow-right.svg" alt="Открыть"/>
                            </button>`;
                }
            },

            {
                title: "В работе",
                field: "is_active",
                width: 100,
                sorter: "number",
                editor: "list",
                editorParams: {
                    values: [
                        { label: "Да", value: 1 },
                        { label: "Нет", value: 0 }
                    ],
                    clearable: false,
                    listOnEmpty: true
                },
                editable: true,
                formatter: (cell) => {
                    const value = cell.getValue();
                    if (value === 1 || value === "1") {
                        return '<span style="color: #10935B; font-weight: 500;">Да</span>';
                    } else if (value === 0 || value === "0") {
                        return '<span style="color: #868e96;">Нет</span>';
                    }
                    return '';
                }
            },

            {
                title: "Сумма договора",
                field: "contract_amount",
                width: 120,
                sorter: "number",
                editor: "number",
                editorParams: {
                    min: 0,
                    step: 0.01
                },
                editable: true,
                formatter: "money",
                formatterParams: {
                    thousand: " ",
                    precision: 0,
                    decimal: ","
                },
                cssClass: "cell-text-left"
            },

            {
                title: "Комплектация",
                field: "complectation_id",
                width: 150,
                sorter: "number",
                formatter: "lookup",
                formatterParams: this.lookups.complectation,
                editor: "list",
                editorParams: listEditorParams(this.activeLookups.complectation, this.lookups.complectation)
            },

            {
                title: "Тип оплаты",
                field: "payment_type_id",
                width: 130,
                sorter: "number",
                formatter: "lookup",
                formatterParams: this.lookups.payment_types,
                editor: "list",
                editorParams: listEditorParams(this.activeLookups.payment_types, this.lookups.payment_types)
            },

            {
                title: "Статус ипотеки",
                field: "ipoteka_status_id",
                width: 150,
                sorter: "number",
                formatter: "lookup",
                formatterParams: this.lookups.ipoteka_status,
                editor: "list",
                editorParams: listEditorParams(this.activeLookups.ipoteka_status, this.lookups.ipoteka_status),
                cssClass: "cell-text-left"
            },

            {
                title: "Эскроу агент",
                field: "escrow_agent_id",
                width: 150,
                sorter: "number",
                formatter: "lookup",
                formatterParams: this.lookups.escrow_agents,
                editor: "list",
                editorParams: listEditorParams(this.activeLookups.escrow_agents, this.lookups.escrow_agents)
            }, 

            {
                title: "Номер эскроу",
                field: "escrow_number",
                width: 150,
                sorter: "string",
                editor: "input",
                editable: true
            },

            {
                title: "Источник",
                field: "source_id",
                width: 130,
                sorter: "number",
                formatter: "lookup",
                formatterParams: this.lookups.sources,
                editor: "list",
                editorParams: listEditorParams(this.activeLookups.sources, this.lookups.sources)
            }, 

            {
                title: "Менеджер",
                field: "manager_id",
                width: 120,
                sorter: "number",
                formatter: "lookup",
                formatterParams: this.lookups.managers,
                editor: "list",
                editorParams: listEditorParams(this.activeLookups.managers, this.lookups.managers)
            }, 

            {

                title: "Даты",
                columns: [
                    {
                        title: "Дата лида",
                        field: "lead_date",
                        width: 100,
                        sorter: "date",
                        sorterParams: {
                            format: "yyyy-MM-dd",
                            alignEmptyValues: "bottom"
                        },
                        formatter: "datetime",
                        formatterParams: {
                            inputFormat: "yyyy-MM-dd",
                            outputFormat: "dd.MM.yyyy",
                            invalidPlaceholder: ""
                        },
                        editor: "date",
                        editorParams: {
                            format: "yyyy-MM-dd"
                        },
                        editable: true,
                        visible: false
                    },

                    {
                        title: "Дата договора",
                        field: "contract_date",
                        width: 100,
                        sorter: "date",
                        sorterParams: {
                            format: "yyyy-MM-dd",
                            alignEmptyValues: "bottom"
                        },
                        formatter: "datetime",
                        formatterParams: {
                            inputFormat: "yyyy-MM-dd",
                            outputFormat: "dd.MM.yyyy",
                            invalidPlaceholder: ""
                        },
                        editor: "date",
                        editorParams: {
                            format: "yyyy-MM-dd"
                        },
                        editable: true
                    },

                    {
                        title: "Дата заезда",
                        field: "construction_start_date",
                        width: 100,
                        sorter: "date",
                        sorterParams: {
                            format: "yyyy-MM-dd",
                            alignEmptyValues: "bottom"
                        },
                        formatter: "datetime",
                        formatterParams: {
                            inputFormat: "yyyy-MM-dd",
                            outputFormat: "dd.MM.yyyy",
                            invalidPlaceholder: ""
                        },
                        editor: "date",
                        editorParams: {
                            format: "yyyy-MM-dd"
                        },
                        editable: true
                    },

                    {
                        title: "Дата сдачи",
                        field: "delivery_date",
                        width: 100,
                        sorter: "date",
                        sorterParams: {
                            format: "yyyy-MM-dd",
                            alignEmptyValues: "bottom"
                        },
                        formatter: "datetime",
                        formatterParams: {
                            inputFormat: "yyyy-MM-dd",
                            outputFormat: "dd.MM.yyyy",
                            invalidPlaceholder: ""
                        },
                        editor: "date",
                        editorParams: {
                            format: "yyyy-MM-dd"
                        },
                        editable: true
                    },
                    {
                        title: "Крайний срок по договору",
                        field: "contract_duration",
                        width: 110,
                        sorter: "date",
                        sorterParams: {
                            format: "yyyy-MM-dd",
                            alignEmptyValues: "bottom"
                        },
                        formatter: "datetime",
                        formatterParams: {
                            inputFormat: "yyyy-MM-dd",
                            outputFormat: "dd.MM.yyyy",
                            invalidPlaceholder: ""
                        },
                        editor: "date",
                        editorParams: {
                            format: "yyyy-MM-dd"
                        },
                        editable: true
                    },
                ]
            },

            
            
            {
                title: "Сумма с допками",
                field: "final_amount",
                width: 140,
                sorter: "number",
                editor: "number",
                editorParams: {
                    min: 0,
                    step: 0.01
                },
                editable: true,
                visible: false,
                cssClass: "cell-with-action",
                formatter: (cell) => {
                    const value = cell.getValue();
                    const rowData = cell.getRow().getData();
                    
                    let displayValue = '';
                    if (value !== null && value !== undefined && value !== '') {
                        displayValue = Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 0 });
                    }
                    
                    /* Показываем кнопку только если есть adesk_project_id */
                    const hasAdesk = rowData.adesk_project_id;
                    const buttonHtml = hasAdesk 
                        ? `<button class="refresh-adesk-btn" data-id="${rowData.id}" data-adesk-id="${rowData.adesk_project_id}" data-field="final_amount" title="Загрузить из Adesk">
                                <img src="/assets/refresh.svg" alt="Обновить"/>
                        </button>`
                        : '';
                    
                    return `<span class="cell-content">${displayValue}</span>${buttonHtml}`;
                }
            },

            {
                title: "Прибыль",
                field: "profit",
                width: 140,
                sorter: "number",
                editor: "number",
                editorParams: {
                    step: 0.01
                },
                editable: true,
                visible: false,
                cssClass: "cell-with-action",
                formatter: (cell) => {
                    const value = cell.getValue();
                    const rowData = cell.getRow().getData();
                    
                    let displayValue = '';
                    if (value !== null && value !== undefined && value !== '') {
                        displayValue = Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 0 });
                    }
                    
                    /* Показываем кнопку только если есть adesk_project_id */
                    const hasAdesk = rowData.adesk_project_id;
                    const buttonHtml = hasAdesk 
                        ? `<button class="refresh-adesk-btn" data-id="${rowData.id}" data-adesk-id="${rowData.adesk_project_id}" data-field="profit" title="Загрузить из Adesk">
                                    <img src="/assets/refresh.svg" alt="Обновить"/>
                            </button>`
                        : '';
                    
                    return `<span class="cell-content">${displayValue}</span>${buttonHtml}`;
                }
            },

            {
                title: "Маржинальность",
                field: "margin_percent",
                width: 120,
                sorter: "number",
                editable: false,
                visible: false,
                mutator: (value, data) => {
                    const profit = parseFloat(data.profit);
                    const finalAmount = parseFloat(data.final_amount);
                    if (!isNaN(profit) && !isNaN(finalAmount) && finalAmount !== 0) {
                        return (profit / finalAmount * 100).toFixed(1);
                    }
                    return null;
                },
                formatter: (cell) => {
                    const value = cell.getValue();
                    if (value === null || value === undefined || value === '') {
                        return '';
                    }
                    return value + '%';
                }
            },
        

            {
                title: "Заказчик",
                field: "customer_name",
                width: 150,
                sorter: "string",
                editor: "input",
                editable: true,
                visible: false
            },

            {
                title: "Телефон",
                field: "customer_phone",
                width: 130,
                sorter: "string",
                editor: "input",
                editable: true,
                visible: false
            },

            {
                title: "Адрес",
                field: "site_address",
                width: 200,
                sorter: "string",
                editor: "textarea",
                editorParams: textareaParams, // Используем наш новый конфиг
                editable: true,
                formatter: "textarea",
                visible: false,
                cssClass: "cell-text-left"
            },

            {
                title: "АР КР готовность",
                field: "ar_ready",
                width: 150,
                sorter: "string",
                editor: "textarea",
                editorParams: textareaParams,
                formatter: "textarea",
                editable: true,
                visible: false,
                cssClass: "cell-text-left"
            },

            {
                title: "KR готов",
                field: "kr_ready",
                width: 90,
                sorter: "string",
                editor: "list",
                editorParams: {
                    values: {
                        "да": "да",
                        "нет": "нет",
                        "в процессе": "в процессе"
                    }
                },
                editable: true,
                visible: false
            },

            {
                title: "Смета готова",
                field: "estimate_ready",
                width: 110,
                sorter: "string",
                editor: "list",
                editorParams: {
                    values: {
                        "да": "да",
                        "нет": "нет",
                        "в процессе": "в процессе"
                    }
                },
                editable: true,
                visible: false
            },

            {
                title: "Фундамент",
                field: "foundation",
                width: 120,
                sorter: "string",
                editor: "input",
                editable: true,
                visible: false,
                cssClass: "cell-text-left"
            },

            {
                title: "Проект",
                field: "project_id",
                width: 150,
                sorter: "number",
                formatter: "lookup",
                formatterParams: this.lookups.projects,
                editor: "list",
                editorParams: listEditorParams(this.lookups.projects, this.lookups.projects),
                visible: false
            }, 


            {
                title: "Создан",
                field: "created_at",
                width: 140,
                sorter: "datetime",
                sorterParams: {
                    format: "yyyy-MM-dd HH:mm:ss",
                    alignEmptyValues: "bottom"
                },
                formatter: "datetime",
                formatterParams: {
                    inputFormat: "yyyy-MM-dd HH:mm:ss",
                    outputFormat: "dd.MM.yyyy HH:mm",
                    invalidPlaceholder: ""
                },
                editable: false,
                visible: false
            },

            {
                title: "Обновлен",
                field: "updated_at",
                width: 140,
                sorter: "datetime",
                sorterParams: {
                    format: "yyyy-MM-dd HH:mm:ss",
                    alignEmptyValues: "bottom"
                },
                formatter: "datetime",
                formatterParams: {
                    inputFormat: "yyyy-MM-dd HH:mm:ss",
                    outputFormat: "dd.MM.yyyy HH:mm",
                    invalidPlaceholder: ""
                },
                editable: false,
                visible: false
            },

            {
                title: "Комментарий",
                field: "comment",
                width: 200,
                editor: "textarea",
                editorParams: textareaParams, // Используем наш новый конфиг
                formatter: "textarea",
                visible: true,
                cssClass: "cell-text-left"
            },

            {
                title: "Кадастровый номер",
                field: "cadastral_number",
                width: 150,
                editor: "input",
                visible: false,
                cssClass: "cell-text-left"
            },
            
            {
                title: "Координаты",
                field: "site_coordinates",
                width: 150,
                editor: "input",
                visible: false,
                cssClass: "cell-text-left"
            },

            {
                title: "Ссылка на карту",
                field: "site_map_link",
                width: 150,
                editor: "input",
                formatter: "link",
                visible: false
            },

            {
                title: "Доп поле 1",
                field: "custom_field_1",
                width: 120,
                editor: "input",
                visible: false
            },

            {
                title: "Доп поле 2",
                field: "custom_field_2",
                width: 120,
                editor: "input",
                visible: false
            },

            {
                title: "Накидка",
                field: "custom_field_3",
                width: 120,
                editor: "input",
                visible: false
            },

            {
                title: "Создал",
                field: "created_by",
                width: 100,
                sorter: "number",
                editable: false,
                visible: false
            },

            {
                title: "Adesk Project ID",
                field: "adesk_project_id",
                width: 130,
                sorter: "number",
                editor: "number",
                editable: true,
                visible: false
            },

            {
                title: "Обновил",
                field: "updated_by",
                width: 100,
                sorter: "number",
                editable: false,
                visible: false
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
                title: "СОП",
                field: "sop_id",
                width: 120,
                sorter: "number",
                formatter: "lookup",
                formatterParams: this.lookups.managers,
                editor: "list",
                editorParams: listEditorParams(this.lookups.managers),
                visible: false
            },
            
            {
                title: "% менеджера",
                field: "manager_percent",
                width: 100,
                sorter: "number",
                editor: "number",
                editorParams: { min: 0, max: 100, step: 0.1 },
                editable: true,
                visible: false,
                formatter: (cell) => {
                    const value = cell.getValue();
                    return value !== null && value !== '' ? value + '%' : '';
                }
            },
            {
                title: "ЗП менеджера",
                field: "manager_zp",
                width: 120,
                sorter: "number",
                editable: false,
                visible: false,
                formatter: "money",
                formatterParams: { thousand: " ", precision: 0, decimal: "," },
                cssClass: "cell-calculated"
            },
            {
                title: "Выплачено менеджеру",
                field: "manager_paid",
                width: 160,
                sorter: "number",
                editable: false,
                visible: false,
                formatter: (cell) => {
                    const value = cell.getValue();
                    const rowData = cell.getRow().getData();
                    
                    let displayValue = '';
                    if (value !== null && value !== undefined && value !== '') {
                        displayValue = Number(value).toLocaleString('ru-RU');
                    }
                    
                    return `<span class="cell-content">${displayValue}</span>
                            <button class="refresh-adesk-btn" 
                                    data-id="${rowData.id}" 
                                    data-field="manager_paid" 
                                    title="Загрузить из Adesk">
                                <img src="/assets/refresh.svg" alt="Обновить"/>
                            </button>`;
                },
                cssClass: "cell-with-action"
            },
            {
                title: "Остаток менеджеру",
                field: "manager_balance",
                width: 140,
                sorter: "number",
                editable: false,
                visible: false,
                formatter: "money",
                formatterParams: { thousand: " ", precision: 0, decimal: "," },
                cssClass: "cell-calculated"
            },
            {
                title: "% СОП",
                field: "sop_percent",
                width: 100,
                sorter: "number",
                editor: "number",
                editorParams: { min: 0, max: 100, step: 0.1 },
                editable: true,
                visible: false,
                formatter: (cell) => {
                    const value = cell.getValue();
                    return value !== null && value !== '' ? value + '%' : '';
                }
            },
            {
                title: "ЗП СОП",
                field: "sop_zp",
                width: 120,
                sorter: "number",
                editable: false,
                visible: false,
                formatter: "money",
                formatterParams: { thousand: " ", precision: 0, decimal: "," },
                cssClass: "cell-calculated"
            },
            {
                title: "Выплачено СОП",
                field: "sop_paid",
                width: 150,
                sorter: "number",
                editable: false,
                visible: false,
                formatter: (cell) => {
                    const value = cell.getValue();
                    const rowData = cell.getRow().getData();
                    
                    let displayValue = '';
                    if (value !== null && value !== undefined && value !== '') {
                        displayValue = Number(value).toLocaleString('ru-RU');
                    }
                    
                    return `<span class="cell-content">${displayValue}</span>
                            <button class="refresh-adesk-btn" 
                                    data-id="${rowData.id}" 
                                    data-field="sop_paid" 
                                    title="Загрузить из Adesk">
                                <img src="/assets/refresh.svg" alt="Обновить"/>
                            </button>`;
                },
                cssClass: "cell-with-action"
            },
            {
                title: "Остаток СОП",
                field: "sop_balance",
                width: 130,
                sorter: "number",
                editable: false,
                visible: false,
                formatter: "money",
                formatterParams: { thousand: " ", precision: 0, decimal: "," },
                cssClass: "cell-calculated"
            }
            
        ];
        
    }

    bindSearchInput() {
        const searchInput = document.getElementById('search-contract-name');
        if (!searchInput) return;

        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const value = e.target.value.trim();
                if (value) {
                    this.table.setFilter('contract_name', 'like', value);
                } else {
                    this.table.clearFilter(true); /* Сбрасываем все фильтры по полю */
                    this.applyAllFilters(); /* Восстанавливаем активные фильтры из activeFilters */
                }
            }, 300);
        });
    }

    onCellEdited(cell) {
        const field = cell.getField();
        const row = cell.getRow();
        const rowData = row.getData();
        const rowId = rowData.id;
        
        /* 1. Проверяем, влияет ли изменённое поле на расчёт ЗП */
        const salaryDeps = this.getSalaryDependencies();
        const fieldsToRecalc = salaryDeps[field];
        
        if (fieldsToRecalc) {
            const formulas = this.getSalaryFormulas();
            const fieldsToSave = {};
            
            /* Обновляем данные в rowData с новым значением */
            const updatedData = { ...rowData, [field]: cell.getValue() };
            
            fieldsToRecalc.forEach(targetField => {
                const formula = formulas[targetField];
                if (formula) {
                    const newValue = formula(updatedData);
                    fieldsToSave[targetField] = newValue;
                    updatedData[targetField] = newValue; /* Для каскадных расчётов */
                }
            });
            
            /* Каскадный пересчёт остатков после изменения ЗП */
            if (fieldsToSave['manager_zp'] !== undefined) {
                fieldsToSave['manager_balance'] = formulas['manager_balance'](updatedData);
            }
            if (fieldsToSave['sop_zp'] !== undefined) {
                fieldsToSave['sop_balance'] = formulas['sop_balance'](updatedData);
            }
            
            /* Обновляем UI */
            row.update(fieldsToSave);
            
            /* Сохраняем в БД */
            this.saveSalaryFields(rowId, fieldsToSave);
        }
        
        /* 2. Стандартная логика BaseTable */
        this.showNotification(`Изменено поле: ${field}`, 'success');
        this.saveChanges(cell);
    }

    async saveSalaryFields(rowId, fields) {
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
                console.error('Ошибка сохранения ЗП полей:', result.error);
            }
        } catch (error) {
            console.error('Ошибка сохранения ЗП полей:', error);
        }
    }

    /* Возвращает конфигурацию групп колонок для селектора */
    getColumnGroups() {
    
    const groups = [
        // return [
            
            {
                title: 'Основное',
                fields: ['contract_name', 'complectation_id', 'source_id', 'manager_id', 'sop_id', 'comment', 'is_active']
            },
            {
                title: 'Финансы',
                fields: ['contract_amount', 'final_amount', 'profit', 'margin_percent']
            },
            {
                title: 'Ипотека',
                fields: ['payment_type_id', 'escrow_agent_id', 'ipoteka_status_id', 'escrow_number']
            },
            {
                title: 'Даты',
                fields: ['lead_date', 'contract_date', 'construction_start_date', 'delivery_date', 'contract_duration']
            },
            {
                title: 'Участок',
                fields: ['site_address', 'site_coordinates', 'site_map_link', 'cadastral_number']
            },
            {
                title: 'Заказчик',
                fields: ['customer_name', 'customer_phone']
            },
            {
                title: 'Строительство',
                fields: ['ar_ready', 'kr_ready', 'estimate_ready', 'foundation', 'project_id']
            },
            
            {
                title: 'ЗП менеджер',
                fields: ['manager_percent', 'manager_zp', 'manager_paid', 'manager_balance']
            },
            {
                title: 'ЗП СОП',
                fields: ['sop_percent', 'sop_zp', 'sop_paid', 'sop_balance']
            },
            
            {
                title: 'Разное',
                fields: ['custom_field_1', 'custom_field_2', 'custom_field_3', 'created_by', 'updated_by', 'created_at', 'updated_at']
            },
            {
                title: 'ID',
                fields: ['id', 'adesk_project_id']
            }
        ];

        return groups;
    }

    getColumnPresets() {
        return [
            { id: 'default', label: 'По умолчанию' },
            { id: 'all', label: 'Все' },
            { id: 'none', label: 'Ничего' },
            { 
                id: 'finance', 
                label: 'Ипотека', 
                fields: [
                    'contract_name', 
                    'payment_type_id', 
                    'ipoteka_status_id', 
                    'escrow_agent_id', 
                    'escrow_number', 
                    'manager_id'
                ] 
            },
            { 
                id: 'dates', 
                label: 'Даты и деньги', 
                fields: [
                    'contract_name', 
                    'contract_amount', 
                    'lead_date', 
                    'contract_date', 
                    'construction_start_date', 
                    'delivery_date', 
                    'contract_duration', 
                    'final_amount', 
                    'profit', 
                    'margin_percent',
                    'custom_field_3'
                ] 
            },
            { 
                id: 'land_and_client', 
                label: 'Участок и заказчик', 
                fields: [
                    'contract_name',
                    'customer_name',
                    'customer_phone',
                    'cadastral_number', 
                    'site_coordinates', 
                    'site_map_link'
                ] 
            },
            { 
                id: 'zp', 
                label: 'Зарплаты', 
                fields: [
                    'contract_name',
                    'comment',
                    'contract_amount',
                    'manager_id', 
                    'manager_percent', 
                    'manager_zp', 
                    'manager_paid', 
                    'manager_balance',
                    'sop_id', 
                    'sop_percent', 
                    'sop_zp', 
                    'sop_paid', 
                    'sop_balance',
                ] 
            }
        ];
    }

    async fetchFromAdesk(contractId, adeskProjectId, field, buttonElement) {
        try {
            /* Показываем индикатор загрузки */
            const originalImg = buttonElement.innerHTML;
            buttonElement.innerHTML = '⏳';
            buttonElement.disabled = true;
            
            const url = `${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.ADESK}?action=get_project_income&project_id=${adeskProjectId}`;
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.success) {
                const data = result.data;
                console.log('Adesk response:', data, 'field:', field);
                let value, fieldName;
                
                if (field === 'final_amount') {
                    value = data.income;
                    fieldName = 'Сумма с допками';
                } else if (field === 'profit') {
                    value = data.profit;
                    fieldName = 'Прибыль';
                }
                
                /* Обновляем значение в таблице */
                const row = this.table.getRow(contractId);
                if (row) {
                    row.update({ [field]: value });
                    
                    /* Сохраняем в БД */
                    await this.saveFieldToServer(contractId, field, value);
                    
                    this.showNotification(`${fieldName}: ${value.toLocaleString('ru-RU')} ₽`, 'success');
                }
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Ошибка загрузки из Adesk:', error);
            this.showNotification('Ошибка: ' + error.message, 'error');
        } finally {
            if (buttonElement) {
                buttonElement.innerHTML = '<img src="/assets/refresh.svg" alt="Обновить"/>';
                buttonElement.disabled = false;
            }
        }
    }

    async fetchSalaryFromAdesk(contractId, field, buttonElement) {
        try {
            /* Показываем индикатор загрузки */
            buttonElement.innerHTML = '⏳';
            buttonElement.disabled = true;
            
            /* Получаем данные строки */
            const row = this.table.getRow(contractId);
            if (!row) throw new Error('Строка не найдена');
            
            const rowData = row.getData();
            const adeskProjectId = rowData.adesk_project_id;
            
            /* Проверяем наличие adesk_project_id */
            if (!adeskProjectId) {
                throw new Error('Не указан Adesk Project ID');
            }
            
            /* Определяем чей adesk_id нужен */
            let managerId, managerField;
            if (field === 'manager_paid') {
                managerId = rowData.manager_id;
                managerField = 'Менеджер';
            } else {
                managerId = rowData.sop_id;
                managerField = 'СОП';
            }
            
            /* Проверяем что менеджер/СОП указан */
            if (!managerId) {
                throw new Error(`Поле "${managerField}" не заполнено`);
            }
            
            /* Получаем adesk_id менеджера из lookups или делаем запрос */
            const adeskId = await this.getManagerAdeskId(managerId);
            if (!adeskId) {
                throw new Error(`У ${managerField.toLowerCase()}а не указан Adesk ID`);
            }
            
            /* Запрашиваем расходы из Adesk */
            const url = `${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.ADESK}?action=get_contractor_expenses&project_id=${adeskProjectId}&contractor_id=${adeskId}`;
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.success) {
                const paidValue = result.data.total;
                
                /* Обновляем поле в таблице */
                const fieldsToUpdate = { [field]: paidValue };
                
                /* Пересчитываем остаток */
                const formulas = this.getSalaryFormulas();
                const updatedData = { ...rowData, [field]: paidValue };
                
                if (field === 'manager_paid') {
                    fieldsToUpdate['manager_balance'] = formulas['manager_balance'](updatedData);
                } else {
                    fieldsToUpdate['sop_balance'] = formulas['sop_balance'](updatedData);
                }
                
                row.update(fieldsToUpdate);
                
                /* Сохраняем в БД */
                await this.saveSalaryFields(contractId, fieldsToUpdate);
                
                this.showNotification(`${managerField}: выплачено ${paidValue.toLocaleString('ru-RU')} ₽`, 'success');
            } else {
                throw new Error(result.error || 'Ошибка загрузки данных');
            }
        } catch (error) {
            console.error('Ошибка загрузки из Adesk:', error);
            this.showNotification('Ошибка: ' + error.message, 'error');
        } finally {
            /* Восстанавливаем кнопку */
            buttonElement.innerHTML = '<img src="/assets/refresh.svg" alt="Обновить"/>';
            buttonElement.disabled = false;
        }
    }

    async getManagerAdeskId(managerId) {
        /* Сначала проверяем есть ли в lookups расширенные данные */
        if (this.managersData && this.managersData[managerId]) {
            return this.managersData[managerId].adesk_id;
        }
        
        /* Если нет, делаем запрос к API */
        try {
            const url = `${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.SETTINGS}?table=managers&id=${managerId}`;
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.success && result.data) {
                return result.data.adesk_id;
            }
        } catch (error) {
            console.error('Ошибка получения adesk_id менеджера:', error);
        }
        
        return null;
    }

    async saveFieldToServer(id, field, value) {
        const url = `${CONFIG.API_BASE_URL}${this.getApiEndpoint()}`;
        await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, [field]: value })
        });
    }

    bindTableEvents() {
        const tableElement = document.querySelector(this.getTableSelector());
        if (!tableElement) return;

        /* Обработчик для мобильных устройств — touchend срабатывает раньше, чем Tabulator запускает редактор */
        tableElement.addEventListener('touchend', (e) => {
            const openBtn = e.target.closest('.open-contract-btn');
            if (openBtn) {
                e.preventDefault();
                e.stopPropagation();
                const id = openBtn.getAttribute('data-id');
                if (id) {
                    window.location.href = `/contract.php?id=${id}`;
                }
            }
        }, true);

        tableElement.addEventListener('click', async (e) => {
            /* Обработчик для кнопки загрузки из Adesk */
            const adeskBtn = e.target.closest('.refresh-adesk-btn');
            if (adeskBtn) {
                e.stopPropagation();
                e.preventDefault();
                
                const contractId = adeskBtn.getAttribute('data-id');
                const field = adeskBtn.getAttribute('data-field');
                
                /* Для полей выплат используем новый метод */
                if (field === 'manager_paid' || field === 'sop_paid') {
                    await this.fetchSalaryFromAdesk(contractId, field, adeskBtn);
                } else {
                    /* Для остальных полей (final_amount, profit) - старый метод */
                    const adeskProjectId = adeskBtn.getAttribute('data-adesk-id');
                    if (contractId && adeskProjectId && field) {
                        await this.fetchFromAdesk(contractId, adeskProjectId, field, adeskBtn);
                    }
                }
                return;
            }

            /* Обработчик для кнопки открытия договора */
            const openBtn = e.target.closest('.open-contract-btn');
            if (openBtn) {
                e.stopPropagation();
                e.preventDefault();
                const id = openBtn.getAttribute('data-id');
                if (id) {
                    window.location.href = `/contract.php?id=${id}`;
                }
                return;
            }
        }, true);
    }
}