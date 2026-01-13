#!/usr/bin/env node
/* Restore logo_url values from backup file */

import fs from 'node:fs';
import { d1Exec } from './helpers.js';

const DB_NAME = process.env.D1_DB_NAME;
const BACKUP_FILE = '/tmp/logo_url_backup.json';

if (!DB_NAME) {
  console.error('❌ 错误: 请设置 D1_DB_NAME 环境变量');
  console.error('   例如: export D1_DB_NAME=ngo_going_out');
  process.exit(1);
}

if (!fs.existsSync(BACKUP_FILE)) {
  console.error(`❌ 错误: 备份文件不存在: ${BACKUP_FILE}`);
  process.exit(1);
}

console.log(`\n📥 恢复 logo_url 值`);
console.log(`   数据库: ${DB_NAME}`);
console.log(`   备份文件: ${BACKUP_FILE}\n`);

async function main() {
  // Read backup file
  const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
  const records = backup[0].results;

  console.log(`📊 找到 ${records.length} 条 logo_url 记录\n`);
  console.log('🔄 开始恢复...\n');

  let updated = 0;
  let errors = 0;

  for (const record of records) {
    try {
      const sql = `UPDATE orgs SET logo_url = ? WHERE id = ?`;
      await d1Exec(DB_NAME, sql, [record.logo_url, record.id]);
      updated++;

      if (updated % 50 === 0) {
        process.stdout.write(`\r   已恢复: ${updated} 条记录...`);
      }
    } catch (e) {
      errors++;
      console.error(`\n❌ 恢复 ID ${record.id} 失败:`, e.message);
    }
  }

  console.log(`\n\n✅ 恢复完成!`);
  console.log(`   成功: ${updated} 条记录`);
  if (errors > 0) {
    console.log(`   失败: ${errors} 条记录`);
  }
}

main().catch(e => {
  console.error('\n❌ 恢复失败:', e.message);
  process.exit(1);
});
