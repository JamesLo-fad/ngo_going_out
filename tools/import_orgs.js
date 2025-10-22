/* Import orgs from CSV exported from the "组织相关信息" sheet.
   Required headers (lowercased after trim). We match the provided columns:
   编号,组织名称,中促会,民促会,联合国,成立时间,出海时间,领导人,重要员工,资本类型,注册地,注册形式,捐赠金额（出海前）标注年份,,捐赠金额（出海后）,,官网的组织理念,组织结构（参考年报）,是否有独立的海外办公室——组织结构,官网关于海外项目的组织理念——目标,海外项目的名称,海外涉及的地区,海外服务内容,服务形式,主要成员是否有官方背景,主要信息来源,是否有网上披露,是否持续性披露,走出去程度

   Usage:
     export D1_DB_NAME=<your-d1-name>
     node tools/import_orgs.js orgs.csv
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
  console.error('Provide a CSV file path, e.g., node tools/import_orgs.js orgs.csv');
  process.exit(1);
}

function makeUmbrellaFlags(row, map, cols) {
  const zhongcuohui = get(cols, map, '中促会') || get(cols, map, 'cnie 中国民间组织国际交流促进会');
  const mincuhui = get(cols, map, '民促会');
  const un = get(cols, map, '联合国');
  const flags = [];
  if (zhongcuohui !== '') flags.push(`中促会=${zhongcuohui}`);
  if (mincuhui !== '') flags.push(`民促会=${mincuhui}`);
  if (un !== '') flags.push(`联合国=${un}`);
  return flags.join(',');
}

function shortSummary(name, mission, overseasMission) {
  const base = mission || overseasMission || '';
  const s = base.replace(/\s+/g, ' ').trim();
  const t = s.slice(0, 200);
  return t || `Organization: ${name}`;
}

async function main() {
  const rl = readline.createInterface({ input: fs.createReadStream(file, 'utf8'), crlfDelay: Infinity });
  let headers, map, n = 0;

  for await (const line of rl) {
    if (!headers) { headers = parseCSVLine(line).map(s => s.trim()); map = mapHeaders(headers); continue; }
    if (!line.trim()) continue;
    const cols = parseCSVLine(line);

    const row = {
      id: Number(get(cols, map, '编号') || n + 1),
      name: get(cols, map, '组织名称') || '',
      alias: null,
      umbrella: makeUmbrellaFlags({}, map, cols),
      founded_year: get(cols, map, '成立时间') || '',
      go_out_year: get(cols, map, '出海时间') || '',
      leaders: get(cols, map, '领导人') || '',
      key_staff: get(cols, map, '重要员工') || '',
      capital_type: get(cols, map, '资本类型') || '',
      reg_location: get(cols, map, '注册地') || '',
      reg_form: get(cols, map, '注册形式') || '',
      donation_pre: get(cols, map, '捐赠金额（出海前）标注年份') || get(cols, map, '捐赠金额（出海前）') || '',
      donation_pre_year: get(cols, map, '2008年') || '',
      donation_post: get(cols, map, '捐赠金额（出海后）') || '',
      donation_post_year: get(cols, map, '2017年') || '',
      mission: get(cols, map, '官网的组织理念') || '',
      org_structure: get(cols, map, '组织结构（参考年报）') || '',
      overseas_office: get(cols, map, '是否有独立的海外办公室——组织结构') || '',
      overseas_mission: get(cols, map, '官网关于海外项目的组织理念——目标') || '',
      project_names: get(cols, map, '海外项目的名称') || '',
      project_regions: get(cols, map, '海外涉及的地区') || '',
      services: get(cols, map, '海外服务内容') || '',
      service_forms: get(cols, map, '服务形式') || '',
      official_background: get(cols, map, '主要成员是否有官方背景') || '',
      sources: get(cols, map, '主要信息来源') || '',
      disclosure_online: get(cols, map, '是否有网上披露') || '',
      disclosure_continuous: get(cols, map, '是否持续性披露') || '',
      go_out_degree: get(cols, map, '走出去程度') || '',
      slug: null
    };

    const summary = shortSummary(row.name, row.mission, row.overseas_mission);

    // Upsert org
    const sql = `
      INSERT INTO orgs (
        id, name, alias, umbrella_flags, founded_year, go_out_year, leaders, key_staff, capital_type,
        reg_location, reg_form, donation_pre, donation_pre_year, donation_post, donation_post_year,
        mission, org_structure, overseas_office, overseas_mission, project_names, project_regions,
        services, service_forms, official_background, sources, disclosure_online, disclosure_continuous,
        go_out_degree, slug, summary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,
        alias=excluded.alias,
        umbrella_flags=excluded.umbrella_flags,
        founded_year=excluded.founded_year,
        go_out_year=excluded.go_out_year,
        leaders=excluded.leaders,
        key_staff=excluded.key_staff,
        capital_type=excluded.capital_type,
        reg_location=excluded.reg_location,
        reg_form=excluded.reg_form,
        donation_pre=excluded.donation_pre,
        donation_pre_year=excluded.donation_pre_year,
        donation_post=excluded.donation_post,
        donation_post_year=excluded.donation_post_year,
        mission=excluded.mission,
        org_structure=excluded.org_structure,
        overseas_office=excluded.overseas_office,
        overseas_mission=excluded.overseas_mission,
        project_names=excluded.project_names,
        project_regions=excluded.project_regions,
        services=excluded.services,
        service_forms=excluded.service_forms,
        official_background=excluded.official_background,
        sources=excluded.sources,
        disclosure_online=excluded.disclosure_online,
        disclosure_continuous=excluded.disclosure_continuous,
        go_out_degree=excluded.go_out_degree,
        slug=excluded.slug,
        summary=excluded.summary;
    `;
    await d1Exec(DB_NAME, sql, [
      row.id, row.name, row.alias, row.umbrella, row.founded_year, row.go_out_year, row.leaders, row.key_staff, row.capital_type,
      row.reg_location, row.reg_form, row.donation_pre, row.donation_pre_year, row.donation_post, row.donation_post_year,
      row.mission, row.org_structure, row.overseas_office, row.overseas_mission, row.project_names, row.project_regions,
      row.services, row.service_forms, row.official_background, row.sources, row.disclosure_online, row.disclosure_continuous,
      row.go_out_degree, row.slug, summary
    ]);

    // Build facets (country/sector) heuristics
    const countries = normalizeList(row.project_regions);
    // Rough sector mapping from “海外服务内容/服务形式/mission/overseas_mission”
    const sectorSeeds = [row.services, row.service_forms, row.mission, row.overseas_mission].join(' ');
    const sectors = normalizeList(
      sectorSeeds.replace(/(教育|救灾|扶贫|环保|动保|医疗|职业|文化|法律|科研|矿业|农业|科技|志愿|贸易|交流|治理|金融|能源|体育|艺术|宗教)/g, '$1')
    );

    // Insert facets
    // Strategy: For each country, pair each sector; if empty, still add country with sector=''
    // Keep it small to avoid explosion
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