#!/bin/bash

DB_NAME="ngo_going_out"
SQL_FILE="./tools/update-date-formats.sql"

echo "========================================"
echo "Execute Date Format Normalization"
echo "========================================"
echo "Database: $DB_NAME"
echo "SQL File: $SQL_FILE"
echo ""

if [ ! -f "$SQL_FILE" ]; then
  echo "Error: SQL file not found: $SQL_FILE"
  echo "Please run: node tools/normalize-date-formats.js first"
  exit 1
fi

total_updates=$(grep -c "^UPDATE" "$SQL_FILE")
echo "Total updates to execute: $total_updates"
echo ""

read -p "Do you want to proceed? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo "Executing updates..."
npx wrangler d1 execute "$DB_NAME" --remote --file="$SQL_FILE"

echo ""
echo "========================================"
echo "Update Complete"
echo "========================================"
