/* Сервис для работы с информацией о пользователе и правами доступа */

class UserService {
    constructor() {
        this.user = null;
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

    /* Возвращает роль пользователя */
    getRole() {
        return this.user?.role || 'viewer';
    }

    /* Проверяет, может ли пользователь редактировать данные */
    canEdit() {
        const role = this.getRole();
        return ['admin', 'manager', 'constructor'].includes(role);
    }

    /* Проверяет, является ли пользователь администратором */
    isAdmin() {
        return this.getRole() === 'admin';
    }

    /* Проверяет, является ли пользователь viewer (только просмотр) */
    isViewer() {
        return this.getRole() === 'viewer';
    }
    
}

/* Глобальный экземпляр сервиса */
const userService = new UserService();