<?php
// header.php - Общий компонент шапки с мобильным меню

// Получаем имя и роль текущего пользователя (если функции доступны)
$userName = '';
$userRole = 'viewer';
if (function_exists('getCurrentUserName')) {
    $userName = getCurrentUserName() ?: getCurrentUserId();
}
if (function_exists('getCurrentUserRole')) {
    $userRole = getCurrentUserRole();
}
?>

<header>
    <!-- Десктопная навигация -->
    <nav class="desktop-nav">
        <a href="/contracts.php">Договора</a>
        <!-- <a href="stages.php">Этапы работ</a> -->
        <a href="/planfact.php">Планфакт</a>
        <!-- <a href="brigades.php">Бригады</a> -->
        <!-- <a href="adesk.php">Adesk</a> -->
        <?php if ($userRole === 'admin'): ?><a href="/settings.php">Настройки</a><?php endif; ?>
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
        <a href="/contracts.php">Договора</a>
        <!-- <a href="stages.php">Этапы работ</a> -->
        <a href="/planfact.php">Планфакт</a>
        <!-- <a href="brigades.php">Бригады</a> -->
        <!-- <a href="adesk.php">Adesk</a> -->
        <?php if ($userRole === 'admin'): ?><a href="/settings.php">Настройки</a><?php endif; ?>
    </nav>
    
    <div class="mobile-menu-footer">
        <span class="mobile-menu-user"><?php echo htmlspecialchars($userName); ?></span>
        <a href="/logout.php" class="mobile-menu-logout">Выход</a>
    </div>
</div>

<script>
// Скрипт мобильного меню
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
        
        // Закрытие по клику на ссылку
        menu.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
                menu.classList.remove('active');
                document.body.classList.remove('mobile-menu-open');
                document.body.style.overflow = '';
            });
        });
    }
})();
</script>