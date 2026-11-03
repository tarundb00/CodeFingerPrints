DROP TABLE IF EXISTS milestones;

CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT NOT NULL AUTO_INCREMENT,
    recipient_key VARCHAR(255) NOT NULL,
    type VARCHAR(255),
    title VARCHAR(255),
    message VARCHAR(2000),
    `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(6),
    PRIMARY KEY (id),
    INDEX idx_notification_recipient (recipient_key),
    INDEX idx_notification_created (created_at),
    INDEX idx_notification_read (`is_read`)
);