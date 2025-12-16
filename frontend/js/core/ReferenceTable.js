/**
 * ReferenceTable.js
 * Базовый класс для таблиц-справочников
 */

class ReferenceTable {
    constructor(config) {
        this.tableName = config.tableName;       // Имя таблицы в БД
        this.selector = config.selector;         // CSS селектор контейнера
        this.addButtonId = config.addButtonId;   // ID кнопки добавления
        this.hasIsActive = config.hasIsActive !== false; // По умолчанию true
        this.allowDelete = config.allowDelete !== false; // По умолчанию true
        this.columns = config.columns || this.getDefaultColumns();
        this.height = config.height || "300px";
        this.defaultRowData = config.defaultRowData || this.getDefaultRowData();
        
        this.table = null;
        this.onDeleteCallback = config.onDeleteCallback || null;
    }

    /**
     * Данные для новой записи по умолчанию
     */
    getDefaultRowData() {
        const data = { name: 'Новая запись' };
        if (this.hasIsActive) {
            data.is_active = 1;
        }
        return data;
    }

    /**
     * Колонки по умолчанию: Название + Активность (опционально) + Удалить
     */
    getDefaultColumns() {
        const columns = [
            {
                title: "Название",
                field: "name",
                editor: "input",
                validator: "required"
            }
        ];

        // Добавляем колонку is_active только если она есть в таблице
        if (this.hasIsActive) {
            columns.push({
                title: "Активен",
                field: "is_active",
                width: 100,
                hozAlign: "center",
                editor: "list",
                editorParams: {
                    values: [
                        { label: "Да", value: 1 },
                        { label: "Нет", value: 0 }
                    ]
                },
                formatter: (cell) => {
                    const value = cell.getValue();
                    if (value === 1 || value === "1") {
                        return '<span style="color: #10935B;">Да</span>';
                    }
                    return '<span style="color: #868e96;">Нет</span>';
                }
            });
        }

        // Добавляем колонку удаления только если allowDelete = true
        if (this.allowDelete) {
            columns.push(this.getDeleteColumn());
        }

        return columns;
    }

    /**
     * Колонка с кнопкой удаления
     */
    getDeleteColumn() {
        return {
            title: "",
            width: 50,
            hozAlign: "center",
            headerSort: false,
            formatter: () => '<button class="delete-ref-btn" title="Удалить">🗑️</button>',
            cellClick: (e, cell) => {
                if (e.target.classList.contains('delete-ref-btn')) {
                    const id = cell.getRow().getData().id;
                    if (this.onDeleteCallback) {
                        this.onDeleteCallback(this.tableName, id);
                    }
                }
            }
        };
    }

    /**
     * Инициализация таблицы с данными
     */
    init(data) {
        this.table = new Tabulator(this.selector, {
            data: data,
            layout: "fitColumns",
            height: this.height,
            reactiveData: true,
            columns: this.columns
        });

        // Регистрируем событие редактирования
        this.table.on("cellEdited", (cell) => {
            this.saveCell(cell);
        });

        // Привязываем кнопку добавления
        this.bindAddButton();
    }

    /**
     * Привязка кнопки добавления
     */
    bindAddButton() {
        const btn = document.getElementById(this.addButtonId);
        if (btn) {
            btn.addEventListener('click', () => this.addRow());
        }
    }

    /**
     * Добавление новой записи
     */
    async addRow() {
        try {
            const url = `${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.SETTINGS}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    table: this.tableName,
                    data: this.defaultRowData
                })
            });

            const result = await response.json();

            if (result.success) {
                const newRow = { id: result.id, ...this.defaultRowData };
                this.table.addRow(newRow, true);
                
                this.showNotification('Запись добавлена', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error adding row:', error);
            this.showNotification('Ошибка добавления: ' + error.message, 'error');
        }
    }

    /**
     * Сохранение ячейки
     */
    async saveCell(cell) {
        try {
            const field = cell.getField();
            const value = cell.getValue();
            const rowData = cell.getRow().getData();

            const url = `${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.SETTINGS}`;
            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    table: this.tableName,
                    id: rowData.id,
                    data: { [field]: value }
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Сохранено', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error saving cell:', error);
            this.showNotification('Ошибка сохранения: ' + error.message, 'error');
        }
    }

    /**
     * Удаление строки из таблицы (вызывается после подтверждения)
     */
    removeRow(id) {
        const row = this.table.getRow(id);
        if (row) {
            row.delete();
        }
    }

    /**
     * Уведомления
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 12px 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white; border-radius: 4px; z-index: 10000; box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            animation: slideIn 0.3s ease; font-size: 14px;
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) notification.parentNode.removeChild(notification);
            }, 300);
        }, 2000);
    }
}