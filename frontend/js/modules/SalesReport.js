/* Названия месяцев */
const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const monthLabels = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

/* Фиксированный набор цветов для графика (15 цветов) */
const chartColors = [
    '#69db7c', '#ffd43b', '#ff8787', '#74c0fc', '#b197fc',
    '#63e6be', '#ffa94d', '#f783ac', '#4dabf7', '#da77f2',
    '#38d9a9', '#fab005', '#e64980', '#228be6', '#be4bdb'
];

/* Данные */
let reportData = null;
let barChart = null;
let availableYears = [];
let hiddenFields = []; /* Скрытые поля из прав доступа */



/* Текущие значения фильтров */
const STORAGE_KEY = 'salesReportFilters';

const filters = {
    month_start: new Date().getMonth() + 1,
    month_end: new Date().getMonth() + 1,
    year: new Date().getFullYear()
};

/* Загрузка фильтров из localStorage */
function loadFiltersFromStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.year !== undefined) filters.year = parsed.year;
            if (parsed.month_start !== undefined) filters.month_start = parsed.month_start;
            if (parsed.month_end !== undefined) filters.month_end = parsed.month_end;
        }
    } catch (e) {
        console.warn('Ошибка загрузки фильтров:', e);
    }
}

/* Сохранение фильтров в localStorage */
function saveFiltersToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch (e) {
        console.warn('Ошибка сохранения фильтров:', e);
    }
}

/* Форматирование чисел */
function formatMoney(value) {
    return new Intl.NumberFormat('ru-RU').format(Math.round(value)) + ' ₽';
}

function formatNumber(value) {
    return new Intl.NumberFormat('ru-RU').format(value);
}

function formatPercent(value) {
    return (value || 0).toFixed(1) + '%';
}

/* Показать/скрыть загрузку */
function showLoading(show) {
    document.getElementById('loading-overlay').classList.toggle('hidden', !show);
}

/* Обновление текста на кнопках фильтров */
function updateFilterButtons() {
    const btnStart = document.getElementById('filter-start');
    const btnEnd = document.getElementById('filter-end');
    const btnYear = document.getElementById('filter-year');
    
    /* Месяц начала */
    if (filters.month_start !== null) {
        btnStart.querySelector('.filter-value').textContent = monthNames[filters.month_start - 1];
        btnStart.classList.add('has-filter');
    } else {
        btnStart.querySelector('.filter-value').textContent = '';
        btnStart.classList.remove('has-filter');
    }
    
    /* Месяц конца */
    if (filters.month_end !== null) {
        btnEnd.querySelector('.filter-value').textContent = monthNames[filters.month_end - 1];
        btnEnd.classList.add('has-filter');
    } else {
        btnEnd.querySelector('.filter-value').textContent = '';
        btnEnd.classList.remove('has-filter');
    }
    
    /* Год */
    if (filters.year !== null) {
        btnYear.querySelector('.filter-value').textContent = filters.year;
        btnYear.classList.add('has-filter');
    } else {
        btnYear.querySelector('.filter-value').textContent = '';
        btnYear.classList.remove('has-filter');
    }
}

/* Показать выпадающий список */
function showFilterDropdown(field, buttonElement) {
    const modal = document.getElementById('select-filter-modal');
    const content = modal.querySelector('.modal-content');
    const listContainer = modal.querySelector('.select-filter-list');
    
    let options = [];
    let currentValue = filters[field];
    
    if (field === 'month_start' || field === 'month_end') {
        options = monthNames.map((name, index) => ({
            value: index + 1,
            label: name
        }));
    } else if (field === 'year') {
        options = availableYears.map(year => ({
            value: year,
            label: String(year)
        }));
    }
    
    /* Генерируем HTML списка с пунктом "Любой" */
    let html = '<div class="select-filter-items">';
    html += `<div class="select-filter-item clear-option" data-value="">Любой</div>`;
    options.forEach(opt => {
        const selectedClass = opt.value == currentValue ? 'selected' : '';
        html += `<div class="select-filter-item ${selectedClass}" data-value="${opt.value}">${opt.label}</div>`;
    });
    html += '</div>';
    
    listContainer.innerHTML = html;
    
    /* Обработчики кликов */
    listContainer.querySelectorAll('.select-filter-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const value = item.getAttribute('data-value');
            
            if (value === '') {
                /* Сброс фильтра */
                clearFilter(field);
            } else {
                filters[field] = parseInt(value);
                
                /* Корректируем диапазон месяцев */
                if (field === 'month_start' && filters.month_end !== null && filters.month_end < filters[field]) {
                    filters.month_end = filters[field];
                }
                if (field === 'month_end' && filters.month_start !== null && filters.month_start > filters[field]) {
                    filters.month_start = filters[field];
                }
                
                updateFilterButtons();
                loadData();
            }
            
            modal.style.display = 'none';
        });
    });
    
    /* Позиционирование */
    const rect = buttonElement.getBoundingClientRect();
    content.style.top = (rect.bottom + 5) + 'px';
    content.style.left = rect.left + 'px';
    
    modal.style.display = 'block';
}

/* Сброс фильтра */
function clearFilter(field) {
    filters[field] = null;
    updateFilterButtons();
    loadData();
}

/* Инициализация фильтров */
function initFilters(years) {
    availableYears = years;
    
    /* Загружаем сохранённые фильтры */
    loadFiltersFromStorage();
    
    /* Проверяем что год валиден */
    if (!years.includes(filters.year)) {
        const currentYear = new Date().getFullYear();
        filters.year = years.includes(currentYear) ? currentYear : years[0];
    }
    
    updateFilterButtons();
    
    /* Обработчики кликов по кнопкам фильтров */
    document.querySelectorAll('.filter-btn-select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const field = btn.getAttribute('data-field');
            
            /* Клик по крестику — сброс фильтра */
            if (btn.classList.contains('has-filter')) {
                const rect = btn.getBoundingClientRect();
                if (e.clientX - rect.left > rect.width - 30) {
                    clearFilter(field);
                    return;
                }
            }
            
            showFilterDropdown(field, btn);
        });
    });
    
    /* Закрытие модалки при клике вне её */
    document.addEventListener('click', (e) => {
        const modal = document.getElementById('select-filter-modal');
        if (modal && modal.style.display === 'block') {
            const content = modal.querySelector('.modal-content');
            if (content && !content.contains(e.target) && !e.target.classList.contains('filter-btn-select')) {
                modal.style.display = 'none';
            }
        }
    });
}

/* Загрузка данных с API */
async function loadData() {
    saveFiltersToStorage();
    showLoading(true);

    /* Формируем параметры запроса, пропуская null */
    const params = new URLSearchParams();
    if (filters.year !== null) params.append('year', filters.year);
    if (filters.month_start !== null) params.append('month_start', filters.month_start);
    if (filters.month_end !== null) params.append('month_end', filters.month_end);

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/sales_report_api.php?${params.toString()}`);
        const result = await response.json();

        if (result.success) {
            reportData = result;
            renderReport();
        } else {
            console.error('API error:', result.error);
            alert('Ошибка загрузки данных: ' + result.error);
        }
    } catch (error) {
        console.error('Fetch error:', error);
        alert('Ошибка соединения с сервером');
    } finally {
        showLoading(false);
    }
}

/* Рендер всего отчёта */
function renderReport() {
    if (!reportData) return;

    renderSummarySection(reportData.summary);
    renderBarChart(reportData.chart_data, reportData.filter.year);
    renderManagerCards(reportData.managers);
}

/* Рендер блока Всего */
function renderSummarySection(data) {
    const container = document.getElementById('summary-section');
    
    let periodText = filters.month_start === filters.month_end 
        ? monthNames[filters.month_start - 1] 
        : `${monthNames[filters.month_start - 1]} — ${monthNames[filters.month_end - 1]}`;
    
    container.innerHTML = `
        <div class="summary-header">
            <div>
                <h2 class="summary-title">Всего</h2>
                <div class="summary-subtitle">Суммарные показатели: ${periodText}</div>
            </div>
        </div>
        
        <div class="summary-main-kpi">
            <div class="summary-kpi-item">
                <div class="summary-kpi-value">${data.contracts_new}</div>
                <div class="summary-kpi-label">Договоров</div>
            </div>
            <div class="summary-kpi-item">
                <div class="summary-kpi-value">${formatMoney(data.revenue)}</div>
                <div class="summary-kpi-label">Сумма продаж</div>
            </div>
            ${isFieldHidden('profit') ? '' : `
            <div class="summary-kpi-item">
                <div class="summary-kpi-value">${formatMoney(data.profit)}</div>
                <div class="summary-kpi-label">Прибыль</div>
            </div>
            `}
            <div class="summary-kpi-item">
                <div class="summary-kpi-value">${formatMoney(data.avg_check)}</div>
                <div class="summary-kpi-label">Средний чек</div>
            </div>
            ${isFieldHidden('margin') ? '' : `
            <div class="summary-kpi-item">
                <div class="summary-kpi-value">${formatPercent(data.margin)}</div>
                <div class="summary-kpi-label">Маржинальность</div>
            </div>
            `}
        </div>
        
        <div class="summary-metrics">
            <div class="summary-metrics-group">
                <div class="summary-group-title">Лиды за период</div>
                <div class="summary-metric-row">
                    <span class="summary-metric-label">Целевых лидов</span>
                    <span class="summary-metric-value">${formatNumber(data.target_leads_new)}</span>
                </div>
                <div class="summary-metric-row">
                    <span class="summary-metric-label">Квал. лидов</span>
                    <span class="summary-metric-value">${formatNumber(data.qual_leads_new)}</span>
                </div>
                <div class="summary-metric-row">
                    <span class="summary-metric-label">Встреч проведено</span>
                    <span class="summary-metric-value">${formatNumber(data.meetings_new)}</span>
                </div>
            </div>
            
            <div class="summary-metrics-group">
                <div class="summary-group-title">В работе сейчас</div>
                <div class="summary-metric-row">
                    <span class="summary-metric-label">Цел. лидов в работе</span>
                    <span class="summary-metric-value">${formatNumber(data.leads_in_work)}</span>
                </div>
                <div class="summary-metric-row">
                    <span class="summary-metric-label">Квал. лидов в работе</span>
                    <span class="summary-metric-value">${formatNumber(data.qual_leads_in_work)}</span>
                </div>
            </div>
            
            <div class="summary-metrics-group">
                <div class="summary-group-title">Конверсии</div>
                <div class="summary-metric-row">
                    <span class="summary-metric-label">Целевой → Договор</span>
                    <span class="summary-metric-value">${formatPercent(data.conv_target_to_contract)}</span>
                </div>
                <div class="summary-metric-row">
                    <span class="summary-metric-label">Квал → Договор</span>
                    <span class="summary-metric-value">${formatPercent(data.conv_qual_to_contract)}</span>
                </div>
                <div class="summary-metric-row">
                    <span class="summary-metric-label">Целевой → Квал</span>
                    <span class="summary-metric-value">${formatPercent(data.conv_target_to_qual)}</span>
                </div>
                <div class="summary-metric-row">
                    <span class="summary-metric-label">Квал → Встреча</span>
                    <span class="summary-metric-value">${formatPercent(data.conv_qual_to_meeting)}</span>
                </div>
                <div class="summary-metric-row">
                    <span class="summary-metric-label">Встреча → Договор</span>
                    <span class="summary-metric-value">${formatPercent(data.conv_meeting_to_contract)}</span>
                </div>
            </div>
        </div>
    `;
}

/* Создание/обновление bar chart */
function renderBarChart(chartData, year) {
    const ctx = document.getElementById('sales-bar-chart').getContext('2d');
    
    document.getElementById('chart-year').textContent = year;
    
    if (barChart) {
        barChart.destroy();
    }

    /* Формируем datasets */
    const datasets = chartData.map((manager, index) => ({
        label: manager.name,
        data: manager.data,
        backgroundColor: chartColors[index % chartColors.length],
        borderRadius: 0,
        borderSkipped: false
    }));
    
    barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthLabels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'rectRounded',
                        padding: 20,
                        font: { family: "'Circe', sans-serif", size: 13 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding: 12,
                    titleFont: { family: "'Circe', sans-serif", size: 14 },
                    bodyFont: { family: "'Circe', sans-serif", size: 13 },
                    callbacks: {
                        label: function(context) {
                            if (context.raw === null) return context.dataset.label + ': нет данных';
                            return context.dataset.label + ': ' + formatMoney(context.raw);
                        },
                        footer: function(tooltipItems) {
                            let sum = 0;
                            tooltipItems.forEach(item => {
                                if (item.raw) sum += item.raw;
                            });
                            return 'Всего: ' + formatMoney(sum);
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false },
                    ticks: { font: { family: "'Circe', sans-serif", size: 12 } }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    grid: { color: '#f1f3f5' },
                    ticks: {
                        font: { family: "'Circe', sans-serif", size: 12 },
                        callback: function(value) {
                            if (value >= 1000000) {
                                return (value / 1000000).toFixed(0) + ' млн';
                            } else if (value >= 1000) {
                                return (value / 1000).toFixed(0) + ' тыс';
                            }
                            return value;
                        }
                    }
                }
            }
        }
    });
}

/* Генерация HTML карточки менеджера */
function createCard(data) {
    /* Секция "Финансы" — скрываем поля по правам */
    let financeSection = '';
    
    const profitRow = isFieldHidden('profit') ? '' : `
        <div class="metric-row">
            <span class="metric-label">Прибыль</span>
            <span class="metric-value">${formatMoney(data.profit)}</span>
        </div>
    `;
    
    const avgCheckRow = `
        <div class="metric-row">
            <span class="metric-label">Средний чек</span>
            <span class="metric-value">${formatMoney(data.avg_check)}</span>
        </div>
    `;
    
    const marginRow = isFieldHidden('margin') ? '' : `
        <div class="metric-row">
            <span class="metric-label">Маржинальность</span>
            <span class="metric-value positive">${formatPercent(data.margin)}</span>
        </div>
    `;
    
    /* Показываем секцию "Финансы" только если есть хоть одно видимое поле */
    const hasVisibleFinanceFields = !isFieldHidden('profit') || !isFieldHidden('margin');
    if (hasVisibleFinanceFields) {
        financeSection = `
            <div class="metrics-section">
                <div class="section-title">Финансы</div>
                ${profitRow}
                ${avgCheckRow}
                ${marginRow}
            </div>
        `;
    }

    return `
        <div class="manager-card">
            <div class="card-header">
                <h3 class="manager-name">${data.name}</h3>
            </div>
            <div class="card-body">
                <div class="main-kpi">
                    <div class="kpi-item">
                        <div class="kpi-value">${data.contracts_new}</div>
                        <div class="kpi-label">Договоров</div>
                    </div>
                    <div class="kpi-item">
                        <div class="kpi-value">${formatMoney(data.revenue)}</div>
                        <div class="kpi-label">Сумма продаж</div>
                    </div>
                </div>

                <div class="metrics-section">
                    <div class="section-title">Лиды за период</div>
                    <div class="metric-row">
                        <span class="metric-label">Целевых лидов</span>
                        <span class="metric-value">${formatNumber(data.target_leads_new)}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Квал. лидов</span>
                        <span class="metric-value">${formatNumber(data.qual_leads_new)}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Встреч проведено</span>
                        <span class="metric-value">${formatNumber(data.meetings_new)}</span>
                    </div>
                </div>

                <div class="metrics-section">
                    <div class="section-title">В работе сейчас</div>
                    <div class="metric-row">
                        <span class="metric-label">Цел. лидов в работе</span>
                        <span class="metric-value">${formatNumber(data.leads_in_work)}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Квал. лидов в работе</span>
                        <span class="metric-value">${formatNumber(data.qual_leads_in_work)}</span>
                    </div>
                </div>

                <div class="metrics-section">
                    <div class="section-title">Конверсии</div>
                    <div class="metric-row">
                        <span class="metric-label">Целевой → Договор</span>
                        <span class="metric-value">${formatPercent(data.conv_target_to_contract)}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Квал → Договор</span>
                        <span class="metric-value">${formatPercent(data.conv_qual_to_contract)}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Целевой → Квал</span>
                        <span class="metric-value">${formatPercent(data.conv_target_to_qual)}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Квал → Встреча</span>
                        <span class="metric-value">${formatPercent(data.conv_qual_to_meeting)}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Встреча → Договор</span>
                        <span class="metric-value">${formatPercent(data.conv_meeting_to_contract)}</span>
                    </div>
                </div>

                ${financeSection}
            </div>
        </div>
    `;
}

/* Рендер карточек менеджеров */
function renderManagerCards(managers) {
    const container = document.getElementById('cards-container');
    container.innerHTML = managers.map(createCard).join('');
}

/* Первичная загрузка */
async function init() {
    showLoading(true);
    
    try {
        /* Загружаем права пользователя */
        await loadUserPermissions();
        
        /* Первый запрос для получения списка годов */
        const response = await fetch(`${CONFIG.API_BASE_URL}/sales_report_api.php`);
        const result = await response.json();

        if (result.success) {
            initFilters(result.years);
            reportData = result;
            renderReport();
        } else {
            console.error('API error:', result.error);
            alert('Ошибка загрузки данных: ' + result.error);
        }
    } catch (error) {
        console.error('Fetch error:', error);
        alert('Ошибка соединения с сервером');
    } finally {
        showLoading(false);
    }
}

/* Загрузка прав пользователя */
async function loadUserPermissions() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/user_info.php`);
        const result = await response.json();
        
        if (result.success && result.permissions && result.permissions.sales_report) {
            hiddenFields = result.permissions.sales_report.hidden_fields || [];
        }
    } catch (error) {
        console.error('Ошибка загрузки прав:', error);
    }
}

/* Проверка, скрыто ли поле */
function isFieldHidden(field) {
    return hiddenFields.includes(field);
}

/* Запуск */
document.addEventListener('DOMContentLoaded', init);