/* Import orgs from CSV with Chinese column names
   支持两种导入模式：
   - replace: 清空现有数据后导入（默认）
   - append: 保留现有数据，追加或更新

   Usage:
     export D1_DB_NAME=<your-d1-name>

     # Replace模式（清空后导入）
     node tools/import_orgs.js ../data/orgs_clean.csv --mode=replace

     # Append模式（追加或更新）
     node tools/import_orgs.js ../data/orgs_clean.csv --mode=append
*/

import fs from 'node:fs';
import readline from 'node:readline';
import { parseCSVLine, mapHeaders, get, cleanValue, shouldSkipRow, normalizeList, d1Exec } from './helpers.js';

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
  console.error('   例如: node tools/import_orgs.js ../data/orgs_clean.csv --mode=replace');
  process.exit(1);
}

if (!['replace', 'append'].includes(mode)) {
  console.error('❌ 错误: mode 必须是 replace 或 append');
  process.exit(1);
}

console.log(`\n📊 导入组织数据`);
console.log(`   数据库: ${DB_NAME}`);
console.log(`   文件: ${file}`);
console.log(`   模式: ${mode === 'replace' ? '清空后导入' : '追加/更新'}\n`);

function parseYesNo(val) {
  if (!val) return null;
  const s = String(val).trim().toLowerCase();
  if (s === '是' || s === 'yes' || s === '1' || s === 'true') return 1;
  if (s === '否' || s === 'no' || s === '0' || s === 'false') return 0;
  return null;
}

async function clearExistingData() {
  console.log('🗑️  清空现有数据...');
  try {
    // 只删除orgs表（生产环境可能没有orgs_facets表）
    await d1Exec(DB_NAME, 'DELETE FROM orgs;');
    console.log('   ✓ 已清空 orgs 表');

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
  let headers, map, n = 0, errors = 0, skipped = 0;

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
      // 中文列名 → 英文字段名映射，使用 cleanValue 清洗字符串字段
      const row = {
        id: Number(get(cols, map, '编号') || n + 1),
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
        logo_url: cleanValue(get(cols, map, '官网LOGO或图片'))
      };

      // Skip if org_name is empty (key field)
      if (shouldSkipRow(row, ['org_name'])) {
        skipped++;
        continue;
      }

      // Upsert org (production schema - without donation_post_year, disclosed_online, disclosed_continuous, go_out_level, logo_url)
      const sql = `
        INSERT INTO orgs (
          id, org_name, in_cnie, in_cace, in_un, founded_date, go_global_date, leaders, key_staff, capital_type,
          reg_location, reg_type, donation_pre, donation_pre_year, donation_post,
          mission, org_structure, has_overseas_office, overseas_mission, overseas_projects, overseas_regions,
          overseas_services, service_mode, has_official_background, sources
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          org_name=excluded.org_name,
          in_cnie=excluded.in_cnie,
          in_cace=excluded.in_cace,
          in_un=excluded.in_un,
          founded_date=excluded.founded_date,
          go_global_date=excluded.go_global_date,
          leaders=excluded.leaders,
          key_staff=excluded.key_staff,
          capital_type=excluded.capital_type,
          reg_location=excluded.reg_location,
          reg_type=excluded.reg_type,
          donation_pre=excluded.donation_pre,
          donation_pre_year=excluded.donation_pre_year,
          donation_post=excluded.donation_post,
          mission=excluded.mission,
          org_structure=excluded.org_structure,
          has_overseas_office=excluded.has_overseas_office,
          overseas_mission=excluded.overseas_mission,
          overseas_projects=excluded.overseas_projects,
          overseas_regions=excluded.overseas_regions,
          overseas_services=excluded.overseas_services,
          service_mode=excluded.service_mode,
          has_official_background=excluded.has_official_background,
          sources=excluded.sources;
      `;
      await d1Exec(DB_NAME, sql, [
        row.id, row.org_name, row.in_cnie, row.in_cace, row.in_un, row.founded_date, row.go_global_date, row.leaders, row.key_staff, row.capital_type,
        row.reg_location, row.reg_type, row.donation_pre, row.donation_pre_year, row.donation_post,
        row.mission, row.org_structure, row.has_overseas_office, row.overseas_mission, row.overseas_projects, row.overseas_regions,
        row.overseas_services, row.service_mode, row.has_official_background, row.sources
      ]);

      // Note: orgs_facets table not available in production database
      // Facets functionality is disabled for production imports

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
  if (skipped > 0) {
    console.log(`   跳过: ${skipped} 条记录（组织名称为空）`);
  }
  if (errors > 0) {
    console.log(`   失败: ${errors} 条记录`);
  }
}

main().catch(e => {
  console.error('\n❌ 导入失败:', e.message);
  process.exit(1);
});
