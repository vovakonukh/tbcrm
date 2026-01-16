<?php
/* sidebar.php - Боковое навигационное меню */

/* Получаем имя и роль текущего пользователя */
$userName = '';
$userRoleId = null;
if (function_exists('getCurrentUserName')) {
    $userName = getCurrentUserName() ?: getCurrentUserId();
}
if (function_exists('getCurrentUserRoleId')) {
    $userRoleId = getCurrentUserRoleId();
}

/* Загружаем права доступа для текущей роли */
$menuPermissions = [];
if ($userRoleId && isset($pdo)) {
    try {
        $stmt = $pdo->prepare("SELECT resource, can_view FROM permissions WHERE role_id = ?");
        $stmt->execute([$userRoleId]);
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $menuPermissions[$row['resource']] = (bool) $row['can_view'];
        }
    } catch (PDOException $e) {
        $menuPermissions = ['contracts' => true];
    }
}

/* Хелпер для проверки доступа к пункту меню */
function canViewMenu($resource) {
    global $menuPermissions;
    return !empty($menuPermissions[$resource]);
}

/* Проверяем доступ к разделам с подменю */
$canViewSales = canViewMenu('sales_data') || canViewMenu('sales_report');
$canViewSettings = canViewMenu('settings') || canViewMenu('access');
?>

<style>
/* =================================================================
   БОКОВОЙ САЙДБАР - НАВИГАЦИЯ
   ================================================================= */

/* Обёртка страницы с сайдбаром */
.app-layout {
    display: flex;
    min-height: 100vh;
}

/* Основной контент */
.app-content {
    flex: 1;
    min-width: 0;
    margin-left: 70px;
    transition: margin-left 0.3s ease;
}

.app-layout.sidebar-expanded .app-content {
    margin-left: 240px;
}

/* Сайдбар */
.app-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 70px;
    height: 100vh;
    background-color: #21252d;
    display: flex;
    flex-direction: column;
    z-index: 1000;
    transition: width 0.3s ease;
}

.app-layout.sidebar-expanded .app-sidebar {
    width: 240px;
}

/* Шапка сайдбара с гамбургером и пользователем */
.sidebar-header {
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    min-height: 56px;
    gap: 12px;
}

.app-layout.sidebar-expanded .sidebar-header {
    justify-content: flex-start;
}

.sidebar-hamburger {
    background: none;
    border: none;
    padding: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: background-color 0.2s;
    flex-shrink: 0;
}

.sidebar-hamburger:hover {
    background-color: rgba(255, 255, 255, 0.1);
}

.sidebar-hamburger img {
    width: 20px;
    height: 20px;
    opacity: 0.8;
    transition: opacity 0.2s;
}

.sidebar-hamburger:hover img {
    opacity: 1;
}

/* Кнопка закрытия (только на мобильных) */
.sidebar-close {
    display: none;
}

/* Блок пользователя в шапке */
.sidebar-user {
    display: none;
    align-items: center;
    flex: 1;
    min-width: 0;
}

.app-layout.sidebar-expanded .sidebar-user {
    display: flex;
}

.sidebar-user-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.sidebar-user-name {
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.sidebar-user-role {
    color: #6b7280;
    font-size: 12px;
    white-space: nowrap;
}

/* Навигация */
.sidebar-nav {
    flex: 1;
    padding: 12px 0;
    overflow-y: auto;
    overflow-x: hidden;
}

/* Пункт меню - свёрнутое состояние: только иконка по центру */
.sidebar-item {
    box-sizing: border-box;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px 0;
    width: 70px;
    color: #9ca3af;
    text-decoration: none;
    transition: all 0.2s;
    cursor: pointer;
    white-space: nowrap;
}

/* Пункт меню - развёрнутое состояние */
.app-layout.sidebar-expanded .sidebar-item {
    justify-content: flex-start;
    padding: 12px 20px;
    width: 240px;
}

.sidebar-item:hover {
    background-color: rgba(255, 255, 255, 0.08);
    color: #fff;
}

.sidebar-item.active {
    background-color: rgba(51, 154, 240, 0.15);
    color: #339af0;
    /* border-right: 3px solid #339af0; */
}

.sidebar-item-icon {
    width: 20px;
    height: 20px;
    min-width: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.sidebar-item-icon img {
    width: 20px;
    height: 20px;
    opacity: 0.7;
    transition: opacity 0.2s;
}

.sidebar-item:hover .sidebar-item-icon img {
    opacity: 1;
}

/* Текст пункта меню - скрыт в свёрнутом состоянии */
.sidebar-item-text {
    margin-left: 14px;
    font-size: 14px;
    font-weight: 500;
    display: none;
}

.app-layout.sidebar-expanded .sidebar-item-text {
    display: block;
}

/* Стрелка для подменю - скрыта в свёрнутом состоянии */
.sidebar-item-arrow {
    position: absolute;
    right: 16px;
    display: none;
    opacity: 0.6;
    transition: transform 0.2s;
}

.app-layout.sidebar-expanded .sidebar-item-arrow {
    display: block;
}

.sidebar-item:hover .sidebar-item-arrow {
    opacity: 1;
}

.sidebar-item-arrow svg {
    width: 16px;
    height: 16px;
}

/* Выпадающее подменю (десктоп) */
.sidebar-submenu {
    position: fixed;
    background-color: #2d323c;
    border-radius: 8px;
    min-width: 180px;
    padding: 8px 0;
    box-shadow: 4px 4px 12px rgba(0, 0, 0, 0.3);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.2s ease, visibility 0.2s ease;
    z-index: 1001;
}

.sidebar-submenu.visible {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
}

.sidebar-submenu a {
    display: block;
    padding: 10px 16px;
    color: #9ca3af;
    text-decoration: none;
    font-size: 14px;
    transition: all 0.15s;
}

.sidebar-submenu a:hover {
    background-color: rgba(255, 255, 255, 0.08);
    color: #fff;
}

.sidebar-submenu a.active {
    color: #339af0;
    background-color: rgba(51, 154, 240, 0.1);
}

/* Футер сайдбара (кнопка выхода) */
.sidebar-footer {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding: 12px;
}

.sidebar-logout {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px;
    background-color: rgba(250, 82, 82, 0.1);
    color: #fa5252;
    text-decoration: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    transition: background-color 0.2s;
}

.sidebar-logout:hover {
    background-color: rgba(250, 82, 82, 0.2);
}

.sidebar-logout-icon {
    width: 20px;
    height: 20px;
}

.sidebar-logout-text {
    margin-left: 10px;
    display: none;
}

.app-layout.sidebar-expanded .sidebar-logout-text {
    display: block;
}

/* =================================================================
   МОБИЛЬНАЯ АДАПТАЦИЯ
   ================================================================= */

/* Мобильная верхняя полоска */
.mobile-topbar {
    display: none;
}

/* Оверлей для мобильных */
.sidebar-overlay {
    display: none;
}

@media (max-width: 768px) {
    /* Мобильная верхняя полоска */
    .mobile-topbar {
        display: flex;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 50px;
        background-color: #fff;
        align-items: center;
        padding: 0 12px;
        z-index: 998;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .mobile-topbar {
        justify-content: flex-end;
    }

    .mobile-topbar-hamburger {
        background: none;
        border: none;
        padding: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
    }

    /* Место для второго гамбургера слева (для страницы contract) */
    .mobile-topbar-left {
        margin-right: auto;
        display: flex;
        align-items: center;
    }
    
    .mobile-topbar-hamburger:active {
        background-color: #f1f3f4;
    }
    
    .mobile-topbar-hamburger img {
        width: 24px;
        height: 24px;
    }
    
    /* Место для второго гамбургера справа (для страницы contract) */
    .mobile-topbar-right {
        margin-left: auto;
        display: flex;
        align-items: center;
    }
    
    /* Контент с отступом сверху под мобильную полоску */
    .app-content {
        margin-left: 0 !important;
        padding-top: 50px;
    }
    
    /* Сайдбар справа на мобильных */
    .app-sidebar {
        position: fixed;
        top: 0;
        left: auto;
        right: 0;
        width: 280px;
        height: 100vh;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        z-index: 1000;
    }

    /* Открытый сайдбар на мобильных */
    .app-layout.sidebar-mobile-open .app-sidebar {
        transform: translateX(0);
    }

    /* Сдвиг контента при открытом сайдбаре */
    .app-layout.sidebar-mobile-open .app-content {
        transform: translateX(-280px);
    }

    .app-layout.sidebar-mobile-open .mobile-topbar {
        transform: translateX(-280px);
    }

    /* Оверлей */
    .sidebar-overlay {
        display: block;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0);
        z-index: 999;
        pointer-events: none;
        transition: background-color 0.3s ease;
    }

    .app-layout.sidebar-mobile-open .sidebar-overlay {
        background-color: rgba(0, 0, 0, 0.5);
        pointer-events: auto;
        transform: translateX(-280px);
    }
    
    /* Шапка сайдбара на мобильных */
    .sidebar-header {
        justify-content: space-between;
        padding: 12px 16px;
    }
    
    /* Скрываем десктопный гамбургер */
    .sidebar-hamburger {
        display: none;
    }
    
    /* Показываем кнопку закрытия */
    .sidebar-close {
        display: flex;
        background: none;
        border: none;
        padding: 6px;
        cursor: pointer;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: background-color 0.2s;
        margin-left: auto;
    }
    
    .sidebar-close:active {
        background-color: rgba(255, 255, 255, 0.1);
    }
    
    .sidebar-close img {
        width: 20px;
        height: 20px;
        opacity: 0.8;
    }
    
    /* Показываем блок пользователя */
    .sidebar-user {
        display: flex;
    }
    
    /* Пункты меню на мобильных - всегда развёрнутые */
    .sidebar-item {
        justify-content: flex-start;
        padding: 14px 20px;
        width: 100%;
    }
    
    .sidebar-item-text {
        display: block;
    }
    
    .sidebar-item-arrow {
        display: block;
    }
    
    /* Аккордеон для подменю на мобильных */
    .sidebar-item-arrow.rotated {
        transform: rotate(90deg);
    }
    
    /* Скрываем выпадающее подменю на мобильных */
    .sidebar-submenu {
        position: static;
        display: none;
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
        background-color: transparent;
        box-shadow: none;
        border-radius: 0;
        padding: 0;
        min-width: 0;
        padding-left: 34px;
    }
    
    .sidebar-submenu.mobile-open {
        display: block;
    }
    
    .sidebar-submenu a {
        padding: 12px 20px;
    }
    
    /* Кнопка выхода */
    .sidebar-logout-text {
        display: block;
    }
}
</style>

<!-- Мобильная верхняя полоска -->
<div class="mobile-topbar">
    <div class="mobile-topbar-left" id="mobile-topbar-left">
        <!-- Место для второго гамбургера на странице contract -->
    </div>
    <button class="mobile-topbar-hamburger" id="mobile-topbar-hamburger" aria-label="Открыть меню">
        <img src="/assets/menu.svg" alt="Меню">
    </button>
</div>

<!-- Оверлей для мобильных -->
<div class="sidebar-overlay" id="sidebar-overlay"></div>

<!-- Сайдбар -->
<aside class="app-sidebar" id="app-sidebar">
    <!-- Шапка с пользователем и кнопкой закрытия -->
    <div class="sidebar-header">
        <button class="sidebar-hamburger" id="sidebar-hamburger" aria-label="Развернуть меню">
            <img src="/assets/sidebar.svg" alt="Меню">
        </button>
        <div class="sidebar-user">
            <div class="sidebar-user-info">
                <div class="sidebar-user-name"><?php echo htmlspecialchars($userName ?: 'Пользователь'); ?></div>
                <div class="sidebar-user-role">Сотрудник</div>
            </div>
        </div>
        <button class="sidebar-close" id="sidebar-close" aria-label="Закрыть меню">
            <img src="/assets/close.svg" alt="Закрыть">
        </button>
    </div>
    
    <!-- Навигация -->
    <nav class="sidebar-nav">
        <?php if (canViewMenu('contracts')): ?>
        <a href="/contracts.php" class="sidebar-item" data-page="contracts">
            <span class="sidebar-item-icon">
                <img src="/assets/handshake.svg" alt="">
            </span>
            <span class="sidebar-item-text">Договора</span>
        </a>
        <?php endif; ?>
        
        <?php if (canViewMenu('planfact')): ?>
        <a href="/planfact.php" class="sidebar-item" data-page="planfact">
            <span class="sidebar-item-icon">
                <img src="/assets/graph.svg" alt="">
            </span>
            <span class="sidebar-item-text">Планфакт</span>
        </a>
        <?php endif; ?>
        
        <?php if ($canViewSales): ?>
        <div class="sidebar-item sidebar-item-has-submenu" data-page="sales">
            <span class="sidebar-item-icon">
                <img src="/assets/people.svg" alt="">
            </span>
            <span class="sidebar-item-text">Отдел продаж</span>
            <span class="sidebar-item-arrow">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </span>
        </div>
        <div class="sidebar-submenu" data-submenu="sales">
            <?php if (canViewMenu('sales_report')): ?>
            <a href="/sales_report.php" data-page="sales_report">Отчёт по продажам</a>
            <?php endif; ?>
            <?php if (canViewMenu('sales_data')): ?>
            <a href="/sales_data.php" data-page="sales_data">Сырые данные</a>
            <?php endif; ?>
        </div>
        <?php endif; ?>
        
        <?php if ($canViewSettings): ?>
        <div class="sidebar-item sidebar-item-has-submenu" data-page="settings-menu">
            <span class="sidebar-item-icon">
                <img src="/assets/gear.svg" alt="">
            </span>
            <span class="sidebar-item-text">Настройки</span>
            <span class="sidebar-item-arrow">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </span>
        </div>
        <div class="sidebar-submenu" data-submenu="settings-menu">
            <?php if (canViewMenu('settings')): ?>
            <a href="/settings.php" data-page="settings">Справочники</a>
            <?php endif; ?>
            <?php if (canViewMenu('access')): ?>
            <a href="/access.php" data-page="access">Доступ</a>
            <?php endif; ?>
        </div>
        <?php endif; ?>
    </nav>
    
    <!-- Футер с кнопкой выхода -->
    <div class="sidebar-footer">
        <a href="/logout.php" class="sidebar-logout">
            <svg class="sidebar-logout-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M16 17L21 12L16 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 12H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="sidebar-logout-text">Выход</span>
        </a>
    </div>
</aside>

<script>
/* Скрипт управления сайдбаром */
(function() {
    const STORAGE_KEY = 'sidebar_expanded';
    const layout = document.querySelector('.app-layout');
    const sidebar = document.getElementById('app-sidebar');
    const hamburger = document.getElementById('sidebar-hamburger');
    const mobileHamburger = document.getElementById('mobile-topbar-hamburger');
    const closeBtn = document.getElementById('sidebar-close');
    const overlay = document.getElementById('sidebar-overlay');
    
    /* Проверка мобильного устройства */
    function isMobile() {
        return window.innerWidth <= 768;
    }
    
    /* Восстанавливаем состояние из localStorage (только для десктопа) */
    function restoreState() {
        if (!isMobile()) {
            const expanded = localStorage.getItem(STORAGE_KEY) === 'true';
            if (expanded) {
                layout.classList.add('sidebar-expanded');
            }
        }
    }
    
    /* Переключение состояния на десктопе */
    function toggleDesktop() {
        layout.classList.toggle('sidebar-expanded');
        const expanded = layout.classList.contains('sidebar-expanded');
        localStorage.setItem(STORAGE_KEY, expanded);
    }
    
    /* Открытие сайдбара на мобильных */
    function openMobile() {
        layout.classList.add('sidebar-mobile-open');
        document.body.style.overflow = 'hidden';
    }
    
    /* Закрытие сайдбара на мобильных */
    function closeMobile() {
        layout.classList.remove('sidebar-mobile-open');
        document.body.style.overflow = '';
    }
    
    /* Подсветка активного пункта меню */
    function highlightActive() {
        const currentPath = window.location.pathname;
        const items = document.querySelectorAll('.sidebar-item[data-page], .sidebar-submenu a[data-page]');
        
        items.forEach(item => {
            const href = item.getAttribute('href');
            if (href && currentPath.includes(href.replace('.php', ''))) {
                item.classList.add('active');
                /* Если это подменю, подсвечиваем родителя и раскрываем на мобильных */
                const submenuParent = item.closest('.sidebar-submenu');
                if (submenuParent) {
                    const parentPage = submenuParent.getAttribute('data-submenu');
                    const parentItem = document.querySelector(`.sidebar-item[data-page="${parentPage}"]`);
                    if (parentItem) {
                        parentItem.classList.add('active');
                        /* На мобильных раскрываем подменю с активным пунктом */
                        if (isMobile()) {
                            submenuParent.classList.add('mobile-open');
                            const arrow = parentItem.querySelector('.sidebar-item-arrow');
                            if (arrow) arrow.classList.add('rotated');
                        }
                    }
                }
            }
        });
    }

    /* Управление выпадающими подменю (десктоп) */
    function initDesktopSubmenus() {
        const itemsWithSubmenu = sidebar.querySelectorAll('.sidebar-item-has-submenu');
        
        itemsWithSubmenu.forEach(item => {
            const submenuId = item.getAttribute('data-page');
            const submenu = document.querySelector(`.sidebar-submenu[data-submenu="${submenuId}"]`);
            if (!submenu) return;
            
            let hideTimeout = null;
            
            function showSubmenu() {
                if (isMobile()) return;
                clearTimeout(hideTimeout);
                const rect = item.getBoundingClientRect();
                const sidebarWidth = layout.classList.contains('sidebar-expanded') ? 245 : 75;
                
                submenu.style.left = sidebarWidth + 'px';
                submenu.style.top = rect.top + 'px';
                
                submenu.classList.add('visible');
                
                const submenuRect = submenu.getBoundingClientRect();
                if (submenuRect.bottom > window.innerHeight) {
                    submenu.style.top = (window.innerHeight - submenuRect.height - 10) + 'px';
                }
            }
            
            function hideSubmenu() {
                if (isMobile()) return;
                hideTimeout = setTimeout(() => {
                    submenu.classList.remove('visible');
                }, 100);
            }
            
            item.addEventListener('mouseenter', showSubmenu);
            item.addEventListener('mouseleave', hideSubmenu);
            submenu.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
            submenu.addEventListener('mouseleave', hideSubmenu);
        });
    }
    
    /* Управление аккордеоном подменю (мобильные) */
    function initMobileSubmenus() {
        const itemsWithSubmenu = sidebar.querySelectorAll('.sidebar-item-has-submenu');
        
        itemsWithSubmenu.forEach(item => {
            item.addEventListener('click', (e) => {
                if (!isMobile()) return;
                e.preventDefault();
                
                const submenuId = item.getAttribute('data-page');
                const submenu = document.querySelector(`.sidebar-submenu[data-submenu="${submenuId}"]`);
                const arrow = item.querySelector('.sidebar-item-arrow');
                
                if (submenu) {
                    submenu.classList.toggle('mobile-open');
                }
                if (arrow) {
                    arrow.classList.toggle('rotated');
                }
            });
        });
    }
    
    /* Инициализация */
    restoreState();
    highlightActive();
    initDesktopSubmenus();
    initMobileSubmenus();
    
    /* События десктоп */
    if (hamburger) {
        hamburger.addEventListener('click', toggleDesktop);
    }
    
    /* События мобильные */
    if (mobileHamburger) {
        mobileHamburger.addEventListener('click', openMobile);
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeMobile);
    }
    
    if (overlay) {
        overlay.addEventListener('click', closeMobile);
    }
    
    /* Закрытие мобильного меню при клике на ссылку */
    sidebar.querySelectorAll('a[href]').forEach(link => {
        link.addEventListener('click', () => {
            if (isMobile()) {
                closeMobile();
            }
        });
    });
    
    /* Обработка ресайза окна */
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (!isMobile()) {
                closeMobile();
                restoreState();
                /* Сбрасываем мобильные стили подменю */
                document.querySelectorAll('.sidebar-submenu').forEach(sub => {
                    sub.classList.remove('mobile-open');
                    sub.style.left = '';
                    sub.style.top = '';
                });
                document.querySelectorAll('.sidebar-item-arrow').forEach(arrow => {
                    arrow.classList.remove('rotated');
                });
            } else {
                layout.classList.remove('sidebar-expanded');
            }
        }, 100);
    });
})();
</script>