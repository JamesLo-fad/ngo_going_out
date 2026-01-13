# File Management and Cleanup Log

**Date**: 2026-01-13
**Purpose**: Document file organization, archival, and cleanup procedures

---

## 📁 Current File Structure

### Active Files (Keep in Main Directory)

#### Data Files (`/data/`)
- ✅ **`4_NGO going out_RA_project 614.xlsx`** (44M, original source Excel)
  - Purpose: Original authoritative data source
  - Status: **SOURCE FILE - NEVER DELETE**

- ✅ **`ngo_database_export_20260113_152157.xlsx`** (194K, latest export)
  - Purpose: Latest corrected database export with all text data fixes
  - Date: 2026-01-13 15:21 (after text cleaning)
  - Status: **CURRENT PRODUCTION EXPORT**

#### Python Tools (`/tools/`)
**Import/Export Scripts:**
- ✅ **`import_from_excel_direct_batched.py`** (9.6K)
  - Purpose: Current production import script (direct Excel → D1, batched for performance)
  - Features: Handles multi-line cells, preserves newlines, batch processing
  - Status: **PRIMARY IMPORT TOOL**

- ✅ **`export_db_to_excel.py`** (5.7K)
  - Purpose: Export D1 database to Excel with proper formatting
  - Features: Boolean conversion (1/0 → 是/否), Chinese date formats
  - Status: **PRIMARY EXPORT TOOL**

- ✅ **`clean_text_fields.py`** (4.3K)
  - Purpose: Clean text fields (remove empty lines, trim whitespace)
  - Usage: Run periodically for data quality maintenance
  - Status: **MAINTENANCE TOOL**

**Analysis Tools:**
- ✅ **`analyze_data_completeness.py`** (6.8K)
  - Purpose: Generate data completeness reports
  - Status: **QUALITY ASSURANCE TOOL**

- ✅ **`compare_excel_files.py`** (5.8K)
  - Purpose: Compare two Excel files for validation
  - Status: **VALIDATION TOOL**

#### JavaScript Tools (`/tools/`)
- ✅ **`import_orgs_corrected.js`** (7.9K)
  - Purpose: Import organizations (CSV-based, backup method)
  - Status: **BACKUP IMPORT TOOL**

- ✅ **`import_policies.js`** (4.7K)
  - Purpose: Import policy data
  - Status: **ACTIVE**

- ✅ **`helpers.js`** (2.4K)
  - Purpose: Shared utility functions
  - Status: **LIBRARY**

- ✅ **`generate-logo-mappings.js`** (3.0K)
  - Purpose: Generate logo URL mappings
  - Status: **UTILITY**

---

## 📦 Archived Files

### Archived Data Exports (`/archive/data/`)

**Old Database Exports (Superseded by 152157 export):**
- `ngo_database_export_20260113_130254.xlsx` (184K) - Jan 13 13:02
- `ngo_database_export_20260113_140453.xlsx` (187K) - Jan 13 14:04
- `ngo_database_export_20260113_142152.xlsx` (188K) - Jan 13 14:21
- `ngo_database_export_20260113_143422.xlsx` (189K) - Jan 13 14:34
- `ngo_database_export_20260113_143721.xlsx` (189K) - Jan 13 14:37
- `ngo_database_export_20260113_145427.xlsx` (191K) - Jan 13 14:54

**Reason**: Multiple intermediate exports during debugging. Final export (152157) contains all fixes.

### Archived Python Tools (`/archive/tools/`)

**Obsolete Import Scripts:**
- `import_from_excel.py` (6.9K)
  - Reason: Old CSV-based import with newline parsing bugs
  - Superseded by: `import_from_excel_direct_batched.py`

- `import_from_excel_direct.py` (9.6K)
  - Reason: Non-batched version, too slow
  - Superseded by: `import_from_excel_direct_batched.py`

- `excel_to_csv.py` (1.0K)
  - Reason: CSV conversion caused newline bugs
  - Superseded by: Direct Excel import

- `excel_to_csv_corrected.py` (7.2K)
  - Reason: Still uses CSV intermediate format
  - Superseded by: Direct Excel import

- `reimport_from_excel.py` (6.4K)
  - Reason: Old import script
  - Superseded by: `import_from_excel_direct_batched.py`

**One-Time Fix Scripts:**
- `import_missing_orgs.py` (8.5K)
  - Purpose: Fixed 8 missing organization records (IDs: 2, 10, 18, 22, 32, 103, 119, 135)
  - Status: ✅ Completed, archived
  - Date: 2026-01-13 14:50

- `check_null_fields.py` (2.0K)
  - Purpose: One-time analysis of NULL fields
  - Status: ✅ Completed, archived

- `sample_comparison.py` (2.7K)
  - Purpose: One-time comparison analysis
  - Status: ✅ Completed, archived

- `json_to_excel.py` (5.3K)
  - Purpose: JSON to Excel conversion (not used in final workflow)
  - Status: Archived

### Archived JavaScript Tools (`/archive/tools/`)

**Superseded Scripts:**
- `import_orgs.js` (8.8K)
  - Reason: Superseded by `import_orgs_corrected.js`

**One-Time Fix Scripts:**
- `fill_missing_fields.js` (7.4K)
  - Purpose: One-time field filling operation
  - Status: ✅ Completed, archived

- `normalize-date-formats.js` (4.3K)
  - Purpose: One-time date format normalization
  - Status: ✅ Completed, archived

- `restore_logo_urls.js` (1.7K)
  - Purpose: One-time logo URL restoration
  - Status: ✅ Completed, archived

---

## 🔄 Standard Workflow

### Importing New Data
```bash
# Use the primary import tool
python3 tools/import_from_excel_direct_batched.py
```

### Exporting Database
```bash
# Export with proper formatting
python3 tools/export_db_to_excel.py
```

### Data Quality Maintenance
```bash
# Clean text fields (remove empty lines, trim spaces)
python3 tools/clean_text_fields.py

# Analyze data completeness
python3 tools/analyze_data_completeness.py
```

---

## 🗑️ Cleanup Commands

### Archive Old Exports
```bash
# Move old exports to archive
mv /Users/jameslo-aa/ngo_going_out/data/ngo_database_export_20260113_130254.xlsx /Users/jameslo-aa/ngo_going_out/archive/data/
mv /Users/jameslo-aa/ngo_going_out/data/ngo_database_export_20260113_140453.xlsx /Users/jameslo-aa/ngo_going_out/archive/data/
mv /Users/jameslo-aa/ngo_going_out/data/ngo_database_export_20260113_142152.xlsx /Users/jameslo-aa/ngo_going_out/archive/data/
mv /Users/jameslo-aa/ngo_going_out/data/ngo_database_export_20260113_143422.xlsx /Users/jameslo-aa/ngo_going_out/archive/data/
mv /Users/jameslo-aa/ngo_going_out/data/ngo_database_export_20260113_143721.xlsx /Users/jameslo-aa/ngo_going_out/archive/data/
mv /Users/jameslo-aa/ngo_going_out/data/ngo_database_export_20260113_145427.xlsx /Users/jameslo-aa/ngo_going_out/archive/data/
```

### Archive Obsolete Tools
```bash
# Python tools
mv /Users/jameslo-aa/ngo_going_out/tools/import_from_excel.py /Users/jameslo-aa/ngo_going_out/archive/tools/
mv /Users/jameslo-aa/ngo_going_out/tools/import_from_excel_direct.py /Users/jameslo-aa/ngo_going_out/archive/tools/
mv /Users/jameslo-aa/ngo_going_out/tools/excel_to_csv.py /Users/jameslo-aa/ngo_going_out/archive/tools/
mv /Users/jameslo-aa/ngo_going_out/tools/excel_to_csv_corrected.py /Users/jameslo-aa/ngo_going_out/archive/tools/
mv /Users/jameslo-aa/ngo_going_out/tools/reimport_from_excel.py /Users/jameslo-aa/ngo_going_out/archive/tools/
mv /Users/jameslo-aa/ngo_going_out/tools/import_missing_orgs.py /Users/jameslo-aa/ngo_going_out/archive/tools/
mv /Users/jameslo-aa/ngo_going_out/tools/check_null_fields.py /Users/jameslo-aa/ngo_going_out/archive/tools/
mv /Users/jameslo-aa/ngo_going_out/tools/sample_comparison.py /Users/jameslo-aa/ngo_going_out/archive/tools/
mv /Users/jameslo-aa/ngo_going_out/tools/json_to_excel.py /Users/jameslo-aa/ngo_going_out/archive/tools/

# JavaScript tools
mv /Users/jameslo-aa/ngo_going_out/tools/import_orgs.js /Users/jameslo-aa/ngo_going_out/archive/tools/
mv /Users/jameslo-aa/ngo_going_out/tools/fill_missing_fields.js /Users/jameslo-aa/ngo_going_out/archive/tools/
mv /Users/jameslo-aa/ngo_going_out/tools/normalize-date-formats.js /Users/jameslo-aa/ngo_going_out/archive/tools/
mv /Users/jameslo-aa/ngo_going_out/tools/restore_logo_urls.js /Users/jameslo-aa/ngo_going_out/archive/tools/
```

---

## 📝 File Naming Conventions

### Database Exports
- Format: `ngo_database_export_YYYYMMDD_HHMMSS.xlsx`
- Example: `ngo_database_export_20260113_152157.xlsx`
- Keep only: Latest production export
- Archive: All older exports

### Tool Scripts
- Import scripts: `import_*.py` or `import_*.js`
- Export scripts: `export_*.py`
- Analysis scripts: `analyze_*.py`, `check_*.py`, `compare_*.py`
- One-time fixes: Descriptive name (e.g., `import_missing_orgs.py`)

---

## 🔍 Regular Maintenance Tasks

### Weekly
- [ ] Run `clean_text_fields.py` to ensure data quality
- [ ] Run `analyze_data_completeness.py` to check for data gaps
- [ ] Export database and verify export file size (should be ~190-200K)

### After Major Updates
- [ ] Export database with timestamp
- [ ] Run data completeness analysis
- [ ] Archive old exports (keep only latest 2)
- [ ] Update this documentation

### Monthly
- [ ] Review archived files older than 90 days for deletion
- [ ] Verify backup integrity
- [ ] Update tool documentation

---

## 📊 File Size References

**Expected file sizes:**
- Original Excel: ~44MB (contains embedded images)
- Database exports: ~190-200KB (text data only, logo URLs)
- Import scripts: ~7-10KB
- Export scripts: ~5-6KB
- Analysis scripts: ~3-7KB

**Alerts:**
- If export size drops below 180KB → Data loss investigation needed
- If export size exceeds 250KB → Check for data duplication

---

## 🚨 Important Notes

1. **NEVER delete** `4_NGO going out_RA_project 614.xlsx` - it's the source of truth
2. **Keep only the latest** database export in `/data/`, archive older ones
3. **Archive, don't delete** old tools - they document the problem-solving process
4. **Test scripts** after modifications before running on production database
5. **Always backup** before running UPDATE or DELETE operations

---

## 📚 Related Documentation

- `DATABASE_IMPROVEMENT_COMPLETION_REPORT.md` - Column structure and date format fixes
- `TEXT_DATA_FIX_COMPLETION_REPORT.md` - Text truncation and newline parsing fixes
- `VALIDATION_REPORT.md` - Initial data validation findings
- `DATA_COMPLETENESS_REPORT.md` - Data quality analysis

---

**Last Updated**: 2026-01-13 15:45
**Updated By**: Database Maintenance Script
**Next Review**: 2026-01-20
