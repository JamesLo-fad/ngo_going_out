#!/usr/bin/env python3
"""
Complete reimport from Excel with corrected column mapping and data formatting
This script handles the unusual Excel structure where:
- Column "捐赠金额（出海前）标注年份" contains the AMOUNT
- The YEAR is in the next column with no header
"""

import openpyxl
import json
import subprocess
import re
from datetime import datetime

EXCEL_FILE = '/Users/jameslo-aa/ngo_going_out/data/4_NGO going out_RA_project 614.xlsx'
DB_NAME = 'ngo_going_out'

def normalize_date(value):
    """Normalize various date formats to YYYY 年 MM 月 DD 日"""
    if not value or value in ['——', '-', 'null']:
        return '——'

    s = str(value).strip()

    # Already in correct format
    if re.match(r'^\d{4}\s*年(\s*\d{1,2}\s*月)?(\s*\d{1,2}\s*日)?$', s):
        return s

    # Format: "1985——4——1" or "1985-4-1"
    match = re.match(r'^(\d{4})[-——](\d{1,2})[-——](\d{1,2})$', s)
    if match:
        year, month, day = match.groups()
        return f'{year} 年 {int(month)} 月 {int(day)} 日'

    # Format: "2009年" (year only)
    match = re.match(r'^(\d{4})\s*年$', s)
    if match:
        return f'{match.group(1)} 年'

    # Format: "1905-07-10 00:00:00" (datetime)
    match = re.match(r'^(\d{4})-(\d{1,2})-(\d{1,2})(\s+\d{2}:\d{2}:\d{2})?$', s)
    if match:
        year, month, day = match.groups()[:3]
        return f'{year} 年 {int(month)} 月 {int(day)} 日'

    # Return as-is if no pattern matches
    return s

def parse_yes_no(val):
    """Convert 是/否 or 1/0 to database boolean"""
    if val is None or val == '':
        return None
    s = str(val).strip().lower()
    if s in ['是', 'yes', '1', '1.0', 'true']:
        return 1
    if s in ['否', 'no', '0', '0.0', 'false']:
        return 0
    return None

def clean_value(val):
    """Clean string values, preserve Chinese dash ——"""
    if val is None:
        return None
    s = str(val).strip()
    if s == '' or s.lower() == 'null':
        return None
    # Preserve Chinese dash ——
    return s

def esc_sql(v):
    """Escape value for SQL"""
    if v is None or v == '':
        return 'NULL'
    if isinstance(v, (int, float)):
        if isinstance(v, float) and (v != v or not (-1e308 < v < 1e308)):  # NaN or Infinity
            return 'NULL'
        return str(v)
    # Escape single quotes
    return "'" + str(v).replace("'", "''") + "'"

def execute_sql(sql):
    """Execute SQL command on D1 database"""
    cmd = ['npx', 'wrangler', 'd1', 'execute', DB_NAME, '--remote', '--command', sql]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise Exception(f"SQL failed: {result.stderr}")
    return result.stdout

def main():
    print(f'\n📊 完全重新导入数据')
    print(f'   Excel: {EXCEL_FILE}')
    print(f'   数据库: {DB_NAME}\n')

    # Read Excel
    print('📥 读取 Excel 文件...')
    wb = openpyxl.load_workbook(EXCEL_FILE)
    ws = wb.active

    rows = list(ws.iter_rows(values_only=True))
    headers = rows[0]
    data_rows = rows[1:]

    print(f'   ✓ 读取 {len(data_rows)} 行数据\n')

    # Clear existing data
    print('🗑️  清空现有数据...')
    execute_sql('DELETE FROM orgs;')
    print('   ✓ 已清空\n')

    # Process each row
    print('📝 导入数据...\n')
    success = 0
    errors = 0

    for idx, row in enumerate(data_rows, 1):
        try:
            # Note: Excel columns are 0-indexed
            # But the data structure has unnamed columns after certain headers
            org_id = int(row[0]) if row[0] else idx
            org_name = clean_value(row[1])

            if not org_name:
                continue

            # Build SQL INSERT
            # Note: Column mapping based on actual Excel structure
            sql = f"""
            INSERT INTO orgs (
                id, org_name, in_cnie, in_cace, in_un,
                founded_date, go_global_date, leaders, key_staff, capital_type,
                reg_location, reg_type,
                donation_pre, donation_pre_year,
                donation_post,
                mission, org_structure, has_overseas_office,
                overseas_mission, overseas_projects, overseas_regions,
                overseas_services, service_mode,
                has_official_background, sources,
                disclosed_online, disclosed_continuous, go_out_level,
                logo_url
            ) VALUES (
                {org_id},
                {esc_sql(org_name)},
                {esc_sql(parse_yes_no(row[2]))},
                {esc_sql(parse_yes_no(row[3]))},
                {esc_sql(parse_yes_no(row[4]))},
                {esc_sql(normalize_date(row[5]))},
                {esc_sql(normalize_date(row[6]))},
                {esc_sql(clean_value(row[7]))},
                {esc_sql(clean_value(row[8]))},
                {esc_sql(clean_value(row[9]))},
                {esc_sql(clean_value(row[10]))},
                {esc_sql(clean_value(row[11]))},
                {esc_sql(row[12] if row[12] and row[12] != '——' else None)},
                {esc_sql(clean_value(row[13]))},
                {esc_sql(row[14] if row[14] and row[14] != '——' else None)},
                {esc_sql(clean_value(row[16]))},
                {esc_sql(clean_value(row[17]))},
                {esc_sql(parse_yes_no(row[18]))},
                {esc_sql(clean_value(row[19]))},
                {esc_sql(clean_value(row[20]))},
                {esc_sql(clean_value(row[21]))},
                {esc_sql(clean_value(row[22]))},
                {esc_sql(clean_value(row[23]))},
                {esc_sql(parse_yes_no(row[24]))},
                {esc_sql(clean_value(row[25]))},
                {esc_sql(parse_yes_no(row[26]))},
                {esc_sql(parse_yes_no(row[27]))},
                {esc_sql(clean_value(row[28]))},
                {esc_sql(clean_value(row[29]) if len(row) > 29 else None)}
            );
            """

            execute_sql(sql)
            success += 1

            if success % 50 == 0:
                print(f'   已导入: {success} 条记录...')

        except Exception as e:
            errors += 1
            print(f'   ❌ 第 {idx} 行失败: {str(e)[:100]}')

    print(f'\n✅ 导入完成!')
    print(f'   成功: {success}')
    print(f'   失败: {errors}\n')

if __name__ == '__main__':
    main()
