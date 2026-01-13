/* Import orgs from corrected CSV with proper date normalization
   Usage:
     export D1_DB_NAME=ngo_going_out
     node tools/import_orgs_corrected.js data/orgs_corrected.csv
*/

import fs from 'node:fs';
import readline from 'node:readline';
import { parseCSVLine, mapHeaders, get, d1Exec } from './helpers.js';

const DB_NAME = process.env.D1_DB_NAME;

if (!DB_NAME) {
  console.error('❌ 错误: 请设置 D1_DB_NAME 环境变量');
  console.error('   例如: export D1_DB_NAME=ngo_going_out');
  process.exit(1);
}

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error('❌ 错误: 请提供CSV文件路径');
  console.error('   例如: node tools/import_orgs_corrected.js data/orgs_corrected.csv');
  process.exit(1);
}

console.log(`\n📊 导入组织数据（修正版）`);
console.log(`   数据库: ${DB_NAME}`);
console.log(`   文件: ${file}\n`);

function normalizeDate(val) {
  if (!val || val === '——' || val === '-' || val.toLowerCase() === 'null') {
    return '——';
  }

  const s = String(val).trim();

  // Already in correct format: "2009 年" or "2009 年 4 月 1 日"
  if (/^\d{4}\s*年(\s*\d{1,2}\s*月)?(\s*\d{1,2}\s*日)?$/.test(s)) {
    return s;
  }

  // Format: "1985——4——1" (Chinese dash)
  const match1 = s.match(/^(\d{4})[——\-](\d{1,2})[——\-](\d{1,2})$/);
  if (match1) {
    const [, year, month, day] = match1;
    return `${year} 年 ${parseInt(month)} 月 ${parseInt(day)} 日`;
  }

  // Format: "2009年" (no space)
  const match2 = s.match(/^(\d{4})年$/);
  if (match2) {
    return `${match2[1]} 年`;
  }

  // Format: "1905-07-10" or "1905-07-10 00:00:00"
  const match3 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(\s+\d{2}:\d{2}:\d{2})?$/);
  if (match3) {
    const [, year, month, day] = match3;
    return `${year} 年 ${parseInt(month)} 月 ${parseInt(day)} 日`;
  }

  return s;
}

function parseYesNo(val) {
  if (!val) return null;
  const s = String(val).trim().toLowerCase();
  if (s === '是' || s === 'yes' || s === '1' || s === 'true') return 1;
  if (s === '否' || s === 'no' || s === '0' || s === 'false') return 0;
  return null;
}

function cleanValue(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (s === '' || s.toLowerCase() === 'null') return null;
  // Preserve Chinese dash ——
  return s;
}

function esc(v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  if (typeof v === 'number') {
    if (isNaN(v) || !isFinite(v)) return 'NULL';
    return String(v);
  }
  if (/^\d+(\.\d+)?$/.test(String(v))) return v; // numeric strings
  return `'${String(v).replace(/'/g, "''")}'`;
}

// Read existing logo URLs from backup
let logoBackup = {};
try {
  const backupData = JSON.parse(fs.readFileSync('/tmp/logo_backup.json', 'utf8'));
  backupData[0].results.forEach(row => {
    logoBackup[row.id] = row.logo_url;
  });
  console.log(`✓ 加载了 ${Object.keys(logoBackup).length} 个 logo URL 备份\n`);
} catch (e) {
  console.log('ℹ️  未找到 logo URL 备份文件\n');
}

async function main() {
  // Clear existing data
  console.log('🗑️  清空现有数据...');
  await d1Exec(DB_NAME, 'DELETE FROM orgs;');
  console.log('   ✓ 已清空\n');

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
      const id = Number(get(cols, map, '编号') || n + 1);
      const row = {
        id,
        org_name: cleanValue(get(cols, map, '组织名称')),
        in_cnie: parseYesNo(get(cols, map, '中促会')),
        in_cace: parseYesNo(get(cols, map, '民促会')),
        in_un: parseYesNo(get(cols, map, '联合国')),
        founded_date: normalizeDate(get(cols, map, '成立时间')),
        go_global_date: normalizeDate(get(cols, map, '出海时间')),
        leaders: cleanValue(get(cols, map, '领导人')),
        key_staff: cleanValue(get(cols, map, '重要员工')),
        capital_type: cleanValue(get(cols, map, '资本类型')),
        reg_location: cleanValue(get(cols, map, '注册地')),
        reg_type: cleanValue(get(cols, map, '注册形式')),
        donation_pre: (() => { const v = get(cols, map, '捐赠金额（出海前）'); return v ? parseFloat(v) : null; })(),
        donation_pre_year: cleanValue(get(cols, map, '捐赠年份（出海前）')),
        donation_post: (() => { const v = get(cols, map, '捐赠金额（出海后）'); return v ? parseFloat(v) : null; })(),
        donation_post_year: cleanValue(get(cols, map, '捐赠年份（出海后）')),
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
        go_out_level: cleanValue(get(cols, map, '走出去程度')),
        // Use backed up R2 logo URL if available, otherwise from CSV
        logo_url: logoBackup[id] || cleanValue(get(cols, map, '官网LOGO或图片'))
      };

      if (!row.org_name) continue;

      const sql = `
        INSERT INTO orgs (
          id, org_name, in_cnie, in_cace, in_un, founded_date, go_global_date, leaders, key_staff, capital_type,
          reg_location, reg_type, donation_pre, donation_pre_year, donation_post, donation_post_year,
          mission, org_structure, has_overseas_office, overseas_mission, overseas_projects, overseas_regions,
          overseas_services, service_mode, has_official_background, sources,
          disclosed_online, disclosed_continuous, go_out_level, logo_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await d1Exec(DB_NAME, sql, [
        row.id, row.org_name, row.in_cnie, row.in_cace, row.in_un, row.founded_date, row.go_global_date, row.leaders, row.key_staff, row.capital_type,
        row.reg_location, row.reg_type, row.donation_pre, row.donation_pre_year, row.donation_post, row.donation_post_year,
        row.mission, row.org_structure, row.has_overseas_office, row.overseas_mission, row.overseas_projects, row.overseas_regions,
        row.overseas_services, row.service_mode, row.has_official_background, row.sources,
        row.disclosed_online, row.disclosed_continuous, row.go_out_level, row.logo_url
      ]);

      n++;
      if (n % 50 === 0) {
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
