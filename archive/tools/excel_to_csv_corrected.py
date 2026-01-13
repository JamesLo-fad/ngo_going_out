#!/usr/bin/env python3
"""
Convert Excel to CSV with proper column mapping and data formatting

This handles the unusual Excel structure where:
- Columns with "None" headers contain important data
- Dates need to be normalized
- Boolean values need to be converted
"""

import openpyxl
import csv
import re

EXCEL_FILE = '/Users/jameslo-aa/ngo_going_out/data/4_NGO going out_RA_project 614.xlsx'
CSV_FILE = '/Users/jameslo-aa/ngo_going_out/data/orgs_corrected.csv'

# Corrected header mapping based on actual Excel structure
HEADERS = [
    '编号',                      # 0
    '组织名称',                  # 1
    '中促会',                    # 2
    '民促会',                    # 3
    '联合国',                    # 4
    '成立时间',                  # 5
    '出海时间',                  # 6
    '领导人',                    # 7
    '重要员工',                  # 8
    '资本类型',                  # 9
    '注册地',                    # 10
    '注册形式',                  # 11
    '捐赠金额（出海前）',        # 12 - Actually contains AMOUNT
    '捐赠年份（出海前）',        # 13 - Actually contains YEAR (was None in Excel)
    '捐赠金额（出海后）',        # 14 - Actually contains AMOUNT
    '捐赠年份（出海后）',        # 15 - Actually contains YEAR (was None in Excel)
    '官网的组织理念',            # 16
    '组织结构（参考年报）',      # 17
    '是否有独立的海外办公室——组织结构',  # 18
    '官网关于海外项目的组织理念——目标',  # 19
    '海外项目的名称',            # 20
    '海外涉及的地区',            # 21
    '海外服务内容',              # 22
    '服务形式',                  # 23
    '主要成员是否有官方背景',    # 24
    '主要信息来源',              # 25
    '是否有网上披露',            # 26
    '是否持续性披露',            # 27
    '走出去程度',                # 28
    '官网LOGO或图片'            # 29
]

def normalize_date(value):
    """Normalize various date formats to YYYY 年 MM 月 DD 日"""
    if not value or value in ['——', '-', 'null', None]:
        return '——'

    s = str(value).strip()

    # Format: "1985——4——1" or "1985-4-1" (dash can be -, —, or ——)
    match = re.match(r'^(\d{4})[-—–−]+(\d{1,2})[-—–−]+(\d{1,2})$', s)
    if match:
        year, month, day = match.groups()
        return f'{year} 年 {int(month)} 月 {int(day)} 日'

    # Format: "2009年" or "2009 年" (year only - normalize to have space)
    match = re.match(r'^(\d{4})\s*年$', s)
    if match:
        return f'{match.group(1)} 年'

    # Format: "2009年4月" or "2009 年 4 月" (year and month - normalize spacing)
    match = re.match(r'^(\d{4})\s*年\s*(\d{1,2})\s*月$', s)
    if match:
        year, month = match.groups()
        return f'{year} 年 {int(month)} 月'

    # Format: "2009年4月1日" or "2009 年 4 月 1 日" (full date - normalize spacing)
    match = re.match(r'^(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日$', s)
    if match:
        year, month, day = match.groups()
        return f'{year} 年 {int(month)} 月 {int(day)} 日'

    # Format: "1905-07-10" or "1905-07-10 00:00:00" (ISO datetime)
    match = re.match(r'^(\d{4})-(\d{1,2})-(\d{1,2})(\s+\d{2}:\d{2}:\d{2})?$', s)
    if match:
        year, month, day = match.groups()[:3]
        return f'{year} 年 {int(month)} 月 {int(day)} 日'

    # Return as-is if no pattern matches
    return s

def parse_yes_no(val):
    """Convert 1/0 to 是/否"""
    if val is None or val == '':
        return ''
    s = str(val).strip().lower()
    if s in ['1', '1.0', 'true', '是']:
        return '是'
    if s in ['0', '0.0', 'false', '否']:
        return '否'
    return val

def clean_value(val):
    """Clean value, preserve Chinese dash"""
    if val is None:
        return ''
    s = str(val).strip()
    if s.lower() == 'null':
        return ''
    # Preserve Chinese dash ——
    return s

def main():
    print(f'\n📊 转换 Excel 到 CSV（修正版）')
    print(f'   输入: {EXCEL_FILE}')
    print(f'   输出: {CSV_FILE}\n')

    # Read Excel
    print('📥 读取 Excel...')
    wb = openpyxl.load_workbook(EXCEL_FILE)
    ws = wb.active

    rows = list(ws.iter_rows(values_only=True))
    data_rows = rows[1:]  # Skip header row

    print(f'   ✓ 读取 {len(data_rows)} 行数据\n')

    # Write CSV with correct headers and data
    print('📝 写入 CSV...')
    with open(CSV_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)

        # Write corrected headers
        writer.writerow(HEADERS)

        # Write data rows with proper formatting
        for idx, row in enumerate(data_rows, 1):
            # Map to corrected structure
            corrected_row = [
                int(row[0]) if row[0] else idx,  # ID
                clean_value(row[1]),    # org_name
                parse_yes_no(row[2]),   # in_cnie
                parse_yes_no(row[3]),   # in_cace
                parse_yes_no(row[4]),   # in_un
                normalize_date(row[5]), # founded_date
                normalize_date(row[6]), # go_global_date
                clean_value(row[7]),    # leaders
                clean_value(row[8]),    # key_staff
                clean_value(row[9]),    # capital_type
                clean_value(row[10]),   # reg_location
                clean_value(row[11]),   # reg_type
                row[12] if row[12] and row[12] != '——' else '',  # donation_pre
                clean_value(row[13]),   # donation_pre_year
                row[14] if row[14] and row[14] != '——' else '',  # donation_post
                clean_value(row[15]) if len(row) > 15 else '',  # donation_post_year
                clean_value(row[16]) if len(row) > 16 else '',  # mission
                clean_value(row[17]) if len(row) > 17 else '',  # org_structure
                parse_yes_no(row[18]) if len(row) > 18 else '',  # has_overseas_office
                clean_value(row[19]) if len(row) > 19 else '',  # overseas_mission
                clean_value(row[20]) if len(row) > 20 else '',  # overseas_projects
                clean_value(row[21]) if len(row) > 21 else '',  # overseas_regions
                clean_value(row[22]) if len(row) > 22 else '',  # overseas_services
                clean_value(row[23]) if len(row) > 23 else '',  # service_mode
                parse_yes_no(row[24]) if len(row) > 24 else '',  # has_official_background
                clean_value(row[25]) if len(row) > 25 else '',  # sources
                parse_yes_no(row[26]) if len(row) > 26 else '',  # disclosed_online
                parse_yes_no(row[27]) if len(row) > 27 else '',  # disclosed_continuous
                clean_value(row[28]) if len(row) > 28 else '',  # go_out_level
                clean_value(row[29]) if len(row) > 29 else ''   # logo_url
            ]

            writer.writerow(corrected_row)

            if (idx % 100 == 0):
                print(f'   已处理: {idx} 行...')

    print(f'\n✅ 转换完成!')
    print(f'   输出文件: {CSV_FILE}\n')

if __name__ == '__main__':
    main()
