#!/usr/bin/env python3
"""
Convert Excel to CSV while preserving Chinese dash '——' values
"""

import openpyxl
import csv

EXCEL_FILE = '/Users/jameslo-aa/ngo_going_out/data/4_NGO going out_RA_project 614.xlsx'
CSV_FILE = '/Users/jameslo-aa/ngo_going_out/data/orgs_from_excel.csv'

print(f'\n📊 转换 Excel 到 CSV')
print(f'   输入: {EXCEL_FILE}')
print(f'   输出: {CSV_FILE}\n')

# Load Excel
wb = openpyxl.load_workbook(EXCEL_FILE)
ws = wb.active

# Write CSV
with open(CSV_FILE, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)

    for row_idx, row in enumerate(ws.iter_rows(values_only=True), 1):
        # Convert None to empty string, keep everything else including '——'
        cleaned_row = ['' if cell is None else str(cell) for cell in row]
        writer.writerow(cleaned_row)

        if row_idx % 100 == 0:
            print(f'   已处理: {row_idx} 行...')

print(f'\n✅ 转换完成!')
print(f'   输出文件: {CSV_FILE}')
