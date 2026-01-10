/**
 * Access.js
 * Управление правами доступа
 */

class AccessPage {
    constructor() {
        this.roles = [];
        this.permissions = [];
        this.resources = {};
        this.hideableFields = {};
        this.table = null;
        
        this.init();
    }

    async init() {
        await this.loadData();
        this.createTable();
        this.bindEvents();
    }

    async loadData() {
        const loadingElement = document.getElementById('loading');
        const errorElement = document.getElementById('error');
        
        if (loadingElement) loadingElement.style.display = 'block';
        if (errorElement) errorElement.style.display = 'none';

        try {
            const url = `${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.ACCESS}`;
            const response = await fetch(url);
            const result = await response.json();

            if (result.success) {
                this.roles = result.roles;
                this.permissions = result.permissions;
                this.resources = result.resources;
                this.hideableFields = result.hideable_fields;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            if (errorElement) {
                errorElement.textContent = 'Ошибка загрузки: ' + error.message;
                errorElement.style.display = 'block';
            }
        } finally {
            if (loadingElement) loadingElement.style.display = 'none';
        }
    }

    createTable() {
        /* Преобразуем данные для таблицы: одна строка = одно разрешение */
        const tableData = this.permissions.map(perm => {
            const role = this.roles.find(r => r.id == perm.role_id);
            return {
                ...perm,
                role_name: role ? role.name : 'Неизвестно',
                role_code: role ? role.code : '',
                resource_name: this.resources[perm.resource] || perm.resource,
                hidden_fields_count: perm.hidden_fields ? perm.hidden_fields.length : 0
            };
        });

        /* Создаём lookup для ролей */
        const rolesLookup = {};
        this.roles.forEach(r => { rolesLookup[r.id] = r.name; });

        this.table = new Tabulator("#access-table", {
            data: tableData,
            layout: "fitColumns",
            height: "calc(100vh - 200px)",
            groupBy: "role_name",
            groupStartOpen: true,
            groupHeader: (value, count) => {
                const role = this.roles.find(r => r.name === value);
                const code = role ? `<span style="color: #868e96; font-weight: normal;">(${role.code})</span>` : '';
                return `${value} ${code} <span style="color: #868e96; margin-left: 10px;">${count} ресурсов</span>`;
            },
            columns: [
                {
                    title: "Ресурс",
                    field: "resource_name",
                    width: 200,
                    frozen: true
                },
                {
                    title: "Просмотр",
                    field: "can_view",
                    width: 100,
                    hozAlign: "center",
                    formatter: "tickCross",
                    editor: true,
                    cellClick: (e, cell) => this.togglePermission(cell)
                },
                {
                    title: "Создание",
                    field: "can_create",
                    width: 100,
                    hozAlign: "center",
                    formatter: "tickCross",
                    editor: true,
                    cellClick: (e, cell) => this.togglePermission(cell)
                },
                {
                    title: "Редактирование",
                    field: "can_edit",
                    width: 130,
                    hozAlign: "center",
                    formatter: "tickCross",
                    editor: true,
                    cellClick: (e, cell) => this.togglePermission(cell)
                },
                {
                    title: "Удаление",
                    field: "can_delete",
                    width: 100,
                    hozAlign: "center",
                    formatter: "tickCross",
                    editor: true,
                    cellClick: (e, cell) => this.togglePermission(cell)
                },
                {
                    title: "Скрытые поля",
                    field: "hidden_fields_count",
                    width: 130,
                    hozAlign: "center",
                    formatter: (cell) => {
                        const count = cell.getValue();
                        const rowData = cell.getRow().getData();
                        const hasHideableFields = this.hideableFields[rowData.resource];
                        
                        if (!hasHideableFields) {
                            return '<span style="color: #adb5bd;">—</span>';
                        }
                        
                        if (count > 0) {
                            return `<span class="hidden-fields-badge">${count}</span>`;
                        }
                        return '<span style="color: #adb5bd;">0</span>';
                    },
                    cellClick: (e, cell) => {
                        const rowData = cell.getRow().getData();
                        if (this.hideableFields[rowData.resource]) {
                            this.showHiddenFieldsModal(rowData);
                        }
                    },
                    cssClass: "cell-clickable"
                }
            ],
            locale: "ru-ru",
            langs: {
                "ru-ru": {
                    "groups": {
                        "item": "элемент",
                        "items": "элементов"
                    }
                }
            }
        });
    }

    async togglePermission(cell) {
        const field = cell.getField();
        const rowData = cell.getRow().getData();
        const currentValue = cell.getValue();
        const newValue = currentValue ? 0 : 1;

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.ACCESS}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: rowData.id,
                    [field]: newValue
                })
            });

            const result = await response.json();

            if (result.success) {
                cell.setValue(newValue);
                this.showNotification('Сохранено', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            this.showNotification('Ошибка: ' + error.message, 'error');
        }
    }

    showHiddenFieldsModal(rowData) {
        const availableFields = this.hideableFields[rowData.resource] || {};
        const hiddenFields = rowData.hidden_fields || [];

        let fieldsHtml = '';
        for (const [field, label] of Object.entries(availableFields)) {
            const checked = hiddenFields.includes(field) ? 'checked' : '';
            fieldsHtml += `
                <label class="checkbox-item">
                    <input type="checkbox" name="hidden_field" value="${field}" ${checked}>
                    <span>${label}</span>
                </label>
            `;
        }

        const modal = document.getElementById('hidden-fields-modal');
        const title = modal.querySelector('.modal-title');
        const body = modal.querySelector('.fields-list');
        
        title.textContent = `Скрытые поля: ${rowData.resource_name}`;
        body.innerHTML = fieldsHtml;
        modal.dataset.permissionId = rowData.id;
        modal.style.display = 'flex';
    }

    async saveHiddenFields() {
        const modal = document.getElementById('hidden-fields-modal');
        const permissionId = modal.dataset.permissionId;
        const checkboxes = modal.querySelectorAll('input[name="hidden_field"]:checked');
        const hiddenFields = Array.from(checkboxes).map(cb => cb.value);

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.ACCESS}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: parseInt(permissionId),
                    hidden_fields: hiddenFields
                })
            });

            const result = await response.json();

            if (result.success) {
                /* Обновляем данные в таблице */
                const row = this.table.getRows().find(r => r.getData().id == permissionId);
                if (row) {
                    row.update({ 
                        hidden_fields: hiddenFields,
                        hidden_fields_count: hiddenFields.length 
                    });
                }
                
                modal.style.display = 'none';
                this.showNotification('Скрытые поля сохранены', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            this.showNotification('Ошибка: ' + error.message, 'error');
        }
    }

    bindEvents() {
        /* Модальное окно скрытых полей */
        const modal = document.getElementById('hidden-fields-modal');
        const closeBtn = modal.querySelector('.close');
        const saveBtn = document.getElementById('save-hidden-fields-btn');
        const cancelBtn = document.getElementById('cancel-hidden-fields-btn');

        closeBtn.addEventListener('click', () => modal.style.display = 'none');
        cancelBtn.addEventListener('click', () => modal.style.display = 'none');
        saveBtn.addEventListener('click', () => this.saveHiddenFields());

        /* Закрытие по клику вне модалки */
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });

        /* Кнопка обновления */
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await this.loadData();
                /* Обновляем данные в таблице */
                const tableData = this.permissions.map(perm => {
                    const role = this.roles.find(r => r.id == perm.role_id);
                    return {
                        ...perm,
                        role_name: role ? role.name : 'Неизвестно',
                        role_code: role ? role.code : '',
                        resource_name: this.resources[perm.resource] || perm.resource,
                        hidden_fields_count: perm.hidden_fields ? perm.hidden_fields.length : 0
                    };
                });
                this.table.setData(tableData);
                this.showNotification('Данные обновлены', 'success');
            });
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container') || this.createNotificationContainer();
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
        return container;
    }
}

/* Инициализация при загрузке страницы */
document.addEventListener('DOMContentLoaded', () => {
    new AccessPage();
});