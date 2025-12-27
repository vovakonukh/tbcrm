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
    '/sales_data.php',
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
    '/frontend/js/modules/SalesData.js',
    '/assets/menu.svg',
    '/assets/add.svg',
    '/assets/close.svg',
    '/assets/refresh.svg',
    '/assets/save.svg',
    '/pwa/offline.html'
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

/* Обработка запросов */
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    /* API запросы — network-first */
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    /* Кешируем успешные GET запросы */
                    if (event.request.method === 'GET' && response.ok) {
                        const responseClone = response.clone();
                        caches.open(API_CACHE).then(cache => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    /* При ошибке пробуем вернуть из кеша */
                    return caches.match(event.request);
                })
        );
        return;
    }
    
    /* Статика — cache-first */
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                return fetch(event.request)
                    .then(response => {
                        /* Кешируем новые ресурсы */
                        if (response.ok && event.request.method === 'GET') {
                            const responseClone = response.clone();
                            caches.open(STATIC_CACHE).then(cache => {
                                cache.put(event.request, responseClone);
                            });
                        }
                        return response;
                    })
                    .catch(() => {
                        /* Офлайн — показываем заглушку для HTML страниц */
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match('/pwa/offline.html');
                        }
                    });
            })
    );
});