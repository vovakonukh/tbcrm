import BaseTable from '../core/BaseTable.js';

export class StagesTable extends BaseTable {
    constructor() {
        console.log('=== StagesTable constructor вызван ===');
        super();
    }

    getApiEndpoint() {
        return CONFIG.ENDPOINTS.STAGES;
    }

    getTableSelector() {
        return "#stages-table";
    }

    getNewRowData() {
        return {
            contract_id: 1, // Привязка к договору "Без договора"
            comment: 'Новый этап'
        };
    }

    getNameField() {
        return "comment";
    }

    getCalculatedFieldsDependencies() {
        return {
            'start_date': true,
            'end_date': true
        };
    }

    getSelectFilters() {
        return {
            contract_id: {
                label: 'Договор',
                options: this.lookups.contracts || {},
                searchable: true
            },

            project_id: {
                label: 'Проект',
                options: this.lookups.projects || {}
            },
            manager_id: {
                label: 'Менеджер',
                options: this.lookups.managers || {}
            },
            stage_type_id: {
                label: 'Тип этапа',
                options: this.lookups.stage_types || {}
            },
            brigade_id: {
                label: 'Бригада',
                options: this.lookups.brigades || {},
                searchable: true
            },
            prorab_id: {
                label: 'Прораб',
                options: this.lookups.prorabs || {}
            },
            status: {
                label: 'Статус',
                options: [
                    { value: 'планируется', label: 'Планируется' },
                    { value: 'в процессе', label: 'В процессе' },
                    { value: 'завершен', label: 'Завершен' },
                    { value: 'отменен', label: 'Отменен' }
                ]
            }
        };
    }

    getColumns() {
        console.log('=== StagesTable getColumns вызван ===');
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

        // Параметры для textarea редактора
        // shiftEnterSubmit: true - Shift+Enter сохраняет, Enter добавляет новую строку
        const textareaEditorParams = {
            shiftEnterSubmit: true,
            verticalNavigation: "editor",
            elementAttributes: {
                style: "min-height: 80px; line-height: 1.4;"
            }
        };

        return [
            // Видимые по умолчанию колонки
            {
                title: "Договор", 
                field: "contract_id", 
                width: 250, 
                sorter: "number", 
                visible: true, 
                formatter: "lookup", 
                formatterParams: this.lookups.contracts,
                editor: "list", 
                editorParams: listEditorParams(this.lookups.contracts),
                cssClass: "tabulator-cell-contract-name"
            },
            {
                title: "Комментарий", 
                field: "comment", 
                width: 200, 
                editor: "textarea",
                editorParams: textareaEditorParams,
                formatter: (cell) => {
                    const value = cell.getValue();
                    const rowData = cell.getRow().getData();
                    return `<span class="cell-content">${value || ''}</span><button class="delete-row-btn" data-id="${rowData.id}" title="Удалить запись">🗑️</button>`;
                },
                editable: true, 
                visible: true,
                cssClass: "cell-text-left cell-with-delete"
            },
            {    
                title: "Тип этапа", field: "stage_type_id", width: 150, sorter: "number", visible: true,
             formatter: "lookup", formatterParams: this.lookups.stage_types,
             editor: "list", editorParams: listEditorParams(this.lookups.stage_types)},
            {title: "Дата начала", field: "start_date", width: 110, sorter: "date", visible: true,
             sorterParams: {format: "yyyy-MM-dd", alignEmptyValues: "bottom"},
             formatter: "datetime", formatterParams: {inputFormat: "yyyy-MM-dd", outputFormat: "dd.MM.yyyy", invalidPlaceholder: ""},
             editor: "date", editorParams: {format: "yyyy-MM-dd"}, editable: true},
            {
                title: "Дата окончания", field: "end_date", width: 110, sorter: "date", visible: true,
             sorterParams: {format: "yyyy-MM-dd", alignEmptyValues: "bottom"},
             formatter: "datetime",
             formatterParams: 
                 {
                     inputFormat: "yyyy-MM-dd", outputFormat: "dd.MM.yyyy", invalidPlaceholder: ""
                 },
                 editor: "date", 
                 editorParams: 
                     {
                         format: "yyyy-MM-dd"
                     }, 
                 editable: true
             },

             {
                 title: "Срок, дней",
                 field: "duration_calc",
                 width: 100,
                 sorter: "number",
                 editable: false,
                 visible: true,
                 mutator: (value, data) => {
                     if (!data.start_date || !data.end_date) {
                         return null;
                     }
                     const start = new Date(data.start_date);
                     const end = new Date(data.end_date);
                     if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                         return null;
                     }
                     const diffTime = end.getTime() - start.getTime();
                     const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                     return diffDays;
                 },
                 formatter: (cell) => {
                     const value = cell.getValue();
                     if (value === null || value === undefined) {
                         return '';
                     }
                     return value;
                 }
             },
            
            {title: "Бригада", field: "brigade_id", width: 150, sorter: "number", visible: true,
             formatter: "lookup", formatterParams: this.lookups.brigades,
             editor: "list", editorParams: listEditorParams(this.lookups.brigades)},
            {title: "Прораб", field: "prorab_id", width: 150, sorter: "number", visible: true,
             formatter: "lookup", formatterParams: this.lookups.prorabs,
             editor: "list", editorParams: listEditorParams(this.lookups.prorabs)},
            {
                title: "Бытовка",
                field: "temporary_building", 
                width: 120,
                cssClass: "cell-text-left",
                sorter: "string", 
                editor: "textarea",
                editorParams: textareaEditorParams,
                formatter: "textarea",
                editable: true,
                visible: true
            },
            {
                title: "Туалет", 
                field: "toilet", 
                width: 120,
                cssClass: "cell-text-left",
                sorter: "string", 
                editor: "textarea",
                editorParams: textareaEditorParams,
                formatter: "textarea",
                editable: true,
                visible: true
            },
            {title: "Описание", field: "description", width: 600, cssClass: "cell-text-left", editor: "textarea", editorParams: textareaEditorParams, formatter: "textarea", editable: true, visible: true},

            // --- НАЧАЛО ВСТАВКИ: Поля из Договора ---
            {
                title: "Комплектация (Договор)", field: "complectation_id", width: 150, sorter: "number", visible: false,
                formatter: "lookup", formatterParams: this.lookups.complectation,
                editor: "list", editorParams: listEditorParams(this.lookups.complectation)
            },
            {
                title: "Тип оплаты (Договор)", field: "payment_type_id", width: 130, sorter: "number", visible: false,
                formatter: "lookup", formatterParams: this.lookups.payment_types,
                editor: "list", editorParams: listEditorParams(this.lookups.payment_types)
            },
            {
                title: "Менеджер (Договор)", field: "manager_id", width: 120, sorter: "number", visible: false,
                formatter: "lookup", formatterParams: this.lookups.managers,
                editor: "list", editorParams: listEditorParams(this.lookups.managers)
            },
            {
                title: "Проект (Договор)", field: "project_id", width: 150, sorter: "number", visible: false,
                formatter: "lookup", formatterParams: this.lookups.projects,
                editor: "list", editorParams: listEditorParams(this.lookups.projects)
            },
            {
                title: "АР готов (Договор)", 
                field: "ar_ready", 
                width: 150, 
                sorter: "string", 
                visible: false,
                editor: "textarea",
                editorParams: textareaEditorParams,
                formatter: "textarea",
                editable: true,
                cssClass: "cell-text-left"
            },
            {
                title: "КР готов (Договор)", field: "kr_ready", width: 90, sorter: "string", visible: false,
                editor: "list", editorParams: { values: { "да": "да", "нет": "нет", "в процессе": "в процессе" } }
            },
            {
                title: "Смета готова (Договор)", field: "estimate_ready", width: 110, sorter: "string", visible: false,
                editor: "list", editorParams: { values: { "да": "да", "нет": "нет", "в процессе": "в процессе" } }
            },
            {
                title: "Фундамент (Договор)", field: "foundation", width: 120, sorter: "string", visible: false,
                editor: "input", editable: true
            },
            // --- КОНЕЦ ВСТАВКИ ---

            // Скрытые колонки (visible: false)
            {title: "ID", field: "id", width: 80, sorter: "number", editable: false, visible: false},
            {title: "Название этапа", field: "name", width: 200, sorter: "string", editor: "input", editable: true, visible: false},
            {title: "Сумма", field: "amount", width: 120, sorter: "number", visible: false,
             editor: "number", editorParams: {min: 0, step: 0.01}, editable: true,
             formatter: "money", formatterParams: {thousand: " ", precision: 0, decimal: ","}},
            {title: "Подрядчик", field: "contractor_id", width: 150, sorter: "number", visible: false,
             formatter: "lookup", formatterParams: this.lookups.contractors,
             editor: "list", editorParams: listEditorParams(this.lookups.contractors)},
            {title: "Длительность (дни)", field: "duration_days", width: 120, sorter: "number", editor: "number", editable: true, visible: false},
            {title: "Статус", field: "status", width: 120, sorter: "string", visible: false,
             editor: "list", editorParams: {values: ["планируется", "в процессе", "завершен", "отменен"]}, editable: true},
            {title: "Доп поле 1", field: "custom_field_1", width: 120, editor: "input", editable: true, visible: false},
            {title: "Доп поле 2", field: "custom_field_2", width: 120, editor: "input", editable: true, visible: false},
            {title: "Доп поле 3", field: "custom_field_3", width: 120, editor: "input", editable: true, visible: false},
            {title: "Создан", field: "created_at", width: 140, sorter: "datetime", visible: false,
             sorterParams: {format: "yyyy-MM-dd HH:mm:ss", alignEmptyValues: "bottom"},
             formatter: "datetime", formatterParams: {inputFormat: "yyyy-MM-dd HH:mm:ss", outputFormat: "dd.MM.yyyy HH:mm", invalidPlaceholder: ""}, editable: false},
            {title: "Обновлен", field: "updated_at", width: 140, sorter: "datetime", visible: false,
             sorterParams: {format: "yyyy-MM-dd HH:mm:ss", alignEmptyValues: "bottom"},
             formatter: "datetime", formatterParams: {inputFormat: "yyyy-MM-dd HH:mm:ss", outputFormat: "dd.MM.yyyy HH:mm", invalidPlaceholder: ""}, editable: false}
        ];
    }

    /**
     * Сортировка по умолчанию - по дате начала (новые сверху)
     */
    getDefaultSort() {
        return [{column: "start_date", dir: "asc"}];
    }

    /**
     * Конфигурация группировки по месяцам
     */
    getGroupConfig() {
        return {
            groupBy: (data) => {
                if (!data.start_date) {
                    return "0000-00"; // Для сортировки "Без даты" в конец
                }
                const date = new Date(data.start_date);
                if (isNaN(date.getTime())) {
                    return "0000-00";
                }
                const year = date.getFullYear();
                const month = date.getMonth();
                return `${year}-${String(month).padStart(2, '0')}`;
            },
            
            groupHeader: (value, count, data, group) => {
                if (value === "0000-00") {
                    return `<span style="font-weight: 600;">Без даты</span> <span style="margin-left: 10px;">(${count} ${this.getRecordWord(count)})</span>`;
                }
                
                const [year, month] = value.split('-');
                const monthNames = [
                    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
                ];
                const monthName = monthNames[parseInt(month)] || 'Неизвестно';
                
                return `<span style="font-weight: 600;">${monthName} ${year}</span> <span style="margin-left: 10px;">(${count} ${this.getRecordWord(count)})</span>`;
            },
            
            groupStartOpen: true,
            groupToggleElement: "header"
        };
     }
}