<?php 
require_once 'api/check_auth.php';
require_once 'api/config.php';

/* Получаем ID договора из GET параметра */
$contractId = isset($_GET['id']) ? intval($_GET['id']) : 0;

if (!$contractId) {
    header('Location: /contracts.php');
    exit;
}

/* Загружаем данные договора */
try {
    $stmt = $pdo->prepare("
        SELECT c.*,
            m.name as manager_name,
            sop.name as sop_name,
            pt.name as payment_type_name,
            ea.name as escrow_agent_name,
            s.name as source_name,
            p.name as project_name,
            comp.name as complectation_name,
            ist.name as ipoteka_status_name
        FROM contracts c
        LEFT JOIN managers m ON c.manager_id = m.id
        LEFT JOIN managers sop ON c.sop_id = sop.id
        LEFT JOIN payment_types pt ON c.payment_type_id = pt.id
        LEFT JOIN escrow_agents ea ON c.escrow_agent_id = ea.id
        LEFT JOIN sources s ON c.source_id = s.id
        LEFT JOIN projects p ON c.project_id = p.id
        LEFT JOIN complectation comp ON c.complectation_id = comp.id
        LEFT JOIN ipoteka_status ist ON c.ipoteka_status_id = ist.id
        WHERE c.id = ?
    ");
    $stmt->execute([$contractId]);
    $contract = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$contract) {
        header('Location: /contracts.php?error=not_found');
        exit;
    }
} catch (PDOException $e) {
    header('Location: /contracts.php?error=db_error');
    exit;
}

/* Хелперы для форматирования */
function formatMoney($value) {
    if ($value === null || $value === '') return '—';
    return number_format(floatval($value), 0, ',', ' ') . ' ₽';
}

function formatDate($value) {
    if (!$value) return '—';
    $date = new DateTime($value);
    return $date->format('d.m.Y');
}

function formatDateTime($value) {
    if (!$value) return '—';
    $date = new DateTime($value);
    return $date->format('d.m.Y H:i');
}

function formatStatus($value) {
    $statuses = [
        'да' => ['text' => 'Да', 'class' => 'status-yes'],
        'нет' => ['text' => 'Нет', 'class' => 'status-no'],
        'в процессе' => ['text' => 'В процессе', 'class' => 'status-progress']
    ];
    if (!$value || !isset($statuses[$value])) return '—';
    return '<span class="status-badge ' . $statuses[$value]['class'] . '">' . $statuses[$value]['text'] . '</span>';
}

function displayValue($value, $default = '—') {
    return ($value !== null && $value !== '') ? htmlspecialchars($value) : $default;
}

/* Вычисляем маржинальность */
$marginPercent = null;
if ($contract['profit'] && $contract['final_amount'] && floatval($contract['final_amount']) != 0) {
    $marginPercent = round((floatval($contract['profit']) / floatval($contract['final_amount'])) * 100, 1);
}
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($contract['contract_name']) ?> - Договор</title>
    <link href="frontend/css/style.css?v=1.3" rel="stylesheet">
    <link href="frontend/css/fonts.css" rel="stylesheet">
    <style>
        /* Стили карточки договора */
        .contract-card {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
            gap: 20px;
            flex-wrap: wrap;
        }
        
        .card-header-left {
            flex: 1;
            min-width: 300px;
        }
        
        .card-title {
            font-size: 28px;
            font-weight: 700;
            color: #2c3e50;
            margin: 0 0 8px 0;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .card-subtitle {
            font-size: 14px;
            color: #868e96;
        }
        
        .card-status {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
        }
        
        .card-status.active {
            background-color: #d3f9d8;
            color: #2b8a3e;
        }
        
        .card-status.inactive {
            background-color: #ffe3e3;
            color: #c92a2a;
        }
        
        .card-actions {
            display: flex;
            gap: 10px;
        }
        
        .btn-edit {
            background-color: var(--color-primary);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        
        .btn-edit:hover {
            background-color: var(--color-primary-hover);
        }
        
        .btn-back {
            background-color: white;
            color: #495057;
            border: 1px solid #ced4da;
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        
        .btn-back:hover {
            background-color: #f8f9fa;
        }
        
        /* Секции */
        .card-section {
            background: white;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        
        .section-title {
            font-size: 16px;
            font-weight: 600;
            color: #2c3e50;
            margin: 0 0 20px 0;
            padding-bottom: 12px;
            border-bottom: 1px solid #e9ecef;
        }
        
        /* Сетка данных */
        .data-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
        }
        
        .data-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        
        .data-label {
            font-size: 12px;
            color: #868e96;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .data-value {
            font-size: 15px;
            color: #2c3e50;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .data-value.large {
            font-size: 20px;
            font-weight: 600;
        }
        
        .data-value.positive {
            color: #2b8a3e;
        }
        
        .data-value.negative {
            color: #c92a2a;
        }
        
        /* Кнопка копирования */
        .copy-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px;
            opacity: 0.4;
            transition: opacity 0.2s;
            display: inline-flex;
            align-items: center;
        }
        
        .copy-btn:hover {
            opacity: 1;
        }
        
        .copy-btn img {
            width: 16px;
            height: 16px;
        }
        
        .copy-btn.copied {
            opacity: 1;
        }
        
        .copy-btn.copied img {
            filter: invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(90%) contrast(90%);
        }
        
        /* Статусы */
        .status-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 500;
        }
        
        .status-yes {
            background-color: #d3f9d8;
            color: #2b8a3e;
        }
        
        .status-no {
            background-color: #ffe3e3;
            color: #c92a2a;
        }
        
        .status-progress {
            background-color: #fff3bf;
            color: #e67700;
        }
        
        /* Финансовый блок */
        .finance-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 20px;
        }
        
        .finance-item {
            background: #f8f9fa;
            padding: 16px;
            border-radius: 8px;
        }
        
        .finance-label {
            font-size: 12px;
            color: #868e96;
            margin-bottom: 4px;
        }
        
        .finance-value {
            font-size: 22px;
            font-weight: 700;
            color: #2c3e50;
        }
        
        .finance-value.profit {
            color: #2b8a3e;
        }
        
        /* Таблица этапов (заглушка) */
        .stages-placeholder {
            background: #f8f9fa;
            border: 2px dashed #dee2e6;
            border-radius: 8px;
            padding: 40px;
            text-align: center;
            color: #868e96;
        }
        
        .stages-placeholder-icon {
            font-size: 48px;
            margin-bottom: 12px;
        }
        
        /* История изменений (заглушка) */
        .history-list {
            max-height: 300px;
            overflow-y: auto;
        }
        
        .history-item {
            display: flex;
            gap: 12px;
            padding: 12px 0;
            border-bottom: 1px solid #f1f3f5;
        }
        
        .history-item:last-child {
            border-bottom: none;
        }
        
        .history-date {
            font-size: 12px;
            color: #868e96;
            white-space: nowrap;
        }
        
        .history-text {
            font-size: 14px;
            color: #495057;
        }
        
        .history-placeholder {
            color: #868e96;
            font-size: 14px;
            text-align: center;
            padding: 20px;
        }
        
        /* Адаптив */
        @media (max-width: 768px) {
            .card-header {
                flex-direction: column;
            }
            
            .card-title {
                font-size: 22px;
            }
            
            .data-grid {
                grid-template-columns: 1fr;
            }
            
            .finance-grid {
                grid-template-columns: 1fr 1fr;
            }
            
            .card-actions {
                width: 100%;
            }
            
            .card-actions a {
                flex: 1;
                justify-content: center;
            }
        }
        
        /* Двухколоночный layout для некоторых секций */
        .two-columns {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        @media (max-width: 900px) {
            .two-columns {
                grid-template-columns: 1fr;
            }
        }
        
        /* Ссылки */
        .data-link {
            color: var(--color-primary);
            text-decoration: none;
        }
        
        .data-link:hover {
            text-decoration: underline;
        }
        
        /* Комментарий */
        .comment-text {
            background: #f8f9fa;
            padding: 16px;
            border-radius: 8px;
            font-size: 14px;
            line-height: 1.6;
            color: #495057;
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <?php include 'header.php'; ?>
    
    <div class="container">
        <div class="contract-card">
            <!-- Шапка карточки -->
            <div class="card-header">
                <div class="card-header-left">
                    <h1 class="card-title">
                        <?= htmlspecialchars($contract['contract_name']) ?>
                        <button class="copy-btn" data-copy="<?= htmlspecialchars($contract['contract_name']) ?>" title="Копировать название">
                            <img src="/assets/copy.svg" alt="Копировать">
                        </button>
                    </h1>
                    <div class="card-subtitle">
                        
                        Создан: <?= formatDateTime($contract['created_at']) ?><br>
                        <?php if ($contract['updated_at']): ?>
                            Обновлён: <?= formatDateTime($contract['updated_at']) ?>
                        <?php endif; ?>
                    </div>
                </div>
                <div class="card-actions">
                    <a href="contracts.php" class="btn-back">← Назад к списку</a>
                    <!-- <a href="contracts.php?edit=<?= $contract['id'] ?>" class="btn-edit">✎ Редактировать</a> -->
                    <button class="btn-delete" id="delete-contract-btn" data-id="<?= $contract['id'] ?>">Удалить</button>
                </div>
            </div>
            
            <!-- Статус -->
            <div style="margin-bottom: 24px;">
                <?php if ($contract['is_active'] == 1): ?>
                    <span class="card-status active">● В работе</span>
                <?php else: ?>
                    <span class="card-status inactive">○ Завершён</span>
                <?php endif; ?>
            </div>

            <!-- Объект -->
            <div class="card-section">
                <h2 class="section-title">Объект</h2>
                <div class="two-columns">
                    <!-- Параметры строительства -->
                    <div>
                        <h3 style="font-size: 14px; color: #495057; margin: 0 0 16px 0;">Параметры строительства</h3>
                        <div class="data-grid" style="grid-template-columns: 1fr;">
                            <div class="data-item">
                                <div class="data-label">Проект</div>
                                <div class="data-value"><?= displayValue($contract['project_name']) ?></div>
                            </div>
                            <div class="data-item">
                                <div class="data-label">Комплектация</div>
                                <div class="data-value"><?= displayValue($contract['complectation_name']) ?></div>
                            </div>
                            <div class="data-item">
                                <div class="data-label">Фундамент</div>
                                <div class="data-value"><?= displayValue($contract['foundation']) ?></div>
                            </div>
                        </div>
                    </div>

                    <!-- Участок -->
                    <div>
                        <h3 style="font-size: 14px; color: #495057; margin: 0 0 16px 0;">Участок</h3>
                        <div class="data-grid" style="grid-template-columns: 1fr;">
                            <div class="data-item">
                                <div class="data-label">Адрес объекта</div>
                                <div class="data-value"><?= displayValue($contract['site_address']) ?></div>
                            </div>
                            <div class="data-item">
                                <div class="data-label">Координаты</div>
                                <div class="data-value">
                                    <?= displayValue($contract['site_coordinates']) ?>
                                    <?php if ($contract['site_coordinates']): ?>
                                        <button class="copy-btn" data-copy="<?= htmlspecialchars($contract['site_coordinates']) ?>" title="Копировать координаты">
                                            <img src="/assets/copy.svg" alt="Копировать">
                                        </button>
                                    <?php endif; ?>
                                </div>
                            </div>
                            <div class="data-item">
                                <div class="data-label">Ссылка на карту</div>
                                <div class="data-value">
                                    <?php if ($contract['site_map_link']): ?>
                                        <a href="<?= htmlspecialchars($contract['site_map_link']) ?>" target="_blank" class="data-link">Открыть карту ↗</a>
                                    <?php else: ?>
                                        —
                                    <?php endif; ?>
                                </div>
                            </div>
                            <div class="data-item">
                                <div class="data-label">Кадастровый номер</div>
                                <div class="data-value">
                                    <?= displayValue($contract['cadastral_number']) ?>
                                    <?php if ($contract['cadastral_number']): ?>
                                        <button class="copy-btn" data-copy="<?= htmlspecialchars($contract['cadastral_number']) ?>" title="Копировать кадастровый номер">
                                            <img src="/assets/copy.svg" alt="Копировать">
                                        </button>
                                    <?php endif; ?>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
               
            </div>
            
            <div class="two-columns">
            <!-- Заказчик -->
            <div class="card-section">
                <h2 class="section-title">Заказчик</h2>
                <div class="data-grid">
                    <div class="data-item">
                        <div class="data-label">Имя заказчика</div>
                        <div class="data-value"><?= displayValue($contract['customer_name']) ?></div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Телефон заказчика</div>
                        <div class="data-value">
                            <?= displayValue($contract['customer_phone']) ?>
                            <?php if ($contract['customer_phone']): ?>
                                <button class="copy-btn" data-copy="<?= htmlspecialchars($contract['customer_phone']) ?>" title="Копировать телефон">
                                    <img src="/assets/copy.svg" alt="Копировать">
                                </button>
                            <?php endif; ?>
                        </div>
                    </div>
                    <!-- Сюда добавить кнопку Позвонить, "tel:..."-->
                </div>
            </div>

            <!-- Ипотека -->
            <div class="card-section">
                <h2 class="section-title">Ипотека</h2> 

                <div class="data-grid">
                    
                    <div class="data-item">
                        <div class="data-label">Тип оплаты</div>
                        <div class="data-value"><?= displayValue($contract['payment_type_name']) ?></div>
                    </div>

                    <div class="data-item">
                        <div class="data-label">Статус ипотеки</div>
                        <div class="data-value"><?= displayValue($contract['ipoteka_status_name']) ?></div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Эскроу агент</div>
                        <div class="data-value"><?= displayValue($contract['escrow_agent_name']) ?></div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Номер эскроу счёта</div>
                        <div class="data-value">
                            <?= displayValue($contract['escrow_number']) ?>
                            <?php if ($contract['escrow_number']): ?>
                                <button class="copy-btn" data-copy="<?= htmlspecialchars($contract['escrow_number']) ?>" title="Копировать номер">
                                    <img src="/assets/copy.svg" alt="Копировать">
                                </button>
                            <?php endif; ?>
                        </div>
                    </div>
                    
                </div>
            </div>
            </div>
            
            
            <!-- Финансы -->
            <div class="card-section">
                <h2 class="section-title">Финансы</h2>
                <div class="finance-grid" style="margin-bottom: 20px;">
                    <div class="finance-item">
                        <div class="finance-label">Сумма договора</div>
                        <div class="finance-value" style="display: flex; align-items: center; gap: 8px;">
                            <?= formatMoney($contract['contract_amount']) ?>
                            <?php if ($contract['contract_amount']): ?>
                                <button class="copy-btn" data-copy="<?= $contract['contract_amount'] ?>" title="Копировать сумму">
                                    <img src="/assets/copy.svg" alt="Копировать">
                                </button>
                            <?php endif; ?>
                        </div>
                    </div>
                    <div class="finance-item">
                        <div class="finance-label">Сумма с допами</div>
                        <div class="finance-value"><?= formatMoney($contract['final_amount']) ?></div>
                    </div>
                    <div class="finance-item">
                        <div class="finance-label">Прибыль</div>
                        <div class="finance-value profit"><?= formatMoney($contract['profit']) ?></div>
                    </div>
                    <div class="finance-item">
                        <div class="finance-label">Маржинальность</div>
                        <div class="finance-value <?= $marginPercent !== null && $marginPercent > 0 ? 'profit' : '' ?>">
                            <?= $marginPercent !== null ? $marginPercent . '%' : '—' ?>
                        </div>
                    </div>
                </div>
            </div>
            
                
            <!-- Даты -->
            <div class="card-section">
                <h2 class="section-title">Даты</h2>
                <div class="data-grid">
                    <div class="data-item">
                        <div class="data-label">Дата лида</div>
                        <div class="data-value"><?= formatDate($contract['lead_date']) ?></div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Дата договора</div>
                        <div class="data-value"><?= formatDate($contract['contract_date']) ?></div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Дата заезда</div>
                        <div class="data-value"><?= formatDate($contract['construction_start_date']) ?></div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Дата сдачи</div>
                        <div class="data-value"><?= formatDate($contract['delivery_date']) ?></div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Крайний срок по договору</div>
                        <div class="data-value"><?= formatDate($contract['contract_duration']) ?></div>
                    </div>
                </div>
            </div>
            
            <!-- Готовность документации 
            <div class="card-section">
                <h2 class="section-title">Готовность документации</h2>
                <div class="data-grid">
                    <div class="data-item">
                        <div class="data-label">AR готов</div>
                        <div class="data-value"><?= formatStatus($contract['ar_ready']) ?></div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">KR готов</div>
                        <div class="data-value"><?= formatStatus($contract['kr_ready']) ?></div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Смета готова</div>
                        <div class="data-value"><?= formatStatus($contract['estimate_ready']) ?></div>
                    </div>
                </div>
            </div>-->
            
            <!-- Менеджеры -->
            <div class="card-section">
                <h2 class="section-title">Менеджеры и выплаты</h2>
                <div class="two-columns">
                    <!-- Менеджер -->
                    <div>
                        <h3 style="font-size: 14px; color: #495057; margin: 0 0 16px 0;">Менеджер</h3>
                        <div class="data-grid" style="grid-template-columns: 1fr;">
                            <div class="data-item">
                                <div class="data-label">ФИО</div>
                                <div class="data-value"><?= displayValue($contract['manager_name']) ?></div>
                            </div>
                            <div class="data-item">
                                <div class="data-label">Процент</div>
                                <div class="data-value"><?= $contract['manager_percent'] ? $contract['manager_percent'] . '%' : '—' ?></div>
                            </div>
                            <div class="data-item">
                                <div class="data-label">Начислено</div>
                                <div class="data-value"><?= formatMoney($contract['manager_zp']) ?></div>
                            </div>
                            <div class="data-item">
                                <div class="data-label">Выплачено</div>
                                <div class="data-value"><?= formatMoney($contract['manager_paid']) ?></div>
                            </div>
                            <div class="data-item">
                                <div class="data-label">Остаток</div>
                                <div class="data-value"><?= formatMoney($contract['manager_balance']) ?></div>
                            </div>
                        </div>
                    </div>
                    <!-- СОП -->
                    <div>
                        <h3 style="font-size: 14px; color: #495057; margin: 0 0 16px 0;">СОП</h3>
                        <div class="data-grid" style="grid-template-columns: 1fr;">
                            <div class="data-item">
                                <div class="data-label">ФИО</div>
                                <div class="data-value"><?= displayValue($contract['sop_name']) ?></div>
                            </div>
                            <div class="data-item">
                                <div class="data-label">Процент</div>
                                <div class="data-value"><?= $contract['sop_percent'] ? $contract['sop_percent'] . '%' : '—' ?></div>
                            </div>
                            <div class="data-item">
                                <div class="data-label">Начислено</div>
                                <div class="data-value"><?= formatMoney($contract['sop_zp']) ?></div>
                            </div>
                            <div class="data-item">
                                <div class="data-label">Выплачено</div>
                                <div class="data-value"><?= formatMoney($contract['sop_paid']) ?></div>
                            </div>
                            <div class="data-item">
                                <div class="data-label">Остаток</div>
                                <div class="data-value"><?= formatMoney($contract['sop_balance']) ?></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Комментарий
            <?php if ($contract['comment']): ?>
            <div class="card-section">
                <h2 class="section-title">Комментарий</h2>
                <div class="comment-text"><?= nl2br(htmlspecialchars($contract['comment'])) ?></div>
            </div>
            <?php endif; ?>-->
            
            <!-- Этапы работ -->
            <div class="card-section">
                <h2 class="section-title">Этапы работ</h2>
                <div class="stages-placeholder">
                    <div class="stages-placeholder-icon">📋</div>
                    <div>Этапы работ по договору будут отображаться здесь</div>
                    <a href="stages.php?contract_id=<?= $contract['id'] ?>" style="color: var(--color-primary); margin-top: 10px; display: inline-block;">
                        Перейти к этапам →
                    </a>
                </div>
            </div>
            
            <!-- История изменений -->
            <div class="card-section">
                <h2 class="section-title">История изменений</h2>
                <div class="history-list">
                    <div class="history-placeholder">
                        История изменений будет отображаться здесь
                    </div>
                    <!-- Пример записей (статический) -->
                    <!--
                    <div class="history-item">
                        <div class="history-date">05.12.2025 14:30</div>
                        <div class="history-text">
                            <strong>Иванов И.И.</strong> изменил поле "Сумма договора" с "1 000 000" на "1 200 000"
                        </div>
                    </div>
                    -->
                </div>
            </div>
        </div>
    </div>

    <!-- Модальное окно подтверждения удаления -->
    <div id="delete-confirm-modal" class="modal" style="display: none;">
        <div class="modal-content delete-confirm-content">
            <div class="modal-header">
                <h2>Удаление договора</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <p>Вы уверены, что хотите удалить договор <strong><?= htmlspecialchars($contract['contract_name']) ?></strong>?</p>
                <p class="delete-warning">Это действие нельзя отменить.</p>
            </div>
            <div class="modal-actions">
                <button id="confirm-delete-btn" class="danger-btn">Удалить</button>
                <button id="cancel-delete-btn" class="secondary-btn">Отмена</button>
            </div>
        </div>
    </div>
    
    <!--<script>
    /* Копирование в буфер обмена */
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const text = this.dataset.copy;
            try {
                await navigator.clipboard.writeText(text);
                this.classList.add('copied');
                setTimeout(() => this.classList.remove('copied'), 1500);
            } catch (err) {
                console.error('Не удалось скопировать:', err);
            }
        });
    });
    </script>-->

    <script src="frontend/js/config.js"></script>
    <script>
        /* Копирование в буфер обмена */
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const text = this.dataset.copy;
                try {
                    await navigator.clipboard.writeText(text);
                    this.classList.add('copied');
                    setTimeout(() => this.classList.remove('copied'), 1500);
                } catch (err) {
                    console.error('Не удалось скопировать:', err);
                }
            });
        });

        /* Удаление договора */
        const deleteBtn = document.getElementById('delete-contract-btn');
        const modal = document.getElementById('delete-confirm-modal');
        const closeBtn = modal.querySelector('.close');
        const cancelBtn = document.getElementById('cancel-delete-btn');
        const confirmBtn = document.getElementById('confirm-delete-btn');

        function closeModal() {
            modal.style.display = 'none';
        }

        deleteBtn.addEventListener('click', () => modal.style.display = 'block');
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

        confirmBtn.addEventListener('click', async function() {
            const contractId = deleteBtn.dataset.id;
            try {
                const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.CONTRACTS}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: contractId })
                });
                const result = await response.json();
                if (result.success) {
                    window.location.href = '/contracts.php?deleted=1';
                } else {
                    alert('Ошибка удаления: ' + result.error);
                }
            } catch (error) {
                alert('Ошибка: ' + error.message);
            }
        });
    </script>
</body>
</html>