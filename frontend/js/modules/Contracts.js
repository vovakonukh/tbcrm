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

    getCalculatedFieldsDependencies() {
        return {
            'profit': true,
            'final_amount': true
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

        /* Определяем, нужно ли скрывать поля зарплаты */
        const userRole = userService.getRole();
        const hideFinancialFields = (userRole === 'manager');
        
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
                ]
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
            /* Финансовые поля - скрыты для менеджеров */
            ...(hideFinancialFields ? [] : [
            {
                title: "Сумма с допками",
                field: "final_amount",
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
                }
            },

            {
                title: "Прибыль",
                field: "profit",
                width: 120,
                sorter: "number",
                editor: "number",
                editorParams: {
                    step: 0.01
                },
                editable: true,
                formatter: "money",
                formatterParams: {
                    thousand: " ",
                    precision: 0,
                    decimal: ","
                }
            },

            {
                title: "Маржинальность",
                field: "margin_percent",
                width: 120,
                sorter: "number",
                editable: false,
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
        ]),

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
                visible: false,
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
                title: "Доп поле 3",
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
            // Поля зарплат - показываем только админам и конструкторам
            ...(hideFinancialFields ? [] : [
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
                editor: "number",
                editable: true,
                visible: false,
                formatter: "money",
                formatterParams: { thousand: " ", precision: 0, decimal: "," }
            },
            {
                title: "Выплачено менеджеру",
                field: "manager_paid",
                width: 140,
                sorter: "number",
                editor: "number",
                editable: true,
                visible: false,
                formatter: "money",
                formatterParams: { thousand: " ", precision: 0, decimal: "," }
            },
            {
                title: "Остаток менеджеру",
                field: "manager_balance",
                width: 140,
                sorter: "number",
                editor: "number",
                editable: true,
                visible: false,
                formatter: "money",
                formatterParams: { thousand: " ", precision: 0, decimal: "," }
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
                editor: "number",
                editable: true,
                visible: false,
                formatter: "money",
                formatterParams: { thousand: " ", precision: 0, decimal: "," }
            },
            {
                title: "Выплачено СОП",
                field: "sop_paid",
                width: 130,
                sorter: "number",
                editor: "number",
                editable: true,
                visible: false,
                formatter: "money",
                formatterParams: { thousand: " ", precision: 0, decimal: "," }
            },
            {
                title: "Остаток СОП",
                field: "sop_balance",
                width: 130,
                sorter: "number",
                editor: "number",
                editable: true,
                visible: false,
                formatter: "money",
                formatterParams: { thousand: " ", precision: 0, decimal: "," }
            }
            ])
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

    /**
     * Возвращает конфигурацию групп колонок для селектора
     */
    getColumnGroups() {
            const userRole = userService.getRole();
            const hideFinancialFields = (userRole === 'manager');
    
    const groups = [
        // return [
            
            {
                title: 'Основное',
                fields: ['contract_name', 'complectation_id', 'source_id', 'manager_id', 'sop_id', 'comment', 'is_active']
            },
            {
                title: 'Финансы',
                fields: hideFinancialFields 
                    ? ['contract_amount'] 
                    : ['contract_amount', 'final_amount', 'profit', 'margin_percent']
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
            // Группы с зарплатами показываем только если не менеджер
            ...(hideFinancialFields ? [] : [
            {
                title: 'ЗП менеджер',
                fields: ['manager_percent', 'manager_zp', 'manager_paid', 'manager_balance']
            },
            {
                title: 'ЗП СОП',
                fields: ['sop_percent', 'sop_zp', 'sop_paid', 'sop_balance']
            },
            ]),
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
}