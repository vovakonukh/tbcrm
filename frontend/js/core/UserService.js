/* Сервис для работы с информацией о пользователе и правами доступа */

class UserService {
    constructor() {
        this.user = null;
        this.permissions = {};
        this.loaded = false;
        this.loadPromise = null;
    }

    /* Загружает информацию о пользователе с сервера */
    async load() {
        if (this.loadPromise) return this.loadPromise;
        
        this.loadPromise = fetch(CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.USER_INFO)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.user = data.user;
                    this.permissions = data.permissions || {};
                    this.loaded = true;
                }
                return this.user;
            })
            .catch(error => {
                console.error('Ошибка загрузки информации о пользователе:', error);
                return null;
            });
        
        return this.loadPromise;
    }

    /* Возвращает код роли пользователя */
    getRole() {
        return this.user?.role || 'viewer';
    }

    /* Возвращает название роли пользователя */
    getRoleName() {
        return this.user?.role_name || 'Просмотр';
    }

    /* Возвращает права для конкретного ресурса */
    getPermissions(resource) {
        return this.permissions[resource] || {
            can_view: false,
            can_create: false,
            can_edit: false,
            can_delete: false,
            hidden_fields: []
        };
    }

    /* Возвращает список скрытых полей для ресурса */
    getHiddenFields(resource) {
        return this.permissions[resource]?.hidden_fields || [];
    }

    /* Проверяет право на просмотр ресурса */
    canView(resource) {
        return this.permissions[resource]?.can_view || false;
    }

    /* Проверяет право на создание записей */
    canCreate(resource) {
        return this.permissions[resource]?.can_create || false;
    }

    /* Проверяет право на редактирование записей */
    canEdit(resource) {
        /* Если ресурс не указан — используем старую логику для обратной совместимости */
        if (!resource) {
            const role = this.getRole();
            return ['admin', 'superuser', 'manager', 'constructor', 'marketer'].includes(role);
        }
        return this.permissions[resource]?.can_edit || false;
    }

    /* Проверяет право на удаление записей */
    canDelete(resource) {
        return this.permissions[resource]?.can_delete || false;
    }

    /* Проверяет, является ли пользователь администратором */
    isAdmin() {
        return this.getRole() === 'admin';
    }

    /* Проверяет, является ли пользователь viewer (только просмотр) */
    isViewer() {
        return this.getRole() === 'viewer';
    }

    /* Возвращает список доступных ресурсов (где can_view = true) */
    getAvailableResources() {
        return Object.entries(this.permissions)
            .filter(([resource, perms]) => perms.can_view)
            .map(([resource]) => resource);
    }
}

/* Глобальный экземпляр сервиса */
const userService = new UserService();