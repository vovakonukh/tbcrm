<?php
/* header.php - Общий компонент шапки с мобильным меню */

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
        /* В случае ошибки — показываем минимальное меню */
        $menuPermissions = ['contracts' => true];
    }
}

/* Хелпер для проверки доступа к пункту меню */
function canViewMenu($resource) {
    global $menuPermissions;
    return !empty($menuPermissions[$resource]);
}

/* Проверяем доступ к разделу "Отдел продаж" (любой из подпунктов) */
$canViewSales = canViewMenu('sales_data') || canViewMenu('sales_report');
?>

<style>
/* Dropdown в навигации */
.nav-dropdown {
    position: relative;
}

.nav-dropdown-toggle {
    display: block;
    padding: 8px 14px;
    border-radius: var(--radius-sm);
    transition-duration: var(--transition-slow);
    text-decoration: none;
    color: var(--color-text);
    font-weight: var(--font-weight-bold);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
}

.nav-dropdown-toggle:hover {
    background-color: var(--color-bg-hover);
}

.nav-dropdown-toggle::after {
    content: '';
    border: 4px solid transparent;
    border-top-color: currentColor;
    margin-top: 3px;
}

.nav-dropdown-menu {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    background: var(--color-bg-white);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
    min-width: 200px;
    padding: 8px 0;
    z-index: 1000;
    border: 1px solid var(--color-border);
}

.nav-dropdown:hover .nav-dropdown-menu {
    display: block;
}

.nav-dropdown-menu a {
    display: block;
    padding: 10px 16px !important;
    border-radius: 0 !important;
    font-weight: var(--font-weight-medium) !important;
    color: var(--color-text-secondary) !important;
}

.nav-dropdown-menu a:hover {
    background-color: var(--color-bg-light) !important;
    color: var(--color-text) !important;
}

/* Мобильный раскрывающийся список */
.mobile-submenu-toggle {
    display: block;
    padding: 16px 20px;
    font-size: 18px;
    font-weight: var(--font-weight-bold);
    color: var(--color-text);
    text-decoration: none;
    border-radius: var(--radius-lg);
    transition: background-color var(--transition-normal);
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.mobile-submenu-toggle:hover {
    background-color: var(--color-bg-light);
}

.mobile-submenu-toggle::after {
    content: '';
    border: 5px solid transparent;
    border-top-color: currentColor;
    margin-top: 3px;
    transition: transform var(--transition-normal);
}

.mobile-submenu-toggle.open::after {
    transform: rotate(180deg);
    margin-top: -3px;
}

.mobile-submenu {
    display: none;
    padding-left: 20px;
}

.mobile-submenu.open {
    display: block;
}

.mobile-submenu a {
    padding: 14px 20px !important;
    font-size: 16px !important;
    font-weight: var(--font-weight-medium) !important;
    color: var(--color-text-secondary) !important;
}

.mobile-submenu a:hover {
    color: var(--color-text) !important;
}
</style>

<header>
    <!-- Десктопная навигация -->
    <nav class="desktop-nav">
        <?php if (canViewMenu('contracts')): ?><a href="/contracts.php">Договора</a><?php endif; ?>
        <?php if (canViewMenu('stages')): ?><a href="/stages.php">Этапы</a><?php endif; ?>
        <?php if (canViewMenu('brigades')): ?><a href="/brigades.php">Бригады</a><?php endif; ?>
        <?php if (canViewMenu('planfact')): ?><a href="/planfact.php">Планфакт</a><?php endif; ?>
        <?php if (canViewMenu('dashboard')): ?><a href="/dashboard.php">Дашборд</a><?php endif; ?>
        <?php if ($canViewSales): ?>
        <div class="nav-dropdown">
            <span class="nav-dropdown-toggle">Отдел продаж</span>
            <div class="nav-dropdown-menu">
                <?php if (canViewMenu('sales_report')): ?><a href="/sales_report.php">Отчет по продажам</a><?php endif; ?>
                <?php if (canViewMenu('sales_data')): ?><a href="/sales_data.php">Сырые данные</a><?php endif; ?>
            </div>
        </div>
        <?php endif; ?>
        <?php if (canViewMenu('settings')): ?><a href="/settings.php">Настройки</a><?php endif; ?>
    </nav>
    
    <!-- Десктопный блок пользователя -->
    <div class="desktop-user" style="margin-left: auto; display: flex; align-items: center; gap: 15px;">
        <span style="color: #868e96; font-size: 14px;">
            <?php echo htmlspecialchars($userName); ?>
        </span>
        <a href="/logout.php" style="background-color: #fa5252; color: white; padding: 6px 14px; border-radius: 4px; text-decoration: none; font-size: 14px;">
            Выход
        </a>
    </div>

    <!-- Кнопка списка договоров (только на странице договора) -->
    <button class="sidebar-toggle" id="sidebar-toggle" aria-label="Список договоров">
        <img src="/assets/list.svg" alt="Список">
    </button>
    
    <!-- Кнопка мобильного меню -->
    <button class="mobile-menu-toggle" id="mobile-menu-toggle" aria-label="Открыть меню">
        <img src="/assets/menu.svg" alt="Меню">
    </button>
</header>

<!-- Мобильное меню -->
<div class="mobile-menu" id="mobile-menu">
    <div class="mobile-menu-header">
        <button class="mobile-menu-close" id="mobile-menu-close" aria-label="Закрыть меню">
            <img src="/assets/close.svg" />
        </button>
    </div>
    
    <nav class="mobile-menu-nav">
        <?php if (canViewMenu('contracts')): ?><a href="/contracts.php">Договора</a><?php endif; ?>
        <?php if (canViewMenu('stages')): ?><a href="/stages.php">Этапы</a><?php endif; ?>
        <?php if (canViewMenu('brigades')): ?><a href="/brigades.php">Бригады</a><?php endif; ?>
        <?php if (canViewMenu('planfact')): ?><a href="/planfact.php">Планфакт</a><?php endif; ?>
        <?php if (canViewMenu('dashboard')): ?><a href="/dashboard.php">Дашборд</a><?php endif; ?>
        <?php if ($canViewSales): ?>
        <div class="mobile-submenu-wrapper">
            <span class="mobile-submenu-toggle">Отдел продаж</span>
            <div class="mobile-submenu">
                <?php if (canViewMenu('sales_report')): ?><a href="/sales_report.php">Отчет по продажам</a><?php endif; ?>
                <?php if (canViewMenu('sales_data')): ?><a href="/sales_data.php">Сырые данные</a><?php endif; ?>
            </div>
        </div>
        <?php endif; ?>
        <?php if (canViewMenu('settings')): ?><a href="/settings.php">Настройки</a><?php endif; ?>
    </nav>
    
    <div class="mobile-menu-footer">
        <span class="mobile-menu-user"><?php echo htmlspecialchars($userName); ?></span>
        <a href="/logout.php" class="mobile-menu-logout">Выход</a>
    </div>
</div>

<script>
/* Скрипт мобильного меню */
(function() {
    const toggle = document.getElementById('mobile-menu-toggle');
    const menu = document.getElementById('mobile-menu');
    const close = document.getElementById('mobile-menu-close');
    
    if (toggle && menu && close) {
        toggle.addEventListener('click', function() {
            menu.classList.add('active');
            document.body.classList.add('mobile-menu-open');
            document.body.style.overflow = 'hidden';
        });
        
        close.addEventListener('click', function() {
            menu.classList.remove('active');
            document.body.classList.remove('mobile-menu-open');
            document.body.style.overflow = '';
        });
        
        /* Закрытие по клику на ссылку */
        menu.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
                menu.classList.remove('active');
                document.body.classList.remove('mobile-menu-open');
                document.body.style.overflow = '';
            });
        });
    }
    
    /* Раскрывающийся список в мобильном меню */
    document.querySelectorAll('.mobile-submenu-toggle').forEach(function(toggle) {
        toggle.addEventListener('click', function() {
            this.classList.toggle('open');
            const submenu = this.nextElementSibling;
            if (submenu) {
                submenu.classList.toggle('open');
            }
        });
    });
})();
</script>