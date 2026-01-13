#!/usr/bin/env python3
"""
Extract and import the 8 missing organization records
IDs: 2, 10, 18, 22, 32, 103, 119, 135
"""

import openpyxl
import json
import re
import subprocess

EXCEL_FILE = '/Users/jameslo-aa/ngo_going_out/data/4_NGO going out_RA_project 614.xlsx'
LOGO_BACKUP = '/tmp/logo_backup.json'
DB_NAME = 'ngo_going_out'

# IDs that failed to import (had duplicate ID constraint or timeout errors)
MISSING_IDS = [2, 10, 18, 22, 32, 103, 119, 135]

# Column mapping based on corrected structure
COLUMN_MAPPING = {
    0: 'id',
    1: 'org_name',
    2: 'in_cnie',
    3: 'in_cace',
    4: 'in_un',
    5: 'founded_date',
    6: 'go_global_date',
    7: 'leaders',
    8: 'key_staff',
    9: 'capital_type',
    10: 'reg_location',
    11: 'reg_type',
    12: 'donation_pre',
    13: 'donation_pre_year',
    14: 'donation_post',
    15: 'donation_post_year',
    16: 'mission',
    17: 'org_structure',
    18: 'has_overseas_office',
    19: 'overseas_mission',
    20: 'overseas_projects',
    21: 'overseas_regions',
    22: 'overseas_services',
    23: 'service_mode',
    24: 'has_official_background',
    25: 'sources',
    26: 'disclosed_online',
    27: 'disclosed_continuous',
    28: 'go_out_level',
    29: 'logo_url'
}

def normalize_date(val):
    """Normalize date to Chinese format"""
    if not val or val in ['——', '-', 'null', None]:
        return '——'

    s = str(val).strip()

    # Already in correct format
    if re.match(r'^\d{4}\s*年(\s*\d{1,2}\s*月)?(\s*\d{1,2}\s*日)?$', s):
        return s

    # Format: "1985——4——1" (Chinese dash)
    match = re.match(r'^(\d{4})[——\-]+(\d{1,2})[——\-]+(\d{1,2})$', s)
    if match:
        year, month, day = match.groups()
        return f'{year} 年 {int(month)} 月 {int(day)} 日'

    # Format: "2009年" (year only)
    match = re.match(r'^(\d{4})\s*年$', s)
    if match:
        return f'{match.group(1)} 年'

    # Format: "1905-07-10" or "1905-07-10 00:00:00"
    match = re.match(r'^(\d{4})-(\d{1,2})-(\d{1,2})(\s+\d{2}:\d{2}:\d{2})?$', s)
    if match:
        year, month, day = match.groups()[:3]
        return f'{year} 年 {int(month)} 月 {int(day)} 日'

    # Remove parenthetical explanations
    s = re.sub(r'[（(].*?[）)]', '', s).strip()
    if s and re.match(r'^\d{4}$', s):
        return f'{s} 年'

    return s if s else '——'

def parse_yes_no(val):
    """Convert to 1/0 for database"""
    if val is None or val == '':
        return None
    s = str(val).strip().lower()
    if s in ['1', '1.0', 'true', '是']:
        return 1
    if s in ['0', '0.0', 'false', '否']:
        return 0
    return None

def clean_value(val):
    """Clean text value"""
    if val is None:
        return None
    s = str(val).strip()
    if s.lower() == 'null' or s == '':
        return None
    return s

def load_logo_backup():
    """Load logo URLs from backup"""
    try:
        with open(LOGO_BACKUP, 'r') as f:
            data = json.load(f)
            backup = {}
            for row in data[0]['results']:
                backup[row['id']] = row['logo_url']
            return backup
    except:
        return {}

def execute_sql(db_name, sql, params=None):
    """Execute SQL command via wrangler"""
    if params:
        # Build parameterized query
        param_str = ','.join([f'"{p}"' if isinstance(p, str) else str(p) if p is not None else 'NULL' for p in params])
        sql = sql.replace('?', '{}').format(*[f'"{p}"' if isinstance(p, str) and p is not None else str(p) if p is not None else 'NULL' for p in params])

    cmd = ['npx', 'wrangler', 'd1', 'execute', db_name, '--remote', '--command', sql]
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        raise Exception(f"SQL execution failed: {result.stderr}")

    return result.stdout

def main():
    print('='*80)
    print('📥 导入8个缺失的组织记录')
    print('='*80)

    # Load Excel
    print('\n1. 读取原始Excel...')
    wb = openpyxl.load_workbook(EXCEL_FILE)
    ws = wb.active
    print(f'   ✓ 已加载')

    # Load logo backup
    print('\n2. 加载Logo备份...')
    logo_backup = load_logo_backup()
    print(f'   ✓ 已加载 {len(logo_backup)} 个Logo URL')

    # Extract and import missing records
    print('\n3. 提取并导入缺失记录...\n')

    success_count = 0
    error_count = 0

    for missing_id in MISSING_IDS:
        try:
            # Row index = ID + 1 (row 1 is header)
            row_idx = missing_id + 1
            row = list(ws[row_idx])

            # Extract data
            org_name = clean_value(row[1].value)
            if not org_name:
                print(f'   ⚠️  ID {missing_id}: 组织名称为空，跳过')
                error_count += 1
                continue

            # Build record
            record = {
                'id': missing_id,
                'org_name': org_name,
                'in_cnie': parse_yes_no(row[2].value),
                'in_cace': parse_yes_no(row[3].value),
                'in_un': parse_yes_no(row[4].value),
                'founded_date': normalize_date(row[5].value),
                'go_global_date': normalize_date(row[6].value),
                'leaders': clean_value(row[7].value),
                'key_staff': clean_value(row[8].value),
                'capital_type': clean_value(row[9].value),
                'reg_location': clean_value(row[10].value),
                'reg_type': clean_value(row[11].value),
                'donation_pre': float(row[12].value) if row[12].value and row[12].value != '——' else None,
                'donation_pre_year': clean_value(row[13].value),
                'donation_post': float(row[14].value) if row[14].value and row[14].value != '——' else None,
                'donation_post_year': clean_value(row[15].value) if len(row) > 15 else None,
                'mission': clean_value(row[16].value) if len(row) > 16 else None,
                'org_structure': clean_value(row[17].value) if len(row) > 17 else None,
                'has_overseas_office': parse_yes_no(row[18].value) if len(row) > 18 else None,
                'overseas_mission': clean_value(row[19].value) if len(row) > 19 else None,
                'overseas_projects': clean_value(row[20].value) if len(row) > 20 else None,
                'overseas_regions': clean_value(row[21].value) if len(row) > 21 else None,
                'overseas_services': clean_value(row[22].value) if len(row) > 22 else None,
                'service_mode': clean_value(row[23].value) if len(row) > 23 else None,
                'has_official_background': parse_yes_no(row[24].value) if len(row) > 24 else None,
                'sources': clean_value(row[25].value) if len(row) > 25 else None,
                'disclosed_online': parse_yes_no(row[26].value) if len(row) > 26 else None,
                'disclosed_continuous': parse_yes_no(row[27].value) if len(row) > 27 else None,
                'go_out_level': clean_value(row[28].value) if len(row) > 28 else None,
                'logo_url': logo_backup.get(missing_id, None)
            }

            # First delete the placeholder record
            delete_sql = f"DELETE FROM orgs WHERE id = {missing_id};"
            execute_sql(DB_NAME, delete_sql)

            # Build INSERT SQL
            cols = ', '.join(record.keys())
            placeholders = ', '.join(['?' for _ in record])

            # Convert None to NULL, strings need quotes, numbers as-is
            values = []
            for v in record.values():
                if v is None:
                    values.append('NULL')
                elif isinstance(v, str):
                    # Escape single quotes
                    values.append(f"'{v.replace(chr(39), chr(39)+chr(39))}'")
                else:
                    values.append(str(v))

            values_str = ', '.join(values)
            insert_sql = f"INSERT INTO orgs ({cols}) VALUES ({values_str});"

            execute_sql(DB_NAME, insert_sql)

            print(f'   ✓ ID {missing_id}: {org_name[:40]}')
            success_count += 1

        except Exception as e:
            print(f'   ✗ ID {missing_id}: {str(e)[:60]}')
            error_count += 1

    print(f'\n' + '='*80)
    print(f'✅ 导入完成')
    print(f'   成功: {success_count} 条记录')
    print(f'   失败: {error_count} 条记录')
    print('='*80)

if __name__ == '__main__':
    main()
