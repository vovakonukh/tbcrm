<?php require_once __DIR__ . '/../api/check_auth.php'; ?>

<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Дашборд</title>
    <link rel="icon" href="/assets/favicon.ico">
    <link href="/frontend/css/style.css?v=1.2" rel="stylesheet">
    <link href="/frontend/css/fonts.css" rel="stylesheet">
    <style>
        .dashboard-container {
            padding: 20px;
            max-width: 1400px;
            margin: 0 auto;
        }

        .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            flex-wrap: wrap;
            gap: 16px;
        }

        .dashboard-title {
            font-size: 24px;
            font-weight: 700;
            color: var(--color-text);
            margin: 0;
        }

        .period-selector {
            display: flex;
            gap: 12px;
            align-items: center;
            flex-wrap: wrap;
        }

        .period-inputs {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .period-inputs input[type="date"] {
            padding: 8px 12px;
            border: 1px solid var(--color-border-dark);
            border-radius: var(--radius-md);
            font-family: var(--font-family);
            font-size: 14px;
            color: var(--color-text-secondary);
        }

        .period-inputs input[type="date"]:focus {
            outline: none;
            border-color: var(--color-primary);
        }

        .quick-period-btns {
            display: flex;
            gap: 6px;
        }

        .quick-period-btn {
            padding: 6px 12px;
            background: var(--color-bg-white);
            border: 1px solid var(--color-border-dark);
            border-radius: var(--radius-sm);
            font-size: 13px;
            color: var(--color-text-secondary);
            cursor: pointer;
            transition: all var(--transition-normal);
        }

        .quick-period-btn:hover {
            background: var(--color-bg-light);
        }

        .quick-period-btn.active {
            background: var(--color-primary);
            color: white;
            border-color: var(--color-primary);
        }

        .dashboard-section {
            padding: 0 0 24px 0;
            margin-bottom: 8px;
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--color-border);
        }

        .section-title {
            font-size: 18px;
            font-weight: 700;
            color: var(--color-text);
            margin: 0;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .section-icon {
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--color-bg-light);
            border-radius: var(--radius-sm);
            font-size: 16px;
        }

        .section-badge {
            font-size: 13px;
            color: var(--color-text-muted);
        }

        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
        }

        .metric-card {
            background: var(--color-bg-light);
            border-radius: var(--radius-md);
            padding: 12px 16px;
            transition: all var(--transition-normal);
        }

        .metric-card:hover {
            background: var(--color-bg-hover);
        }

        .metric-label {
            font-size: 13px;
            color: var(--color-text-muted);
            margin-bottom: 8px;
            font-weight: 500;
        }

        .metric-value {
            font-size: 28px;
            font-weight: 700;
            color: var(--color-text);
            line-height: 1.2;
        }

        .metric-value.money {
            color: var(--color-success);
        }

        .metric-value.highlight {
            color: var(--color-primary);
        }

        .metric-suffix {
            font-size: 14px;
            font-weight: 500;
            color: var(--color-text-muted);
            margin-left: 4px;
        }

        .metric-card.green-accent {
            border-left: 3px solid var(--color-success);
        }

        .metric-card.blue-accent {
            border-left: 3px solid var(--color-primary);
        }

        .metric-card.orange-accent {
            border-left: 3px solid #fd7e14;
        }

        .metric-card.purple-accent {
            border-left: 3px solid #845ef7;
        }

        @media (max-width: 768px) {
            .dashboard-container {
                padding: 10px;
            }

            .dashboard-header {
                flex-direction: column;
                align-items: flex-start;
            }

            .period-selector {
                width: 100%;
                flex-direction: column;
                align-items: flex-start;
            }

            .period-inputs {
                width: 100%;
            }

            .period-inputs input[type="date"] {
                flex: 1;
            }

            .quick-period-btns {
                width: 100%;
                overflow-x: auto;
                padding-bottom: 4px;
            }

            .metrics-grid {
                grid-template-columns: 1fr 1fr;
            }

            .metric-value {
                font-size: 22px;
            }
        }

        @media (max-width: 480px) {
            .metrics-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <?php include __DIR__ . '/../includes/header.php'; ?>

    <div class="dashboard-container">
        <div class="dashboard-header">
            <h1 class="dashboard-title">Дашборд</h1>
            
            <div class="period-selector">
                <div class="period-inputs">
                    <input type="date" id="date-from" value="2025-01-01">
                    <span style="color: var(--color-text-muted);">—</span>
                    <input type="date" id="date-to" value="2025-12-31">
                </div>
                <div class="quick-period-btns">
                    <button class="quick-period-btn" data-period="this-month">Этот месяц</button>
                    <button class="quick-period-btn" data-period="this-quarter">Этот квартал</button>
                    <button class="quick-period-btn active" data-period="this-year">Этот год</button>
                    <button class="quick-period-btn" data-period="last-year">Прошлый год</button>
                </div>
            </div>
        </div>

        <!-- Стройка -->
        <div class="dashboard-section">
            <div class="section-header">
                <h2 class="section-title">
                    <span class="section-icon">🏗️</span>
                    Стройка
                </h2>
            </div>

            <div class="metrics-grid">
                <div class="metric-card green-accent">
                    <div class="metric-label">Домов в работе</div>
                    <div class="metric-value">12</div>
                </div>
                <div class="metric-card green-accent">
                    <div class="metric-label">Сумма в работе</div>
                    <div class="metric-value money">48.5<span class="metric-suffix">млн ₽</span></div>
                </div>
                <div class="metric-card blue-accent">
                    <div class="metric-label">Домов по ипотеке</div>
                    <div class="metric-value">7</div>
                </div>
                <div class="metric-card blue-accent">
                    <div class="metric-label">Сумма ипотека</div>
                    <div class="metric-value money">32.1<span class="metric-suffix">млн ₽</span></div>
                </div>
                <div class="metric-card orange-accent">
                    <div class="metric-label">Домов за наличные</div>
                    <div class="metric-value">5</div>
                </div>
                <div class="metric-card orange-accent">
                    <div class="metric-label">Сумма наличные</div>
                    <div class="metric-value money">16.4<span class="metric-suffix">млн ₽</span></div>
                </div>
            </div>
        </div>

        <!-- Маркетинг -->
        <div class="dashboard-section">
            <div class="section-header">
                <h2 class="section-title">
                    <span class="section-icon">📊</span>
                    Маркетинг
                </h2>
                <span class="section-badge">за выбранный период</span>
            </div>

            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-label">Бюджет потрачен</div>
                    <div class="metric-value">1.95<span class="metric-suffix">млн ₽</span></div>
                </div>
                <div class="metric-card purple-accent">
                    <div class="metric-label">Квал. лидов</div>
                    <div class="metric-value highlight">42</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Цена лида</div>
                    <div class="metric-value">12 500<span class="metric-suffix">₽</span></div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Цена договора</div>
                    <div class="metric-value">185 000<span class="metric-suffix">₽</span></div>
                </div>
            </div>
        </div>

        <!-- Продажи -->
        <div class="dashboard-section">
            <div class="section-header">
                <h2 class="section-title">
                    <span class="section-icon">💰</span>
                    Продажи
                </h2>
                <span class="section-badge">за выбранный период</span>
            </div>

            <div class="metrics-grid">
                <div class="metric-card green-accent">
                    <div class="metric-label">Договоров продано</div>
                    <div class="metric-value">8</div>
                </div>
                <div class="metric-card green-accent">
                    <div class="metric-label">Сумма продаж</div>
                    <div class="metric-value money">35.2<span class="metric-suffix">млн ₽</span></div>
                </div>
                <div class="metric-card blue-accent">
                    <div class="metric-label">Из них ипотека</div>
                    <div class="metric-value">5</div>
                </div>
                <div class="metric-card blue-accent">
                    <div class="metric-label">Сумма ипотека</div>
                    <div class="metric-value money">22.8<span class="metric-suffix">млн ₽</span></div>
                </div>
                <div class="metric-card orange-accent">
                    <div class="metric-label">Из них за нал</div>
                    <div class="metric-value">3</div>
                </div>
                <div class="metric-card orange-accent">
                    <div class="metric-label">Сумма за нал</div>
                    <div class="metric-value money">12.4<span class="metric-suffix">млн ₽</span></div>
                </div>
            </div>
        </div>
    </div>

    <script>
        document.querySelectorAll('.quick-period-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.quick-period-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                const period = this.dataset.period;
                const now = new Date();
                let from, to;

                switch(period) {
                    case 'this-month':
                        from = new Date(now.getFullYear(), now.getMonth(), 1);
                        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                        break;
                    case 'this-quarter':
                        const quarter = Math.floor(now.getMonth() / 3);
                        from = new Date(now.getFullYear(), quarter * 3, 1);
                        to = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
                        break;
                    case 'this-year':
                        from = new Date(now.getFullYear(), 0, 1);
                        to = new Date(now.getFullYear(), 11, 31);
                        break;
                    case 'last-year':
                        from = new Date(now.getFullYear() - 1, 0, 1);
                        to = new Date(now.getFullYear() - 1, 11, 31);
                        break;
                }

                document.getElementById('date-from').value = formatDate(from);
                document.getElementById('date-to').value = formatDate(to);

                // TODO: вызов API для обновления данных
                console.log('Period changed:', period, from, to);
            });
        });

        function formatDate(date) {
            return date.toISOString().split('T')[0];
        }
    </script>
</body>
</html>