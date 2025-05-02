CREATE DATABASE IF NOT EXISTS collaborative_code_editor;

USE collaborative_code_editor;

CREATE TABLE IF NOT EXISTS files (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    path VARCHAR(255) NOT NULL,
    owner VARCHAR(255) NOT NULL
);
