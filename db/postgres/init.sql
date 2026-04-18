-- Utilisateur dédié à Debezium avec droit de réplication
CREATE USER debezium WITH REPLICATION LOGIN PASSWORD 'debezium_secret';

-- Accès à la base
GRANT CONNECT ON DATABASE wms TO debezium;
GRANT USAGE ON SCHEMA public TO debezium;

-- Lecture sur les tables existantes
GRANT SELECT ON ALL TABLES IN SCHEMA public TO debezium;

-- Lecture automatique sur les tables créées ultérieurement
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO debezium;

-- Publication pour la capture des changements (INSERT / UPDATE / DELETE)
CREATE PUBLICATION dbz_wms_publication FOR ALL TABLES;
