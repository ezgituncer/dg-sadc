#!/bin/bash
set -e

# Create the test database alongside the dev database (the dev DB is created
# by the official entrypoint via POSTGRES_DB).
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE workload_test;
    GRANT ALL PRIVILEGES ON DATABASE workload_test TO $POSTGRES_USER;
EOSQL
