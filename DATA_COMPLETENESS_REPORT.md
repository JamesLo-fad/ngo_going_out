# Data Completeness Analysis Report

**Date**: 2026-01-13
**Database**: ngo_going_out (Production)
**Source**: 4_NGO going out_RA_project 614.xlsx

---

## Executive Summary

**CRITICAL FINDINGS**: Significant data loss detected during import process.

- **Excel Records**: 439
- **Database Records**: 439 ✓
- **Excel Columns**: 38
- **Database Fields**: 29

**Data Loss Summary**:
- **3 fields completely empty** (0% data): `disclosed_online`, `disclosed_continuous`, `go_out_level`
- **2 fields severely incomplete** (<5% data): `donation_pre_year`, `donation_post`
- **1 field critically incomplete** (6% data): `capital_type`
- **Multiple fields with 30-60% data loss**

---

## Root Causes Identified

### 1. **Import Script Excludes Fields** ⚠️ CRITICAL

**File**: `tools/import_orgs.js` (line 127)

**Comment in code**:
```javascript
// Upsert org (production schema - without donation_post_year, disclosed_online,
// disclosed_continuous, go_out_level, logo_url)
```

**Problem**: The INSERT statement intentionally excludes these 5 fields:
- `donation_post_year` - NOT in INSERT statement
- `disclosed_online` - NOT in INSERT statement
- `disclosed_continuous` - NOT in INSERT statement
- `go_out_level` - NOT in INSERT statement
- `logo_url` - NOT in INSERT statement

**BUT**: The database schema DOES have these fields (verified via PRAGMA table_info).

**Result**: These fields are parsed from Excel but never inserted into database.

---

### 2. **cleanValue() Function Converts Valid Data to NULL** ⚠️ MAJOR

**File**: `tools/helpers.js` (line 30-35)

```javascript
export function cleanValue(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (s === '' || s === '-' || s.toLowerCase() === 'null') return null;
  return s;
}
```

**Problem**: The function converts `'——'` (Chinese dash) to NULL because it contains `-`.

**Examples from Excel**:
- `资本类型`: Many cells contain `'——'` → converted to NULL
- `出海时间`: Some cells contain `'——'` → converted to NULL

**Impact**:
- `capital_type`: 414 records lost (94% data loss)
- `go_global_date`: 170 records lost (39% data loss)
- Many other fields affected

---

### 3. **Date Format Normalization** ℹ️ MINOR

**Issue**: Date formats differ between Excel and database.

**Example**:
- Excel: `'2009年'` (no space)
- Database: `'2009 年'` (with space)

**Cause**: The date normalization script (`tools/normalize-date-formats.js`) was run after import.

**Impact**: Minor - data is present but format differs.

---

## Detailed Field-by-Field Analysis

| Excel Column | DB Field | Excel Non-Null | DB Non-Null | Loss | Loss % | Status |
|-------------|----------|----------------|-------------|------|--------|--------|
| 编号 | id | 439 | 439 | 0 | 0% | ✓ OK |
| 组织名称 | org_name | 439 | 439 | 0 | 0% | ✓ OK |
| 中促会 | in_cnie | 439 | 439 | 0 | 0% | ✓ OK |
| 民促会 | in_cace | 439 | 439 | 0 | 0% | ✓ OK |
| 联合国 | in_un | 439 | 439 | 0 | 0% | ✓ OK |
| 成立时间 | founded_date | 439 | 432 | -7 | 2% | ⚠️ Minor loss |
| 出海时间 | go_global_date | 435 | 265 | -170 | 39% | ⚠️ Major loss |
| 领导人 | leaders | 439 | 418 | -21 | 5% | ⚠️ Minor loss |
| 重要员工 | key_staff | 439 | 268 | -171 | 39% | ⚠️ Major loss |
| **资本类型** | **capital_type** | **439** | **25** | **-414** | **94%** | **🔴 CRITICAL** |
| 注册地 | reg_location | 439 | 433 | -6 | 1% | ⚠️ Minor loss |
| 注册形式 | reg_type | 439 | 428 | -11 | 3% | ⚠️ Minor loss |
| **捐赠金额（出海前）标注年份** | **donation_pre_year** | **439** | **6** | **-433** | **99%** | **🔴 CRITICAL** |
| **捐赠金额（出海后）** | **donation_post** | **439** | **10** | **-429** | **98%** | **🔴 CRITICAL** |
| 官网的组织理念 | mission | 439 | 416 | -23 | 5% | ⚠️ Minor loss |
| 组织结构（参考年报） | org_structure | 439 | 277 | -162 | 37% | ⚠️ Major loss |
| 是否有独立的海外办公室 | has_overseas_office | 439 | 411 | -28 | 6% | ⚠️ Minor loss |
| 官网关于海外项目的组织理念 | overseas_mission | 439 | 305 | -134 | 31% | ⚠️ Major loss |
| 海外项目的名称 | overseas_projects | 438 | 348 | -90 | 21% | ⚠️ Moderate loss |
| 海外涉及的地区 | overseas_regions | 439 | 324 | -115 | 26% | ⚠️ Moderate loss |
| 海外服务内容 | overseas_services | 439 | 353 | -86 | 20% | ⚠️ Moderate loss |
| 服务形式 | service_mode | 439 | 352 | -87 | 20% | ⚠️ Moderate loss |
| 主要成员是否有官方背景 | has_official_background | 439 | 400 | -39 | 9% | ⚠️ Minor loss |
| 主要信息来源 | sources | 439 | 430 | -9 | 2% | ⚠️ Minor loss |
| **是否有网上披露** | **disclosed_online** | **439** | **0** | **-439** | **100%** | **🔴 NOT IMPORTED** |
| **是否持续性披露** | **disclosed_continuous** | **439** | **0** | **-439** | **100%** | **🔴 NOT IMPORTED** |
| **走出去程度** | **go_out_level** | **439** | **0** | **-439** | **100%** | **🔴 NOT IMPORTED** |

---

## Fields Not in Database

### Excel Column Not Mapped:
- **官网LOGO或图片** (380 non-empty values in Excel)
  - This is mapped to `logo_url` in the import script
  - But `logo_url` is NOT included in the INSERT statement
  - Result: Logo URLs from Excel are lost

### Database Field Not in Excel:
- **donation_pre** (6 non-empty values in database)
  - This field exists in database but has no corresponding Excel column
  - Values may have been manually added or from a different source

---

## Sample Record Comparison

### Organization ID: 10 (中国红十字基金会)

| Field | Excel Value | Database Value | Match |
|-------|-------------|----------------|-------|
| 资本类型 | `'——'` | `NULL` | ✗ Lost due to cleanValue() |
| 出海时间 | `'2017年'` | `'2017 年'` | ✗ Format difference |
| 是否有网上披露 | `'是'` | `NULL` | ✗ Not imported |
| 是否持续性披露 | `'否'` | `NULL` | ✗ Not imported |
| 走出去程度 | `'海外项目'` | `NULL` | ✗ Not imported |

---

## Recommendations

### 🔴 CRITICAL - Immediate Action Required

1. **Fix Import Script to Include All Fields**

   **File**: `tools/import_orgs.js`

   **Change**: Update INSERT statement to include:
   ```javascript
   INSERT INTO orgs (
     ...,
     disclosed_online, disclosed_continuous, go_out_level, logo_url
   )
   ```

   **Impact**: Will restore 100% of data for these 4 fields

2. **Fix cleanValue() Function**

   **File**: `tools/helpers.js`

   **Problem**: `'——'` (Chinese dash) is being converted to NULL

   **Options**:
   - Option A: Don't treat `'——'` as empty (keep it as-is)
   - Option B: Convert `'——'` to NULL but document this as intentional
   - Option C: Add a separate function for fields where `'——'` should be preserved

   **Recommendation**: Option A - preserve `'——'` as a valid value indicating "not applicable"

### ⚠️ HIGH PRIORITY

3. **Re-import Data After Fixes**

   ```bash
   # After fixing import script
   export D1_DB_NAME=ngo_going_out
   node tools/import_orgs.js data/orgs_clean.csv --mode=replace
   ```

   **Expected Result**: All 439 records with complete data

4. **Add Data Validation**

   - Add checks to verify data completeness after import
   - Run `tools/analyze_data_completeness.py` after each import
   - Alert if any field has >10% data loss

### ℹ️ MEDIUM PRIORITY

5. **Document Data Cleansing Rules**

   - Create clear documentation of what values are considered "empty"
   - Document the difference between NULL and `'——'`
   - Add examples to help future maintainers

6. **Consider Separate Cleansing for Different Field Types**

   - Text fields: Keep `'——'` as-is
   - Numeric fields: Convert `'——'` to NULL
   - Boolean fields: Already handled by `parseYesNo()`

---

## Verification Steps

After fixing and re-importing:

1. **Run completeness analysis**:
   ```bash
   python3 tools/analyze_data_completeness.py
   ```

2. **Check critical fields**:
   ```bash
   npx wrangler d1 execute ngo_going_out --remote --command="
   SELECT
     COUNT(*) as total,
     COUNT(disclosed_online) as has_disclosed_online,
     COUNT(disclosed_continuous) as has_disclosed_continuous,
     COUNT(go_out_level) as has_go_out_level,
     COUNT(logo_url) as has_logo_url,
     COUNT(capital_type) as has_capital_type
   FROM orgs
   "
   ```

3. **Expected results**:
   - `disclosed_online`: 439 (100%)
   - `disclosed_continuous`: 439 (100%)
   - `go_out_level`: ~439 (most records)
   - `logo_url`: ~380 (from Excel)
   - `capital_type`: ~439 (most records, not just 25)

---

## Conclusion

**Current State**: ❌ Data is NOT correct

**Issues Found**:
1. 🔴 3 fields completely missing (not imported)
2. 🔴 1 field with 94% data loss (capital_type)
3. 🔴 2 fields with 98-99% data loss (donation fields)
4. ⚠️ Multiple fields with 20-40% data loss

**Root Causes**:
1. Import script intentionally excludes 5 fields
2. cleanValue() function too aggressive with `'——'`

**Action Required**:
- Fix import script
- Fix cleanValue() function
- Re-import data
- Verify completeness

**Estimated Time to Fix**: 30-60 minutes

---

**Report Generated**: 2026-01-13
**Analysis Tool**: `tools/analyze_data_completeness.py`
**Database**: ngo_going_out (Production)
