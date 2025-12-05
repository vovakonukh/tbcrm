import BaseTable from '../core/BaseTable.js';

export class ContractsTable extends BaseTable {
    constructor() {
        super();
    }
    
    getApiEndpoint() {
        return CONFIG.ENDPOINTS.CONTRACTS;
    }

    getTableSelector() {
        return "#contracts-table";
    }

    getNewRowData() {
        return {
            contract_name: 'Новый договор',
            is_active: 1
        };
    }

    getNameField() {
        return "contract_name";
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
        // Хелпер для параметров редактора списков
        // ПРЕОБРАЗУЕМ объект справочника в массив для точного совпадения типов (String vs Number)
        const listEditorParams = (lookupData) => {
            const values = Object.entries(lookupData || {}).map(([id, name]) => ({
                label: name,
                value: isNaN(id) ? id : Number(id) // Приводим ID к числу, чтобы совпало с данными в ячейке
            }));

            return {
                values: values,
                autocomplete: true, 
                clearable: true,
                listOnEmpty: true,
                freetext: false, // Запрещаем вводить то, чего нет в списке
                filterFunc: (term, label, value, item) => {
                    // Улучшенный поиск: ищем вхождение строки (case-insensitive)
                    return String(label).toLowerCase().indexOf(String(term).toLowerCase()) > -1;
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
                frozen:true,
                cssClass: "tabulator-cell-contract-name cell-with-delete",
                formatter: (cell) => {
                    const value = cell.getValue();
                    const rowData = cell.getRow().getData();

                    // Создаем контейнер с текстом и кнопкой
                    return `<span class="cell-content">${value || ''}</span>
                            <button class="delete-row-btn" data-id="${rowData.id}" title="Удалить запись">🗑️</button>`;
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
                }
            },

            {
                title: "Комплектация",
                field: "complectation_id",
                width: 150,
                sorter: "number",
                formatter: "lookup",
                formatterParams: this.lookups.complectation,
                editor: "list",
                editorParams: listEditorParams(this.lookups.complectation)
            },

            {
                title: "Тип оплаты",
                field: "payment_type_id",
                width: 130,
                sorter: "number",
                formatter: "lookup",
                formatterParams: this.lookups.payment_types,
                editor: "list",
                editorParams: listEditorParams(this.lookups.payment_types)
            },

            {
                title: "Эскроу агент",
                field: "escrow_agent_id",
                width: 150,
                sorter: "number",
                formatter: "lookup",
                formatterParams: this.lookups.escrow_agents,
                editor: "list",
                editorParams: listEditorParams(this.lookups.escrow_agents)
            }, 

            {
                title: "Источник",
                field: "source_id",
                width: 130,
                sorter: "number",
                formatter: "lookup",
                formatterParams: this.lookups.sources,
                editor: "list",
                editorParams: listEditorParams(this.lookups.sources)
            }, 

            {
                title: "Менеджер",
                field: "manager_id",
                width: 120,
                sorter: "number",
                formatter: "lookup",
                formatterParams: this.lookups.managers,
                editor: "list",
                editorParams: listEditorParams(this.lookups.managers)
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
                title: "Срок по договору",
                field: "contract_duration",
                width: 100,
                sorter: "number",
                editor: "number",
                editable: true
            },

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
                title: "AR готов",
                field: "ar_ready",
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
                editable: true
            },


            {
                title: "Бригада",
                field: "brigade_id",
                width: 150,
                sorter: "number",
                formatter: "lookup",
                formatterParams: this.lookups.brigades,
                editor: "list",
                editorParams: listEditorParams(this.lookups.brigades),
                visible: false
            },

            {
                title: "Проект",
                field: "project_id",
                width: 150,
                sorter: "number",
                formatter: "lookup",
                formatterParams: this.lookups.projects,
                editor: "list",
                editorParams: listEditorParams(this.lookups.projects),
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
                visible: false
            },

            {
                title: "Кадастровый номер",
                field: "cadastral_number",
                width: 150,
                editor: "input",
                visible: false
            }, {
                title: "Координаты",
                field: "site_coordinates",
                width: 150,
                editor: "input",
                visible: false
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
                title: "Обновил",
                field: "updated_by",
                width: 100,
                sorter: "number",
                editable: false,
                visible: false
            }
        ];
        
    }
}