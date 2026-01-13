#!/usr/bin/env python3
"""
Clean double/multiple spaces in text fields.
Replace multiple consecutive spaces with single space.
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

def get_records_with_double_spaces():
    """Get all records that have double spaces in text fields"""
    sql = """
    SELECT
      id,
      org_name,
      leaders,
      key_staff,
      mission,
      org_structure,
      overseas_mission,
      overseas_projects,
      overseas_regions,
      overseas_services,
      service_mode,
      sources
    FROM orgs
    WHERE leaders LIKE '%  %'
       OR key_staff LIKE '%  %'
       OR mission LIKE '%  %'
       OR org_structure LIKE '%  %'
       OR overseas_mission LIKE '%  %'
       OR overseas_projects LIKE '%  %'
       OR overseas_regions LIKE '%  %'
       OR overseas_services LIKE '%  %'
       OR service_mode LIKE '%  %'
       OR sources LIKE '%  %';
    """

    result = execute_sql(sql)

    # Parse JSON output
    start_idx = result.find('[')
    if start_idx == -1:
        return []

    json_str = result[start_idx:]
    data = json.loads(json_str)
    return data[0]['results']

def clean_spaces(text):
    """Replace multiple consecutive spaces with single space"""
    if not text or text == '——':
        return text

    # Replace multiple spaces with single space
    cleaned = re.sub(r' {2,}', ' ', text)

    return cleaned.strip()

def escape_sql_string(s):
    """Escape string for SQL"""
    if s is None:
        return 'NULL'
    escaped = str(s).replace("'", "''")
    return f"'{escaped}'"

def main():
    print('='*100)
    print('🧹 Cleaning Multiple Spaces in Text Fields')
    print('='*100)

    print('\n1. Fetching records with multiple spaces...')
    records = get_records_with_double_spaces()
    print(f'   Found {len(records)} records to clean')

    if len(records) == 0:
        print('\n✅ No records need cleaning!')
        return

    print('\n2. Cleaning and updating records...\n')

    updated_count = 0
    text_fields = ['leaders', 'key_staff', 'mission', 'org_structure',
                   'overseas_mission', 'overseas_projects', 'overseas_regions',
                   'overseas_services', 'service_mode', 'sources']

    for record in records:
        org_id = record['id']
        org_name = record['org_name']

        updates = []
        changes = []

        for field in text_fields:
            original = record.get(field)
            if original and '  ' in original:
                cleaned = clean_spaces(original)

                if cleaned != original:
                    updates.append(f"{field} = {escape_sql_string(cleaned)}")

                    # Count spaces removed
                    orig_spaces = original.count('  ')
                    changes.append(f"{field}: removed {orig_spaces} double spaces")

        if updates:
            update_sql = f"UPDATE orgs SET {', '.join(updates)} WHERE id = {org_id};"

            try:
                execute_sql(update_sql)
                print(f'   ✓ ID {org_id}: {org_name[:50]}')
                for change in changes:
                    print(f'      - {change}')
                updated_count += 1
            except Exception as e:
                print(f'   ✗ ID {org_id}: {str(e)[:80]}')

    print(f'\n' + '='*100)
    print(f'✅ Cleaning Complete')
    print(f'   Updated: {updated_count} records')
    print('='*100)

if __name__ == '__main__':
    main()
