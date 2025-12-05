-- =====================================================
-- МИГРАЦИЯ: Интеграция с Adesk (упрощённая версия)
-- =====================================================

-- 1. Таблица настроек интеграции с Adesk
CREATE TABLE IF NOT EXISTS adesk_settings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    api_token VARCHAR(255) NOT NULL COMMENT 'API токен из профиля Adesk',
    is_enabled TINYINT(1) DEFAULT 1 COMMENT 'Включена ли интеграция',
    last_sync_at DATETIME NULL COMMENT 'Когда последний раз синхронизировали',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Настройки интеграции с Adesk';


-- 2. Таблица операций из Adesk
CREATE TABLE IF NOT EXISTS adesk_transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    adesk_id BIGINT NOT NULL UNIQUE COMMENT 'ID операции в Adesk',
    
    amount DECIMAL(15,2) NOT NULL COMMENT 'Сумма операции',
    transaction_type TINYINT NOT NULL COMMENT '1 - поступление, 2 - расход',
    
    category_name VARCHAR(255) NULL COMMENT 'Статья',
    category_group_name VARCHAR(255) NULL COMMENT 'Группа статей',
    description TEXT NULL COMMENT 'Назначение платежа',
    
    project_id BIGINT NULL COMMENT 'ID проекта в Adesk',
    project_name VARCHAR(255) NULL COMMENT 'Проект',
    
    business_unit_name VARCHAR(255) NULL COMMENT 'Направление',
    contractor_name VARCHAR(255) NULL COMMENT 'Контрагент',
    bank_account_name VARCHAR(255) NULL COMMENT 'Счёт',
    
    transaction_date DATE NOT NULL COMMENT 'Дата операции',
    
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Когда загружено',
    
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_project_id (project_id),
    INDEX idx_category_group_name (category_group_name)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Операции из Adesk';


-- 3. Добавляем поле связи с Adesk в таблицу contracts
ALTER TABLE contracts 
ADD COLUMN adesk_project_id BIGINT NULL COMMENT 'ID проекта в Adesk' 
AFTER comment;

-- Индекс для быстрого поиска
ALTER TABLE contracts 
ADD INDEX idx_adesk_project_id (adesk_project_id);