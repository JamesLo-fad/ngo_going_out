#!/usr/bin/env node

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const DB_NAME = 'ngo_going_out';
const OUTPUT_SQL_FILE = './tools/update-date-formats.sql';

/**
 * Normalize date format according to rules:
 * - YYYY.0 → YYYY 年
 * - YYYY → YYYY 年
 * - YYYY-MM-DD → YYYY 年 MM 月 DD 日
 * - YYYY/MM/DD → YYYY 年 MM 月 DD 日
 * - YYYY年MM月DD日 → YYYY 年 MM 月 DD 日
 * - Keep special cases with parentheses and descriptions
 */
function normalizeDate(dateStr) {
  if (!dateStr || dateStr === 'null' || dateStr === '-') {
    return dateStr;
  }

  const trimmed = dateStr.trim();

  // YYYY.0 format
  if (/^\d{4}\.0$/.test(trimmed)) {
    return trimmed.replace('.0', ' 年');
  }

  // Pure YYYY format (4 digits only)
  if (/^\d{4}$/.test(trimmed)) {
    return trimmed + ' 年';
  }

  // YYYY-MM-DD format
  const dashMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (dashMatch) {
    const [, year, month, day] = dashMatch;
    return `${year} 年 ${parseInt(month)} 月 ${parseInt(day)} 日`;
  }

  // YYYY/MM/DD format
  const slashMatch = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (slashMatch) {
    const [, year, month, day] = slashMatch;
    return `${year} 年 ${parseInt(month)} 月 ${parseInt(day)} 日`;
  }

  // YYYY年MM月DD日 format (no spaces) - add spaces
  const noSpaceMatch = trimmed.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
  if (noSpaceMatch) {
    const [, year, month, day] = noSpaceMatch;
    return `${year} 年 ${parseInt(month)} 月 ${parseInt(day)} 日`;
  }

  // YYYY 年 MM 月DD日 format (partial spaces) - normalize all spaces
  const partialSpaceMatch = trimmed.match(/^(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})日$/);
  if (partialSpaceMatch) {
    const [, year, month, day] = partialSpaceMatch;
    return `${year} 年 ${parseInt(month)} 月 ${parseInt(day)} 日`;
  }

  // Already has proper format or special description - keep as is
  return dateStr;
}

console.log('========================================');
console.log('Date Format Normalization Script');
console.log('========================================\n');

// Fetch all organizations
console.log('Fetching all organizations from database...');
const result = execSync(
  `npx wrangler d1 execute ${DB_NAME} --remote --command="SELECT id, org_name, founded_date, go_global_date FROM orgs ORDER BY id;" --json`,
  { encoding: 'utf-8' }
);

const data = JSON.parse(result);
const orgs = data[0].results;

console.log(`Total organizations: ${orgs.length}\n`);

// Process and generate SQL updates
const updates = [];
let foundedCount = 0;
let globalCount = 0;

orgs.forEach(org => {
  const { id, founded_date, go_global_date } = org;

  // Normalize founded_date
  if (founded_date) {
    const normalized = normalizeDate(founded_date);
    if (normalized !== founded_date) {
      updates.push({
        id,
        field: 'founded_date',
        oldValue: founded_date,
        newValue: normalized
      });
      foundedCount++;
    }
  }

  // Normalize go_global_date
  if (go_global_date) {
    const normalized = normalizeDate(go_global_date);
    if (normalized !== go_global_date) {
      updates.push({
        id,
        field: 'go_global_date',
        oldValue: go_global_date,
        newValue: normalized
      });
      globalCount++;
    }
  }
});

console.log(`Records to update:`);
console.log(`  - founded_date: ${foundedCount}`);
console.log(`  - go_global_date: ${globalCount}`);
console.log(`  - Total updates: ${updates.length}\n`);

// Generate SQL file
let sql = '-- Auto-generated date format normalization SQL\n';
sql += `-- Generated at: ${new Date().toISOString()}\n`;
sql += `-- Total updates: ${updates.length}\n\n`;

updates.forEach(({ id, field, oldValue, newValue }) => {
  const escapedNew = newValue.replace(/'/g, "''");
  sql += `-- ID ${id}: ${field}\n`;
  sql += `-- Old: ${oldValue}\n`;
  sql += `-- New: ${newValue}\n`;
  sql += `UPDATE orgs SET ${field} = '${escapedNew}' WHERE id = ${id};\n\n`;
});

writeFileSync(OUTPUT_SQL_FILE, sql);
console.log(`✓ SQL file generated: ${OUTPUT_SQL_FILE}`);
console.log('\nNext steps:');
console.log('1. Review the SQL file');
console.log('2. Execute: bash tools/execute-date-format-updates.sh');
