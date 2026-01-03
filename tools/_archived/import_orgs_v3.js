/* Import orgs from CSV with Chinese column names
   CSV使用中文列名，此脚本将中文列名映射到数据库的英文字段名

   Usage:
     export D1_DB_NAME=<your-d1-name>
     node tools/import_orgs.js ../data/orgs_clean.csv
*/

import fs from 'node:fs';
import readline from 'node:readline';
import { parseCSVLine, mapHeaders, get, normalizeList, d1Exec } from './helpers.js';

const DB_NAME = process.env.D1_DB_NAME;

if (!DB_NAME) {
  console.error('Please set D1_DB_NAME env var to your D1 database name.');
  process.exit(1);
}

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error('Provide a CSV file path, e.g., node tools/import_orgs.js ../data/orgs_clean.csv');
  process.exit(1);
}

function parseYesNo(val) {
  if (!val) return null;
  const s = String(val).trim().toLowerCase();
  if (s === '是' || s === 'yes' || s === '1' || s === 'true') return 1;
  if (s === '否' || s === 'no' || s === '0' || s === 'false') return 0;
  return null;
}

async function main() {
  const rl = readline.createInterface({ input: fs.createReadStream(file, 'utf8'), crlfDelay: Infinity });
  let headers, map, n = 0;

  for await (const line of rl) {
    if (!headers) {
      headers = parseCSVLine(line).map(s => s.trim());
      map = mapHeaders(headers);
      continue;
    }
    if (!line.trim()) continue;
    const cols = parseCSVLine(line);

    // 中文列名 → 英文字段名映射
    const row = {
      id: Number(get(cols, map, '编号') || n + 1),
      org_name: get(cols, map, '组织名称') || '',
      in_cnie: parseYesNo(get(cols, map, '中促会')),
      in_cace: parseYesNo(get(cols, map, '民促会')),
      in_un: parseYesNo(get(cols, map, '联合国')),
      founded_date: get(cols, map, '成立时间') || '',
      go_global_date: get(cols, map, '出海时间') || '',
      leaders: get(cols, map, '领导人') || '',
      key_staff: get(cols, map, '重要员工') || '',
      capital_type: get(cols, map, '资本类型') || '',
      reg_location: get(cols, map, '注册地') || '',
      reg_type: get(cols, map, '注册形式') || '',
      donation_pre: parseFloat(get(cols, map, '捐赠金额（出海前）') || '0') || null,
      donation_pre_year: get(cols, map, '捐赠年份（出海前）') || '',
      donation_post: parseFloat(get(cols, map, '捐赠金额（出海后）') || '0') || null,
      donation_post_year: get(cols, map, '捐赠年份（出海后）') || '',
      mission: get(cols, map, '官网的组织理念') || '',
      org_structure: get(cols, map, '组织结构（参考年报）') || '',
      has_overseas_office: parseYesNo(get(cols, map, '是否有独立的海外办公室——组织结构')),
      overseas_mission: get(cols, map, '官网关于海外项目的组织理念——目标') || '',
      overseas_projects: get(cols, map, '海外项目的名称') || '',
      overseas_regions: get(cols, map, '海外涉及的地区') || '',
      overseas_services: get(cols, map, '海外服务内容') || '',
      service_mode: get(cols, map, '服务形式') || '',
      has_official_background: parseYesNo(get(cols, map, '主要成员是否有官方背景')),
      sources: get(cols, map, '主要信息来源') || '',
      disclosed_online: parseYesNo(get(cols, map, '是否有网上披露')),
      disclosed_continuous: parseYesNo(get(cols, map, '是否持续性披露')),
      go_out_level: get(cols, map, '走出去程度') || '',
      logo_url: get(cols, map, '官网LOGO或图片') || null
    };

    // Upsert org
    const sql = `
      INSERT INTO orgs (
        id, org_name, in_cnie, in_cace, in_un, founded_date, go_global_date, leaders, key_staff, capital_type,
        reg_location, reg_type, donation_pre, donation_pre_year, donation_post, donation_post_year,
        mission, org_structure, has_overseas_office, overseas_mission, overseas_projects, overseas_regions,
        overseas_services, service_mode, has_official_background, sources, disclosed_online, disclosed_continuous,
        go_out_level, logo_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        donation_post_year=excluded.donation_post_year,
        mission=excluded.mission,
        org_structure=excluded.org_structure,
        has_overseas_office=excluded.has_overseas_office,
        overseas_mission=excluded.overseas_mission,
        overseas_projects=excluded.overseas_projects,
        overseas_regions=excluded.overseas_regions,
        overseas_services=excluded.overseas_services,
        service_mode=excluded.service_mode,
        has_official_background=excluded.has_official_background,
        sources=excluded.sources,
        disclosed_online=excluded.disclosed_online,
        disclosed_continuous=excluded.disclosed_continuous,
        go_out_level=excluded.go_out_level,
        logo_url=excluded.logo_url;
    `;
    await d1Exec(DB_NAME, sql, [
      row.id, row.org_name, row.in_cnie, row.in_cace, row.in_un, row.founded_date, row.go_global_date, row.leaders, row.key_staff, row.capital_type,
      row.reg_location, row.reg_type, row.donation_pre, row.donation_pre_year, row.donation_post, row.donation_post_year,
      row.mission, row.org_structure, row.has_overseas_office, row.overseas_mission, row.overseas_projects, row.overseas_regions,
      row.overseas_services, row.service_mode, row.has_official_background, row.sources, row.disclosed_online, row.disclosed_continuous,
      row.go_out_level, row.logo_url
    ]);

    // Build facets (country/sector) heuristics
    const countries = normalizeList(row.overseas_regions);
    // Rough sector mapping from "海外服务内容/服务形式/mission/overseas_mission"
    const sectorSeeds = [row.overseas_services, row.service_mode, row.mission, row.overseas_mission].join(' ');
    const sectors = normalizeList(
      sectorSeeds.replace(/(教育|救灾|扶贫|环保|动保|医疗|职业|文化|法律|科研|矿业|农业|科技|志愿|贸易|交流|治理|金融|能源|体育|艺术|宗教)/g, '$1')
    );

    // Insert facets
    const limitedCountries = countries.slice(0, 10);
    const limitedSectors = Array.from(new Set(sectors)).slice(0, 10);
    if (limitedCountries.length === 0 && limitedSectors.length === 0) {
      // skip if no facet signals
    } else if (limitedCountries.length && limitedSectors.length) {
      for (const c of limitedCountries) {
        for (const s of limitedSectors) {
          await d1Exec(DB_NAME, `
            INSERT OR IGNORE INTO orgs_facets (org_id, country, sector) VALUES (?, ?, ?);
          `, [row.id, c, s]);
        }
      }
    } else if (limitedCountries.length) {
      for (const c of limitedCountries) {
        await d1Exec(DB_NAME, `
          INSERT OR IGNORE INTO orgs_facets (org_id, country, sector) VALUES (?, ?, ?);
        `, [row.id, c, '']);
      }
    } else {
      for (const s of limitedSectors) {
        await d1Exec(DB_NAME, `
          INSERT OR IGNORE INTO orgs_facets (org_id, country, sector) VALUES (?, ?, ?);
        `, [row.id, '', s]);
      }
    }

    n++;
    if (n % 100 === 0) console.log(`Imported orgs: ${n}`);
  }
  console.log(`Done. Imported orgs: ${n}`);
}

main().catch(e => { console.error(e); process.exit(1); });
