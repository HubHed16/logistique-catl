-- Création de la base wms si elle n'existe pas encore
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'wms')
BEGIN
    CREATE DATABASE wms;
END
GO

USE wms;
GO

-- Ajouter ici les tables SQL Server si elles doivent être pré-créées.
--
-- Exemple :
-- IF NOT EXISTS (SELECT * FROM sysobjects WHERE name = 'orders' AND xtype = 'U')
-- CREATE TABLE orders
-- (
--     id          BIGINT          PRIMARY KEY,
--     status      NVARCHAR(255)   NOT NULL DEFAULT '',
--     created_at  DATETIME2(3),
--     __deleted   NVARCHAR(10)    DEFAULT 'false',
--     _version    BIGINT
-- );
