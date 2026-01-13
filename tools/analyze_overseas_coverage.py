#!/usr/bin/env python3
"""
Analyze overseas coverage statistics for the NGO database.
Extracts unique countries/regions from overseas_regions field.
"""

import subprocess
import json
import re

DB_NAME = 'ngo_going_out'

def execute_sql(sql):
    """Execute SQL command via wrangler"""
    cmd = ['npx', 'wrangler', 'd1', 'execute', DB_NAME, '--remote', '--command', sql]
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        raise Exception(f"SQL execution failed: {result.stderr}")

    return result.stdout

def main():
    print('='*80)
    print('📊 Analyzing Overseas Coverage Statistics')
    print('='*80)

    # Get all overseas_regions data
    sql = "SELECT overseas_regions FROM orgs WHERE overseas_regions IS NOT NULL;"
    result = execute_sql(sql)

    # Parse JSON output
    start_idx = result.find('[')
    if start_idx == -1:
        print("No data found")
        return

    json_str = result[start_idx:]
    data = json.loads(json_str)
    results = data[0]['results']

    # Extract unique regions/countries
    regions_set = set()
    empty_count = 0

    for row in results:
        regions_text = row.get('overseas_regions', '')

        if not regions_text or regions_text == '——':
            empty_count += 1
            continue

        # Split by common delimiters (Chinese and English)
        parts = re.split(r'[、，,;；\n]', regions_text)

        for part in parts:
            region = part.strip()
            if region and region != '——':
                regions_set.add(region)

    # Sort regions
    regions_list = sorted(list(regions_set))

    print(f'\n✅ Statistics Summary:')
    print(f'   Total organizations: 438')
    print(f'   Organizations with overseas data: {438 - empty_count}')
    print(f'   Unique countries/regions covered: {len(regions_list)}')
    print(f'\n📍 Top 30 Countries/Regions:')

    for i, region in enumerate(regions_list[:30], 1):
        print(f'   {i:2d}. {region}')

    if len(regions_list) > 30:
        print(f'   ... and {len(regions_list) - 30} more')

    print('\n' + '='*80)

if __name__ == '__main__':
    main()
