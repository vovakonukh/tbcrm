import BaseTable from '../core/BaseTable.js';

export class AdeskTable extends BaseTable {
    constructor() {
        super();
        this.bindSyncButton();
    }

    getApiEndpoint() {
        return CONFIG.ENDPOINTS.ADESK + '?action=get_transactions';
    }

    getTableSelector() {
        return "#adesk-table";
    }

    /* Adesk — только просмотр, новые записи не создаём */
    getNewRowData() {
        return {};
    }

    getNameField() {
        return "description";
    }

    getDefaultSort() {
        return [{column: "transaction_date", dir: "desc"}];
    }

    getColumns() {
        return [
            {
                title: "Дата",
                field: "transaction_date",
                width: 110,
                sorter: "date",
                formatter: "datetime",
                formatterParams: {
                    inputFormat: "yyyy-MM-dd",
                    outputFormat: "dd.MM.yyyy",
                    invalidPlaceholder: ""
                }
            },
            {
                title: "Тип",
                field: "transaction_type",
                width: 100,
                sorter: "number",
                formatter: (cell) => {
                    const value = cell.getValue();
                    if (value === 1 || value === "1") {
                        return '<span style="color: #10935B;">Приход</span>';
                    } else if (value === 2 || value === "2") {
                        return '<span style="color: #fa5252;">Расход</span>';
                    }
                    return value;
                }
            },
            {
                title: "Сумма",
                field: "amount",
                width: 120,
                sorter: "number",
                formatter: "money",
                formatterParams: {
                    thousand: " ",
                    precision: 0,
                    decimal: ","
                }
            },
            {
                title: "Проект",
                field: "project_name",
                width: 200,
                sorter: "string"
            },
            {
                title: "Категория",
                field: "category_name",
                width: 150,
                sorter: "string"
            },
            {
                title: "Группа категории",
                field: "category_group_name",
                width: 150,
                sorter: "string"
            },
            {
                title: "Контрагент",
                field: "contractor_name",
                width: 180,
                sorter: "string"
            },
            {
                title: "Описание",
                field: "description",
                width: 250,
                sorter: "string",
                formatter: "textarea",
                cssClass: "cell-text-left"
            },
            {
                title: "Счёт",
                field: "bank_account_name",
                width: 150,
                sorter: "string",
                visible: false
            },
            {
                title: "Подразделение",
                field: "business_unit_name",
                width: 150,
                sorter: "string",
                visible: false
            },
            {
                title: "Adesk ID",
                field: "adesk_id",
                width: 100,
                sorter: "number",
                visible: false
            }
        ];
    }

    /* Переопределяем создание таблицы — убираем редактирование */
    createTable(tableData) {
        let tableColumns = this.getColumns();
        tableColumns = this.applyResponsiveFrozen(tableColumns);

        const config = {
            data: tableData,
            layout: "fitColumns",
            responsiveLayout: false,
            pagination: "local",
            paginationSize: 100,
            paginationSizeSelector: [50, 100, 200, 500],
            movableColumns: true,
            resizableColumns: true,
            height: "calc(100vh - 30px)",
            initialSort: this.getDefaultSort(),
            columns: tableColumns,
            locale: "ru-ru",
            langs: { 
                "ru-ru": { 
                    "pagination": { 
                        "first": "Первая", 
                        "last": "Последняя", 
                        "prev": "Пред", 
                        "next": "След" 
                    } 
                } 
            },
            persistence: {
                sort: false,
                filter: false,
                headerFilter: false,
                group: false,
                page: false,
                columns: ["width", "visible"]
            },
            persistenceID: this.persistenceId,
            persistenceMode: "local"
        };

        this.table = new Tabulator(this.getTableSelector(), config);
        this.table.on("columnMoved", () => this.saveColumnOrder());
        this.bindTableEvents();
    }

    /* Кнопка синхронизации */
    bindSyncButton() {
        const syncBtn = document.getElementById('sync-btn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => this.runSync());
        }
    }

    async runSync() {
        const syncBtn = document.getElementById('sync-btn');
        const statusDiv = document.getElementById('sync-status');
        
        try {
            syncBtn.disabled = true;
            syncBtn.querySelector('span').textContent = 'Синхронизация...';
            statusDiv.style.display = 'block';
            statusDiv.innerHTML = '<span style="color: #868e96;">Загрузка данных из Adesk...</span>';

            const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.ADESK}?action=sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date_from: '2024-01-01',
                    date_to: new Date().toISOString().split('T')[0]
                })
            });

            const result = await response.json();

            if (result.success) {
                statusDiv.innerHTML = `<span style="color: #10935B;">✓ ${result.message}</span>`;
                this.showNotification(result.message, 'success');
                await this.reloadData();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            statusDiv.innerHTML = `<span style="color: #fa5252;">✗ Ошибка: ${error.message}</span>`;
            this.showNotification('Ошибка синхронизации: ' + error.message, 'error');
        } finally {
            syncBtn.disabled = false;
            syncBtn.querySelector('span').textContent = 'Синхронизировать';
        }
    }

    /* Переопределяем bindEvents — убираем кнопки добавления/сохранения */
    bindEvents() {
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.reloadData());

        const toggleColBtn = document.getElementById('toggle-columns-btn');
        if (toggleColBtn) toggleColBtn.addEventListener('click', () => this.showColumnSelector());
    }

    /* Переопределяем bindTableEvents — убираем удаление */
    bindTableEvents() {
        /* Ничего не делаем — это read-only таблица */
    }
}