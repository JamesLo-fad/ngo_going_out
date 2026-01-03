/* Import policies from CSV with Chinese column names
   支持两种导入模式：
   - replace: 清空现有数据后导入（默认）
   - append: 保留现有数据，追加或更新

   Usage:
     export D1_DB_NAME=<your-d1-name>

     # Replace模式（清空后导入）
     node tools/import_policies.js ../data/policies_clean.csv --mode=replace

     # Append模式（追加或更新）
     node tools/import_policies.js ../data/policies_clean.csv --mode=append
*/

import fs from 'node:fs';
import readline from 'node:readline';
import { parseCSVLine, mapHeaders, get, d1Exec } from './helpers.js';

const DB_NAME = process.env.D1_DB_NAME;

if (!DB_NAME) {
  console.error('❌ 错误: 请设置 D1_DB_NAME 环境变量');
  console.error('   例如: export D1_DB_NAME=ngo_going_out_dev');
  process.exit(1);
}

// 解析命令行参数
const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const mode = args.find(a => a.startsWith('--mode='))?.split('=')[1] || 'replace';

if (!file || !fs.existsSync(file)) {
  console.error('❌ 错误: 请提供CSV文件路径');
  console.error('   例如: node tools/import_policies.js ../data/policies_clean.csv --mode=replace');
  process.exit(1);
}

if (!['replace', 'append'].includes(mode)) {
  console.error('❌ 错误: mode 必须是 replace 或 append');
  process.exit(1);
}

console.log(`\n📊 导入政策数据`);
console.log(`   数据库: ${DB_NAME}`);
console.log(`   文件: ${file}`);
console.log(`   模式: ${mode === 'replace' ? '清空后导入' : '追加/更新'}\n`);

async function clearExistingData() {
  console.log('🗑️  清空现有数据...');
  try {
    await d1Exec(DB_NAME, 'DELETE FROM policies;');
    console.log('   ✓ 已清空 policies 表');
    console.log('✅ 现有数据已清空\n');
  } catch (e) {
    console.error('❌ 清空数据失败:', e.message);
    throw e;
  }
}

async function main() {
  // Replace模式：先清空数据
  if (mode === 'replace') {
    await clearExistingData();
  }

  const rl = readline.createInterface({ input: fs.createReadStream(file, 'utf8'), crlfDelay: Infinity });
  let headers, map, n = 0, errors = 0;

  console.log('📥 开始导入数据...\n');

  for await (const line of rl) {
    if (!headers) {
      headers = parseCSVLine(line).map(s => s.trim());
      map = mapHeaders(headers);
      continue;
    }
    if (!line.trim()) continue;
    const cols = parseCSVLine(line);

    try {
      // 中文列名 → 英文字段名映射
      const row = {
        id: Number(get(cols, map, '编号') || n + 1),
        published_date: get(cols, map, '发布时期') || '',
        title: get(cols, map, '题目') || '',
        doc_type: get(cols, map, '属性') || '',
        issuer_1: get(cols, map, '发布单位（部委）1') || '',
        issuer_2: get(cols, map, '发布单位（部委）2') || '',
        issuer_3: get(cols, map, '发布单位（部委）3') || '',
        issuer_4: get(cols, map, '发布单位（部委）4') || '',
        link: get(cols, map, '链接') || ''
      };

      const sql = `
        INSERT INTO policies (id, published_date, title, doc_type, issuer_1, issuer_2, issuer_3, issuer_4, link)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          published_date=excluded.published_date,
          title=excluded.title,
          doc_type=excluded.doc_type,
          issuer_1=excluded.issuer_1,
          issuer_2=excluded.issuer_2,
          issuer_3=excluded.issuer_3,
          issuer_4=excluded.issuer_4,
          link=excluded.link;
      `;
      await d1Exec(DB_NAME, sql, [
        row.id, row.published_date, row.title, row.doc_type,
        row.issuer_1, row.issuer_2, row.issuer_3, row.issuer_4, row.link
      ]);

      n++;
      if (n % 10 === 0) {
        process.stdout.write(`\r   已导入: ${n} 条记录...`);
      }
    } catch (e) {
      errors++;
      console.error(`\n❌ 导入第 ${n + 1} 行失败:`, e.message);
    }
  }

  console.log(`\n\n✅ 导入完成!`);
  console.log(`   成功: ${n} 条记录`);
  if (errors > 0) {
    console.log(`   失败: ${errors} 条记录`);
  }
}

main().catch(e => {
  console.error('\n❌ 导入失败:', e.message);
  process.exit(1);
});
