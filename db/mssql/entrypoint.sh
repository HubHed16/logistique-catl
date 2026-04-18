#!/bin/bash
set -e

# Démarre SQL Server en arrière-plan
/opt/mssql/bin/sqlservr &
PID=$!

# Attend que SQL Server soit prêt (max ~60s)
echo "==> En attente de SQL Server..."
for i in $(seq 1 30); do
    if /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" \
        -Q "SELECT 1" -b -No > /dev/null 2>&1; then
        echo " prêt."
        break
    fi
    printf '.'
    sleep 2
done

# Exécute le script d'initialisation
echo "==> Exécution de init.sql..."
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" \
    -i /init.sql -b -No

echo "==> Initialisation terminée."

# Reste au premier plan pour Docker
wait $PID
