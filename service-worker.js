/* 
Service Worker для Contract Manager PWA
- Кеширует статику (CSS, JS, шрифты, иконки)
- Network-first для API запросов
- Cache-first для статики
- Офлайн-страница при отсутствии сети
*/

const CACHE_NAME = 'contract-manager-v1';
const STATIC_CACHE = 'static-v1';
const API_CACHE = 'api-v1';

/* Файлы для предварительного кеширования */
const PRECACHE_ASSETS = [
    '/',
    '/contracts.php',
    '/stages.php',
    '/brigades.php',
    '/settings.php',
    '/login.php',
    '/frontend/css/style.css',
    '/frontend/css/fonts.css',
    '/frontend/js/config.js',
    '/frontend/js/core/BaseTable.js',
    '/frontend/js/core/UserService.js',
    '/frontend/js/core/ReferenceTable.js',
    '/frontend/js/modules/Contracts.js',
    '/frontend/js/modules/Stages.js',
    '/frontend/js/modules/Brigades.js',
    '/frontend/js/modules/Settings.js',
    '/assets/menu.svg',
    '/assets/add.svg',
    '/assets/close.svg',
    '/assets/refresh.svg',
    '/assets/save.svg',
    '/offline.html'
];

/* Установка SW — кешируем статику */
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[SW] Precaching assets');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => self.skipWaiting())
            .catch(err => console.error('[SW] Precache failed:', err))
    );
});

/* Активация — удаляем старые кеши */
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

/* Стратегия обработки запросов */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    /* Пропускаем не-GET запросы */
    if (request.method !== 'GET') return;

    /* Пропускаем внешние запросы (кроме CDN) */
    if (!url.origin.includes(self.location.origin) && 
        !url.hostname.includes('unpkg.com') &&
        !url.hostname.includes('cdnjs.cloudflare.com')) {
        return;
    }

    /* API запросы — Network First */
    if (url.pathname.includes('/api/')) {
        event.respondWith(networkFirst(request, API_CACHE));
        return;
    }

    /* Статика — Cache First */
    if (isStaticAsset(url.pathname)) {
        event.respondWith(cacheFirst(request, STATIC_CACHE));
        return;
    }

    /* PHP страницы — Network First с fallback */
    if (url.pathname.endsWith('.php') || url.pathname === '/') {
        event.respondWith(networkFirstWithOffline(request));
        return;
    }

    /* Остальное — Network First */
    event.respondWith(networkFirst(request, STATIC_CACHE));
});

/* Проверяет, является ли ресурс статикой */
function isStaticAsset(pathname) {
    const staticExts = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.eot'];
    return staticExts.some(ext => pathname.endsWith(ext));
}

/* Cache First — сначала из кеша, потом сеть */
async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) {
        /* Обновляем кеш в фоне */
        updateCache(request, cacheName);
        return cached;
    }
    
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.error('[SW] Fetch failed:', error);
        return new Response('Offline', { status: 503 });
    }
}

/* Network First — сначала сеть, потом кеш */
async function networkFirst(request, cacheName) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) return cached;
        
        console.error('[SW] Network and cache failed:', error);
        return new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/* Network First с офлайн-страницей для HTML */
async function networkFirstWithOffline(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) return cached;
        
        /* Возвращаем офлайн-страницу */
        const offlinePage = await caches.match('/offline.html');
        if (offlinePage) return offlinePage;
        
        return new Response('<h1>Нет подключения к сети</h1>', {
            status: 503,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
    }
}

/* Фоновое обновление кеша */
function updateCache(request, cacheName) {
    fetch(request)
        .then(response => {
            if (response.ok) {
                caches.open(cacheName).then(cache => {
                    cache.put(request, response);
                });
            }
        })
        .catch(() => {});
}

/* Обработка push-уведомлений (для будущего расширения) */
self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    const data = event.data.json();
    const options = {
        body: data.body || 'Новое уведомление',
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: { url: data.url || '/' }
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'Contract Manager', options)
    );
});

/* Клик по уведомлению */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            for (const client of clientList) {
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});

/* Фоновая синхронизация (для будущего расширения) */
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        console.log('[SW] Background sync triggered');
        /* Здесь можно добавить логику синхронизации офлайн-изменений */
    }
});