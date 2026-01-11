#!/bin/bash

# Execute logo URL updates to the database
# Reads SQL from update-logo-urls.sql and executes via wrangler

DB_NAME="ngo_going_out"
SQL_FILE="./tools/update-logo-urls.sql"
LOG_FILE="./db-update-log.txt"

echo "========================================"
echo "Execute Logo URL Database Updates"
echo "========================================"
echo "Database: $DB_NAME"
echo "SQL File: $SQL_FILE"
echo ""

if [ ! -f "$SQL_FILE" ]; then
  echo "Error: SQL file not found: $SQL_FILE"
  exit 1
fi

# Count total updates
total_updates=$(grep -c "^UPDATE" "$SQL_FILE")
echo "Total updates to execute: $total_updates"
echo ""

# Read SQL file and execute
echo "Executing updates..."
echo ""

npx wrangler d1 execute "$DB_NAME" --remote --file="$SQL_FILE" | tee "$LOG_FILE"

echo ""
echo "========================================"
echo "Update Complete"
echo "========================================"
echo "Log saved to: $LOG_FILE"
