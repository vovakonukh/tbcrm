/* 
PWA Registration Module
- Регистрирует Service Worker
- Обрабатывает обновления
- Показывает prompt установки
- Проверяет статус подключения
*/

class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.swRegistration = null;
        this.isOnline = navigator.onLine;
        
        this.init();
    }
    
    async init() {
        /* Регистрируем SW */
        await this.registerServiceWorker();
        
        /* Слушаем событие установки */
        this.handleInstallPrompt();
        
        /* Отслеживаем статус сети */
        this.handleNetworkStatus();
    }
    
    /* Регистрация Service Worker */
    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.log('[PWA] Service Worker не поддерживается');
            return;
        }
        
        try {
            this.swRegistration = await navigator.serviceWorker.register('/pwa/service-worker.js', {
                scope: '/'
            });
            
            console.log('[PWA] Service Worker зарегистрирован:', this.swRegistration.scope);
            
            /* Проверяем обновления */
            this.swRegistration.addEventListener('updatefound', () => {
                const newWorker = this.swRegistration.installing;
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        this.showUpdateNotification();
                    }
                });
            });
            
            /* Периодически проверяем обновления */
            setInterval(() => {
                this.swRegistration.update();
            }, 60 * 60 * 1000); /* Каждый час */
            
        } catch (error) {
            console.error('[PWA] Ошибка регистрации SW:', error);
        }
    }
    
    /* Обработка события beforeinstallprompt */
    handleInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            console.log('[PWA] Install prompt сохранён');
            
            /* Показываем кнопку установки если есть */
            this.showInstallButton();
        });
        
        /* Отслеживаем успешную установку */
        window.addEventListener('appinstalled', () => {
            console.log('[PWA] Приложение установлено');
            this.deferredPrompt = null;
            this.hideInstallButton();
        });
    }
    
    /* Показать кнопку установки */
    showInstallButton() {
        const btn = document.getElementById('pwa-install-btn');
        if (btn) {
            btn.style.display = 'flex';
            btn.addEventListener('click', () => this.promptInstall());
        }
    }
    
    /* Скрыть кнопку установки */
    hideInstallButton() {
        const btn = document.getElementById('pwa-install-btn');
        if (btn) btn.style.display = 'none';
    }
    
    /* Вызвать диалог установки */
    async promptInstall() {
        if (!this.deferredPrompt) {
            console.log('[PWA] Install prompt недоступен');
            return false;
        }
        
        this.deferredPrompt.prompt();
        const result = await this.deferredPrompt.userChoice;
        
        console.log('[PWA] Пользователь выбрал:', result.outcome);
        this.deferredPrompt = null;
        
        return result.outcome === 'accepted';
    }
    
    /* Проверяет, установлено ли приложение */
    isInstalled() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
    }
    
    /* Показать уведомление об обновлении */
    showUpdateNotification() {
        /* Создаём уведомление если его нет */
        if (document.getElementById('pwa-update-toast')) return;
        
        const toast = document.createElement('div');
        toast.id = 'pwa-update-toast';
        toast.innerHTML = `
            <div class="pwa-toast-content">
                <span>Доступно обновление</span>
                <button onclick="location.reload()">Обновить</button>
                <button onclick="this.parentElement.parentElement.remove()">✕</button>
            </div>
        `;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #212529;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideUp 0.3s ease;
        `;
        
        document.body.appendChild(toast);
    }
    
    /* Отслеживание сетевого статуса */
    handleNetworkStatus() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('[PWA] Онлайн');
            this.hideOfflineIndicator();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('[PWA] Офлайн');
            this.showOfflineIndicator();
        });
        
        /* Показываем индикатор если уже офлайн */
        if (!navigator.onLine) {
            this.showOfflineIndicator();
        }
    }
    
    /* Показать индикатор офлайн */
    showOfflineIndicator() {
        if (document.getElementById('pwa-offline-indicator')) return;
        
        const indicator = document.createElement('div');
        indicator.id = 'pwa-offline-indicator';
        indicator.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="1" y1="1" x2="23" y2="23"></line>
                <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
                <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
            </svg>
            <span>Офлайн режим</span>
        `;
        indicator.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #f59e0b;
            color: white;
            padding: 8px;
            text-align: center;
            font-size: 13px;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            z-index: 10001;
        `;
        
        document.body.insertBefore(indicator, document.body.firstChild);
        document.body.style.paddingTop = '36px';
    }
    
    /* Скрыть индикатор офлайн */
    hideOfflineIndicator() {
        const indicator = document.getElementById('pwa-offline-indicator');
        if (indicator) {
            indicator.remove();
            document.body.style.paddingTop = '';
        }
    }
}

/* CSS для анимации */
const pwaStyles = document.createElement('style');
pwaStyles.textContent = `
    @keyframes slideUp {
        from { transform: translateX(-50%) translateY(100px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    
    .pwa-toast-content {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    
    .pwa-toast-content button {
        background: none;
        border: 1px solid rgba(255,255,255,0.3);
        color: white;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
    }
    
    .pwa-toast-content button:first-of-type {
        background: #2563eb;
        border-color: #2563eb;
    }
    
    .pwa-toast-content button:hover {
        opacity: 0.9;
    }
    
    #pwa-install-btn {
        display: none;
        align-items: center;
        gap: 8px;
        background: #2563eb;
        color: white;
        border: none;
        padding: 10px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
    }
    
    #pwa-install-btn:hover {
        background: #1d4ed8;
    }
`;
document.head.appendChild(pwaStyles);

/* Инициализация при загрузке страницы */
const pwaManager = new PWAManager();

/* Экспортируем для использования в других модулях */
if (typeof window !== 'undefined') {
    window.pwaManager = pwaManager;
}
