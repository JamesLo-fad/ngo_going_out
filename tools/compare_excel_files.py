#!/usr/bin/env python3
"""
Compare original Excel with exported database Excel
Identify all differences and data quality issues
"""

import openpyxl
from collections import defaultdict

ORIGINAL_FILE = '/Users/jameslo-aa/ngo_going_out/data/4_NGO going out_RA_project 614.xlsx'
EXPORTED_FILE = '/Users/jameslo-aa/ngo_going_out/data/ngo_database_export_20260113_130254.xlsx'

def read_excel(filepath):
    """Read Excel file and return headers and rows"""
    wb = openpyxl.load_workbook(filepath)
    ws = wb.active

    rows = list(ws.iter_rows(values_only=True))
    headers = rows[0]
    data_rows = rows[1:]

    return headers, data_rows

def main():
    print('\n📊 比较 Excel 文件')
    print(f'   原始文件: {ORIGINAL_FILE}')
    print(f'   导出文件: {EXPORTED_FILE}\n')

    # Read both files
    print('📥 读取文件...\n')
    orig_headers, orig_rows = read_excel(ORIGINAL_FILE)
    exp_headers, exp_rows = read_excel(EXPORTED_FILE)

    print(f'原始文件:')
    print(f'   列数: {len(orig_headers)}')
    print(f'   行数: {len(orig_rows)}')
    print(f'   列名: {orig_headers[:10]}...\n')

    print(f'导出文件:')
    print(f'   列数: {len(exp_headers)}')
    print(f'   行数: {len(exp_rows)}')
    print(f'   列名: {exp_headers[:10]}...\n')

    # Compare first few rows
    print('🔍 比较前 5 行数据:\n')

    for row_idx in range(min(5, len(orig_rows), len(exp_rows))):
        orig_row = orig_rows[row_idx]
        exp_row = exp_rows[row_idx]

        org_name_idx = orig_headers.index('组织名称')
        print(f'--- 行 {row_idx + 1}: {orig_row[org_name_idx]} ---')

        # Compare each column
        differences = []
        for i, header in enumerate(orig_headers):
            if i < len(exp_headers):
                orig_val = orig_row[i] if i < len(orig_row) else None
                exp_val = exp_row[i] if i < len(exp_row) else None

                # Convert None to empty string for comparison
                orig_str = '' if orig_val is None else str(orig_val).strip()
                exp_str = '' if exp_val is None else str(exp_val).strip()

                if orig_str != exp_str:
                    differences.append({
                        'column': header,
                        'original': orig_str[:50],  # Truncate for display
                        'exported': exp_str[:50]
                    })

        if differences:
            print(f'  发现 {len(differences)} 处不同:')
            for diff in differences[:10]:  # Show first 10 differences
                print(f'    • {diff["column"]}:')
                print(f'      原始: "{diff["original"]}"')
                print(f'      导出: "{diff["exported"]}"')
        else:
            print('  ✓ 数据一致')
        print()

    # Check specific problematic fields
    print('🔍 检查特定字段:\n')

    # Check boolean fields (中促会, 民促会, 联合国)
    print('1. 布尔字段 (中促会, 民促会, 联合国):')
    for field in ['中促会', '民促会', '联合国']:
        if field in orig_headers and field in exp_headers:
            orig_idx = orig_headers.index(field)
            exp_idx = exp_headers.index(field)

            # Check first 5 rows
            print(f'   {field}:')
            for i in range(min(5, len(orig_rows), len(exp_rows))):
                orig_val = orig_rows[i][orig_idx] if orig_idx < len(orig_rows[i]) else None
                exp_val = exp_rows[i][exp_idx] if exp_idx < len(exp_rows[i]) else None

                if orig_val != exp_val:
                    print(f'     行{i+1}: 原始="{orig_val}" vs 导出="{exp_val}" ❌')
    print()

    # Check date fields
    print('2. 日期字段 (成立时间):')
    if '成立时间' in orig_headers and '成立时间' in exp_headers:
        orig_idx = orig_headers.index('成立时间')
        exp_idx = exp_headers.index('成立时间')

        for i in range(min(10, len(orig_rows), len(exp_rows))):
            orig_val = orig_rows[i][orig_idx] if orig_idx < len(orig_rows[i]) else None
            exp_val = exp_rows[i][exp_idx] if exp_idx < len(exp_rows[i]) else None

            orig_str = '' if orig_val is None else str(orig_val).strip()
            exp_str = '' if exp_val is None else str(exp_val).strip()

            if orig_str and exp_str and orig_str != exp_str:
                print(f'   行{i+1}:')
                print(f'     原始: "{orig_str}"')
                print(f'     导出: "{exp_str}"')
    print()

    # Check for empty fields in export that have data in original
    print('3. 检查空白字段:')
    empty_count = defaultdict(int)
    missing_count = defaultdict(int)

    for row_idx in range(min(len(orig_rows), len(exp_rows))):
        orig_row = orig_rows[row_idx]
        exp_row = exp_rows[row_idx]

        for i, header in enumerate(orig_headers):
            if i < len(exp_headers):
                orig_val = orig_row[i] if i < len(orig_row) else None
                exp_val = exp_row[i] if i < len(exp_row) else None

                orig_str = '' if orig_val is None else str(orig_val).strip()
                exp_str = '' if exp_val is None else str(exp_val).strip()

                # Count cases where original has data but export is empty
                if orig_str and not exp_str:
                    missing_count[header] += 1

                # Count empty fields in export
                if not exp_str:
                    empty_count[header] += 1

    print('   导出文件中缺失数据的字段 (原始有值但导出为空):')
    for field, count in sorted(missing_count.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f'     {field}: {count} 条记录缺失')

    print('\n✅ 比较完成\n')

if __name__ == '__main__':
    main()
