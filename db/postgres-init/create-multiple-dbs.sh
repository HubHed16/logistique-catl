#!/bin/bash
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE USER tour_user WITH PASSWORD 'tour_password';
    CREATE DATABASE tour;
    GRANT ALL PRIVILEGES ON DATABASE tour TO tour_user;
    \c tour
    GRANT ALL ON SCHEMA public TO tour_user;
EOSQL
