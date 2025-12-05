import BaseTable from '../core/BaseTable.js';

export class BrigadesTable extends BaseTable {
    constructor() {
        super();
    }

    getApiEndpoint() {
        return CONFIG.ENDPOINTS.BRIGADES;
    }

    getTableSelector() {
        return "#brigades-table";
    }

    getNewRowData() {
        return {
            name: 'Новая бригада',
            is_active: 1
        };
    }

    getNameField() {
        return "name";
    }

    getDefaultSort() {
        return [{column: "name", dir: "asc"}];
    }

    getSelectFilters() {
        return {
            brigade_type_id: {
                label: 'Тип бригады',
                options: this.lookups.brigade_types || {}
            },
            is_active: {
                label: 'Активность',
                options: [
                    { value: '1', label: 'Активные' },
                    { value: '0', label: 'Неактивные' }
                ]
            }
        };
    }

    getColumns() {
        const listEditorParams = (lookupData) => {
            const values = Object.entries(lookupData || {}).map(([id, name]) => ({
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

        const textareaEditorParams = {
            shiftEnterSubmit: true,
            verticalNavigation: "editor",
            elementAttributes: {
                style: "min-height: 80px; line-height: 1.4;"
            }
        };

        return [
            {
                title: "Название", 
                field: "name", 
                width: 250, 
                sorter: "string", 
                editor: "input", 
                editable: true,
                cssClass: "tabulator-cell-contract-name cell-text-left"
            },
            {
                title: "Телефон",
                field: "phone",
                width: 150,
                sorter: "string",
                editor: "input",
                editable: true
            },
            {
                title: "Тип бригады",
                field: "brigade_type_id",
                width: 150,
                sorter: "number",
                formatter: "lookup",
                formatterParams: this.lookups.brigade_types,
                editor: "list",
                editorParams: listEditorParams(this.lookups.brigade_types)
            },
            {
                title: "Каркас",
                field: "frame",
                width: 150,
                sorter: "string",
                editor: "input",
                editable: true
            },
            {
                title: "Оборудование",
                field: "equipment",
                width: 250,
                sorter: "string",
                editor: "textarea",
                editorParams: textareaEditorParams,
                formatter: "textarea",
                editable: true,
                cssClass: "cell-text-left"
            },
            {
                title: "Комментарий",
                field: "comment",
                width: 300,
                sorter: "string",
                editor: "textarea",
                editorParams: textareaEditorParams,
                formatter: "textarea",
                editable: true,
                cssClass: "cell-text-left"
            },
            {
                title: "Активен",
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
            }
        ];
    }
}