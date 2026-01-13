/* Fill in missing fields only (update NULL values from Excel, don't overwrite existing data)

   Usage:
     export D1_DB_NAME=<your-d1-name>
     node tools/fill_missing_fields.js data/orgs_from_excel.csv
*/

import fs from 'node:fs';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { parseCSVLine, mapHeaders, get, cleanValue, esc } from './helpers.js';

const DB_NAME = process.env.D1_DB_NAME;

if (!DB_NAME) {
  console.error('❌ 错误: 请设置 D1_DB_NAME 环境变量');
  console.error('   例如: export D1_DB_NAME=ngo_going_out');
  process.exit(1);
}

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error('❌ 错误: 请提供CSV文件路径');
  console.error('   例如: node tools/fill_missing_fields.js data/orgs_from_excel.csv');
  process.exit(1);
}

console.log(`\n📊 填充缺失字段`);
console.log(`   数据库: ${DB_NAME}`);
console.log(`   文件: ${file}\n`);

function parseYesNo(val) {
  if (!val) return null;
  const s = String(val).trim().toLowerCase();
  if (s === '是' || s === 'yes' || s === '1' || s === 'true') return 1;
  if (s === '否' || s === 'no' || s === '0' || s === 'false') return 0;
  return null;
}

// Execute wrangler command
async function d1Query(sql) {
  return new Promise((resolve, reject) => {
    const args = ['d1', 'execute', DB_NAME, '--command', sql, '--remote', '--json'];
    const p = spawn('wrangler', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    p.stdout.on('data', (data) => { stdout += data; });
    p.stderr.on('data', (data) => { stderr += data; });

    p.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`wrangler failed: ${stderr}`));
      } else {
        try {
          const result = JSON.parse(stdout);
          resolve(result[0].results);
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}`));
        }
      }
    });
  });
}

async function d1Exec(sql) {
  const args = ['d1', 'execute', DB_NAME, '--command', sql, '--remote'];
  await new Promise((resolve, reject) => {
    const p = spawn('wrangler', args, { stdio: 'inherit' });
    p.on('close', code => code === 0 ? resolve() : reject(new Error('wrangler failed')));
  });
}

async function main() {
  console.log('📥 读取CSV数据...\n');

  const rl = readline.createInterface({ input: fs.createReadStream(file, 'utf8'), crlfDelay: Infinity });
  let headers, map;
  const excelData = [];

  for await (const line of rl) {
    if (!headers) {
      headers = parseCSVLine(line).map(s => s.trim());
      map = mapHeaders(headers);
      continue;
    }
    if (!line.trim()) continue;
    const cols = parseCSVLine(line);

    const row = {
      id: Number(get(cols, map, '编号') || excelData.length + 1),
      org_name: cleanValue(get(cols, map, '组织名称')),
      in_cnie: parseYesNo(get(cols, map, '中促会')),
      in_cace: parseYesNo(get(cols, map, '民促会')),
      in_un: parseYesNo(get(cols, map, '联合国')),
      founded_date: cleanValue(get(cols, map, '成立时间')),
      go_global_date: cleanValue(get(cols, map, '出海时间')),
      leaders: cleanValue(get(cols, map, '领导人')),
      key_staff: cleanValue(get(cols, map, '重要员工')),
      capital_type: cleanValue(get(cols, map, '资本类型')),
      reg_location: cleanValue(get(cols, map, '注册地')),
      reg_type: cleanValue(get(cols, map, '注册形式')),
      donation_pre: (() => { const v = get(cols, map, '捐赠金额（出海前）'); return v ? parseFloat(v) : null; })(),
      donation_pre_year: cleanValue(get(cols, map, '捐赠金额（出海前）标注年份')),
      donation_post: (() => { const v = get(cols, map, '捐赠金额（出海后）'); return v ? parseFloat(v) : null; })(),
      donation_post_year: cleanValue(get(cols, map, '捐赠金额（出海后）标注年份')),
      mission: cleanValue(get(cols, map, '官网的组织理念')),
      org_structure: cleanValue(get(cols, map, '组织结构（参考年报）')),
      has_overseas_office: parseYesNo(get(cols, map, '是否有独立的海外办公室——组织结构')),
      overseas_mission: cleanValue(get(cols, map, '官网关于海外项目的组织理念——目标')),
      overseas_projects: cleanValue(get(cols, map, '海外项目的名称')),
      overseas_regions: cleanValue(get(cols, map, '海外涉及的地区')),
      overseas_services: cleanValue(get(cols, map, '海外服务内容')),
      service_mode: cleanValue(get(cols, map, '服务形式')),
      has_official_background: parseYesNo(get(cols, map, '主要成员是否有官方背景')),
      sources: cleanValue(get(cols, map, '主要信息来源')),
      disclosed_online: parseYesNo(get(cols, map, '是否有网上披露')),
      disclosed_continuous: parseYesNo(get(cols, map, '是否持续性披露')),
      go_out_level: cleanValue(get(cols, map, '走出去程度'))
    };

    if (row.org_name) {
      excelData.push(row);
    }
  }

  console.log(`✓ 读取 ${excelData.length} 条Excel记录\n`);

  console.log('📊 获取现有数据库记录...\n');
  const dbRecords = await d1Query('SELECT * FROM orgs ORDER BY id');
  console.log(`✓ 数据库有 ${dbRecords.length} 条记录\n`);

  console.log('🔍 分析缺失字段...\n');

  let updates = 0;
  let skipped = 0;
  let notInExcel = 0;

  for (const dbRow of dbRecords) {
    const excelRow = excelData.find(e => e.id === dbRow.id);

    if (!excelRow) {
      notInExcel++;
      continue;
    }

    // Build UPDATE statement for NULL fields only
    const updates_to_make = [];
    const params = [];

    const fields = [
      'org_name', 'in_cnie', 'in_cace', 'in_un', 'founded_date', 'go_global_date',
      'leaders', 'key_staff', 'capital_type', 'reg_location', 'reg_type',
      'donation_pre', 'donation_pre_year', 'donation_post', 'donation_post_year',
      'mission', 'org_structure', 'has_overseas_office', 'overseas_mission',
      'overseas_projects', 'overseas_regions', 'overseas_services', 'service_mode',
      'has_official_background', 'sources', 'disclosed_online', 'disclosed_continuous',
      'go_out_level'
    ];

    for (const field of fields) {
      // Only update if database value is NULL and Excel has a non-null value
      if ((dbRow[field] === null || dbRow[field] === undefined) && excelRow[field] !== null && excelRow[field] !== undefined) {
        updates_to_make.push(`${field}=${esc(excelRow[field])}`);
      }
    }

    if (updates_to_make.length > 0) {
      const sql = `UPDATE orgs SET ${updates_to_make.join(', ')} WHERE id=${dbRow.id}`;
      try {
        await d1Exec(sql);
        updates++;
        if (updates % 10 === 0) {
          process.stdout.write(`\r   已更新: ${updates} 条记录...`);
        }
      } catch (e) {
        console.error(`\n❌ 更新ID ${dbRow.id} 失败:`, e.message);
      }
    } else {
      skipped++;
    }
  }

  console.log(`\n\n✅ 完成!`);
  console.log(`   更新: ${updates} 条记录（有缺失字段）`);
  console.log(`   跳过: ${skipped} 条记录（无缺失字段）`);
  if (notInExcel > 0) {
    console.log(`   忽略: ${notInExcel} 条记录（不在Excel中）`);
  }
}

main().catch(e => {
  console.error('\n❌ 失败:', e.message);
  process.exit(1);
});
