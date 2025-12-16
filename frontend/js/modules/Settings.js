/**
 * Settings.js
 * Управление справочниками на странице настроек
 * Использует базовый класс ReferenceTable
 */

class SettingsPage {
    constructor() {
        this.tables = {};
        this.pendingDelete = null;
        
        // Конфигурация всех справочников
        // allowDelete: false — мягкое удаление через is_active, кнопка удаления скрыта
        this.tableConfigs = [
            { tableName: 'brigade_types', selector: '#brigade_types-table', addButtonId: 'add-brigade_types-btn', title: 'Типы бригад', hasIsActive: false, allowDelete: true },
            { tableName: 'managers', selector: '#managers-table', addButtonId: 'add-managers-btn', title: 'Менеджеры', allowDelete: false },
            { tableName: 'contractors', selector: '#contractors-table', addButtonId: 'add-contractors-btn', title: 'Подрядчики', allowDelete: false },
            { tableName: 'escrow_agents', selector: '#escrow_agents-table', addButtonId: 'add-escrow_agents-btn', title: 'Эскроу агенты', allowDelete: false },
            { tableName: 'payment_types', selector: '#payment_types-table', addButtonId: 'add-payment_types-btn', title: 'Типы оплаты', allowDelete: false },
            { tableName: 'complectation', selector: '#complectation-table', addButtonId: 'add-complectation-btn', title: 'Типы комплектаций', allowDelete: false },
            { tableName: 'sources', selector: '#sources-table', addButtonId: 'add-sources-btn', title: 'Источники', allowDelete: false },
            { tableName: 'prorabs', selector: '#prorabs-table', addButtonId: 'add-prorabs-btn', title: 'Прорабы', allowDelete: false },
            { tableName: 'stage_types', selector: '#stage_types-table', addButtonId: 'add-stage_types-btn', title: 'Типы этапов', allowDelete: false },
            { tableName: 'ipoteka_status', selector: '#ipoteka_status-table', addButtonId: 'add-ipoteka_status-btn', title: 'Статусы ипотеки', allowDelete: false }
        ];
        
        this.init();
    }

    async init() {
        await this.loadAllData();
        this.bindDeleteModalEvents();
    }

    async loadAllData() {
        const loadingElement = document.getElementById('loading');
        const errorElement = document.getElementById('error');
        
        if (loadingElement) loadingElement.style.display = 'block';
        if (errorElement) errorElement.style.display = 'none';

        try {
            const url = `${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.SETTINGS}`;
            const response = await fetch(url);
            const result = await response.json();

            if (result.success) {
                // Создаём таблицы для каждого справочника
                this.tableConfigs.forEach(config => {
                    const data = result.data[config.tableName] || [];
                    
                    this.tables[config.tableName] = new ReferenceTable({
                        tableName: config.tableName,
                        selector: config.selector,
                        addButtonId: config.addButtonId,
                        hasIsActive: config.hasIsActive,
                        allowDelete: config.allowDelete !== false, // По умолчанию true, если не указано
                        onDeleteCallback: (table, id) => this.showDeleteConfirm(table, id)
                    });
                    
                    this.tables[config.tableName].init(data);
                });
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error loading settings data:', error);
            if (errorElement) {
                errorElement.textContent = 'Ошибка загрузки данных: ' + error.message;
                errorElement.style.display = 'block';
            }
        } finally {
            if (loadingElement) loadingElement.style.display = 'none';
        }
    }

    // --- Модальное окно удаления ---

    bindDeleteModalEvents() {
        const modal = document.getElementById('delete-confirm-modal');
        if (!modal) return;

        const closeBtn = modal.querySelector('.close');
        const cancelBtn = document.getElementById('cancel-delete-btn');
        const confirmBtn = document.getElementById('confirm-delete-btn');

        const closeModal = () => {
            modal.style.display = 'none';
            this.pendingDelete = null;
        };

        if (closeBtn) closeBtn.onclick = closeModal;
        if (cancelBtn) cancelBtn.onclick = closeModal;

        window.addEventListener('click', (event) => {
            if (event.target === modal) closeModal();
        });

        if (confirmBtn) {
            confirmBtn.onclick = async () => {
                if (this.pendingDelete) {
                    await this.deleteRow(this.pendingDelete.table, this.pendingDelete.id);
                    closeModal();
                }
            };
        }
    }

    showDeleteConfirm(tableName, id) {
        this.pendingDelete = { table: tableName, id: id };
        const modal = document.getElementById('delete-confirm-modal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    async deleteRow(tableName, id) {
        try {
            const url = `${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.SETTINGS}`;
            const response = await fetch(url, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    table: tableName,
                    id: id
                })
            });

            const result = await response.json();

            if (result.success) {
                // Удаляем строку из соответствующей таблицы
                if (this.tables[tableName]) {
                    this.tables[tableName].removeRow(id);
                }
                this.showNotification('Запись удалена', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error deleting row:', error);
            this.showNotification('Ошибка удаления: ' + error.message, 'error');
        }
    }

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

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    window.settingsPage = new SettingsPage();
});