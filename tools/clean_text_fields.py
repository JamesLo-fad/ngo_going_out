#!/usr/bin/env python3
"""
Clean text fields in database:
1. Remove empty lines from multi-line fields
2. Trim leading/trailing whitespace on each line
3. Ensure no leading/trailing whitespace for entire field
4. Normalize multiple consecutive newlines to single newline
"""

import subprocess
import json

DB_NAME = 'ngo_going_out'

def execute_sql(sql):
    """Execute SQL command via wrangler"""
    cmd = ['npx', 'wrangler', 'd1', 'execute', DB_NAME, '--remote', '--command', sql]
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        raise Exception(f"SQL execution failed: {result.stderr}")

    return result.stdout

def get_records_with_newlines():
    """Get all records that have newlines in text fields"""
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
      overseas_services
    FROM orgs
    WHERE leaders LIKE '%' || CHAR(10) || '%'
       OR key_staff LIKE '%' || CHAR(10) || '%'
       OR mission LIKE '%' || CHAR(10) || '%'
       OR org_structure LIKE '%' || CHAR(10) || '%'
       OR overseas_mission LIKE '%' || CHAR(10) || '%'
       OR overseas_projects LIKE '%' || CHAR(10) || '%'
       OR overseas_regions LIKE '%' || CHAR(10) || '%'
       OR overseas_services LIKE '%' || CHAR(10) || '%';
    """

    result = execute_sql(sql)

    # Parse JSON output - find the JSON array start
    start_idx = result.find('[')
    if start_idx == -1:
        return []

    json_str = result[start_idx:]
    data = json.loads(json_str)
    return data[0]['results']

def clean_text(text):
    """
    Clean text field:
    1. Split by newlines
    2. Trim each line
    3. Remove empty lines
    4. Join with single newlines
    5. Trim final result
    """
    if not text or text == '——':
        return text

    # Split by newlines
    lines = text.split('\n')

    # Trim each line and remove empty ones
    cleaned_lines = [line.strip() for line in lines if line.strip()]

    # Join with newlines
    result = '\n'.join(cleaned_lines)

    return result.strip()

def escape_sql_string(s):
    """Escape string for SQL"""
    if s is None:
        return 'NULL'
    escaped = str(s).replace("'", "''")
    return f"'{escaped}'"

def main():
    print('='*100)
    print('🧹 Cleaning Text Fields')
    print('='*100)

    print('\n1. Fetching records with newlines...')
    records = get_records_with_newlines()
    print(f'   Found {len(records)} records to check')

    print('\n2. Cleaning and updating records...\n')

    updated_count = 0
    unchanged_count = 0

    text_fields = ['leaders', 'key_staff', 'mission', 'org_structure',
                   'overseas_mission', 'overseas_projects', 'overseas_regions',
                   'overseas_services']

    for record in records:
        org_id = record['id']
        org_name = record['org_name']

        updates = []
        changes = []

        for field in text_fields:
            original = record.get(field)
            if original and '\n' in original:
                cleaned = clean_text(original)

                if cleaned != original:
                    updates.append(f"{field} = {escape_sql_string(cleaned)}")

                    # Show what changed
                    orig_lines = len(original.split('\n'))
                    clean_lines = len(cleaned.split('\n'))
                    changes.append(f"{field}: {orig_lines}→{clean_lines} lines")

        if updates:
            update_sql = f"UPDATE orgs SET {', '.join(updates)} WHERE id = {org_id};"

            try:
                execute_sql(update_sql)
                print(f'   ✓ ID {org_id}: {org_name[:40]}')
                for change in changes:
                    print(f'      - {change}')
                updated_count += 1
            except Exception as e:
                print(f'   ✗ ID {org_id}: {str(e)[:80]}')
        else:
            unchanged_count += 1

    print(f'\n' + '='*100)
    print(f'✅ Cleaning Complete')
    print(f'   Updated: {updated_count} records')
    print(f'   Already clean: {unchanged_count} records')
    print('='*100)

if __name__ == '__main__':
    main()
