#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CSV cleaner for D1 ingestion
- Input: orgs.csv, policies.csv (UTF-8)
- Output: orgs_clean.csv, policies_clean.csv
- No third-party deps.

What it does (summary):
1) orgs.csv
   - Fix header accidental empty columns after donation year columns.
   - Normalize booleans: 是/否/1/0/—— -> 1/0/NULL.
   - Normalize dates to YYYY-MM-DD where possible; keep year-only when only year is present.
   - Normalize currency numbers: strip ￥ and commas; keep numeric string, leave empty as NULL.
   - Standardize enumerations for 服务形式 and 走出去程度.
   - Trim whitespace; replace "——" with empty.
   - Ensure proper CSV quoting for commas/newlines.

2) policies.csv
   - Normalize 发布时期 to YYYY-MM-DD.
   - Standardize 属性 (optional lightweight mapping) without breaking original text.
   - Clean 发布单位 empty dashes "-" to empty.
   - Remove blank rows at tail.
   - Leave links intact.

Usage:
  python3 cleaner.py
"""

import csv
import re
from datetime import datetime
from pathlib import Path

INPUT_ORGS = Path("orgs.csv")
INPUT_POLICIES = Path("policies.csv")
OUTPUT_ORGS = Path("orgs_clean.csv")
OUTPUT_POLICIES = Path("policies_clean.csv")

# --------- Helpers ---------

def strip_space(val):
    if val is None:
        return ""
    return str(val).strip()

def is_blank(val):
    return strip_space(val) == ""

def nullify(val):
    """Turn placeholders like —— and empty into empty string (treated as NULL by loader)."""
    s = strip_space(val)
    if s in ("——", "-", "—", "--", "— —", "— — —"):
        return ""
    return s

def normalize_boolean(val):
    """
    Map common Chinese/number booleans to '1' or '0'.
    Return '' for unknown/empty.
    """
    s = nullify(val)
    if s == "":
        return ""
    s_norm = s.replace("（", "(").replace("）", ")")
    truthy = {"是", "1", "true", "True", "YES", "yes", "y"}
    falsy = {"否", "0", "false", "False", "NO", "no", "n"}
    if s_norm in truthy:
        return "1"
    if s_norm in falsy:
        return "0"
    # Sometimes value is numeric '1' or '0' already
    if s_norm in ("1", "0"):
        return s_norm
    # Fallback: leave as is (but most schemas prefer 1/0)
    return s

def normalize_date(val):
    """
    Try to normalize assorted date formats to YYYY-MM-DD.
    Heuristics:
      - If only a year like '2014年' or '2014', return '2014'
      - If formats like '1985——4——1' or '2004——12——1', turn into 1985-04-01
      - If '7/10/1905' assume M/D/YYYY (common in data), return 1905-07-10
      - If '2014 年 6 月 22 日' -> 2014-06-22
      - If '2009年' -> 2009
      - If '——' or empty -> ''
    """
    s = nullify(val)
    if s == "":
        return ""
    s = s.strip()

    # Year-only like '2009年' or '2009'
    m_year = re.fullmatch(r"\s*(\d{4})\s*年?\s*$", s)
    if m_year:
        return m_year.group(1)

    # Chinese year/month/day variants e.g. '2014 年 6 月 22 日'
    s_c = re.sub(r"[^\d/\- ]", " ", s)  # keep digits and separators; remove Chinese chars
    s_c = re.sub(r"\s+", " ", s_c).strip()

    # Replace multi dashes like '1985——4——1' -> '1985-4-1'
    s_c = s_c.replace("——", "-").replace("—", "-")
    s_c = s_c.replace("  ", " ")

    # Try ISO-like Y-M-D (with possible spaces)
    # Normalize separators
    s_c = s_c.replace(" / ", "/").replace(" - ", "-").replace(" /", "/").replace("/ ", "/").replace(" -", "-").replace("- ", "-")

    # Try several parse patterns
    patterns = [
        ("%Y-%m-%d", r"\d{4}-\d{1,2}-\d{1,2}"),
        ("%Y/%m/%d", r"\d{4}/\d{1,2}/\d{1,2}"),
        ("%m/%d/%Y", r"\d{1,2}/\d{1,2}/\d{4}"),
        ("%Y-%m", r"\d{4}-\d{1,2}"),
        ("%Y/%m", r"\d{4}/\d{1,2}")
    ]

    def to_iso(dt, had_day=True):
        if had_day:
            return dt.strftime("%Y-%m-%d")
        else:
            return dt.strftime("%Y-%m")

    for fmt, rx in patterns:
        if re.fullmatch(rx, s_c):
            try:
                dt = datetime.strptime(s_c, fmt)
                # If fmt lacks day, return YYYY-MM else YYYY-MM-DD
                had_day = ("%d" in fmt)
                return to_iso(dt, had_day=had_day)
            except Exception:
                pass

    # Try to split custom 'YYYY-M-D' with extra dashes
    parts = re.split(r"[-/ ]+", s_c)
    parts = [p for p in parts if p]
    # If looks like Y, M, D
    if len(parts) >= 3 and parts[0].isdigit() and len(parts[0]) == 4:
        try:
            y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
            return f"{y:04d}-{m:02d}-{d:02d}"
        except Exception:
            pass

    # As a last resort, return the original trimmed value
    return s

def normalize_currency(val):
    """
    Convert currency like '￥87,646,513.86 ' -> '87646513.86'
    If empty/placeholder -> ''
    """
    s = nullify(val)
    if s == "":
        return ""
    s = s.replace("人民币", "").replace("CNY", "")
    s = s.replace("￥", "").replace(",", "").strip()
    # Some cells might have non-numeric like '——'
    if re.fullmatch(r"-?\d+(\.\d+)?", s):
        return s
    # if contains year by mistake, leave empty
    return s if re.search(r"\d", s) else ""

def normalize_enum_service(val):
    """
    服务形式 normalization:
      - '直接服务' -> 'direct'
      - '间接服务' -> 'indirect'
      - '直接和间接服务' or variants -> 'both'
    Fallback: return original.
    """
    s = nullify(val)
    if s == "":
        return ""
    base = s.replace("、", "").replace("和", "").strip()
    if "直接" in base and "间接" in base:
        return "both"
    if "直接" in base:
        return "direct"
    if "间接" in base:
        return "indirect"
    return s

def normalize_enum_go_out(val):
    """
    走出去程度 normalization:
      - 海外注册 -> overseas_registered
      - 海外项目 -> overseas_projects
      - 海外交流访问 -> overseas_exchange
    Fallback: original.
    """
    s = nullify(val)
    if s == "":
        return ""
    mapping = {
        "海外注册": "overseas_registered",
        "海外项目": "overseas_projects",
        "海外交流访问": "overseas_exchange"
    }
    return mapping.get(s, s)

def normalize_attribute(val):
    """
    policies.csv 属性 (light standardization, non-destructive):
      - 批复公示 -> 批复
      - For titles containing 法/办法/条例/规划/意见 -> map accordingly if 属性==政策意见
    """
    s = nullify(val)
    if s == "":
        return ""
    if s == "批复公示":
        return "批复"
    if s == "政策意见":
        # Keep original unless we can confidently refine by title at callsite
        return "政策文件"
    return s

def parse_csv_rows(file_path):
    with file_path.open("r", encoding="utf-8", newline="") as f:
        # Use csv.Sniffer? Skip; we assume comma, UTF-8
        reader = csv.reader(f)
        rows = list(reader)
    return rows

def write_csv_rows(file_path, header, rows):
    with file_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        for r in rows:
            writer.writerow(r)

# --------- Orgs cleaner ---------

def clean_orgs():
    if not INPUT_ORGS.exists():
        print(f"[orgs] Skipped: {INPUT_ORGS} not found")
        return

    rows = parse_csv_rows(INPUT_ORGS)
    if not rows:
        print("[orgs] Empty file")
        return

    raw_header = rows[0]
    data_rows = rows[1:]

    # Fix header accidental empty columns:
    # The original header contains: ... 捐赠金额（出海前）标注年份,,捐赠金额（出海后）,,官网的组织理念 ...
    # Remove empty header names to enforce consistent schema.
    cleaned_header = []
    drop_indices = []
    for i, h in enumerate(raw_header):
        if strip_space(h) == "":
            # mark for drop
            drop_indices.append(i)
        else:
            cleaned_header.append(h)

    # Build index mapping
    keep_indices = [i for i in range(len(raw_header)) if i not in drop_indices]

    # Column name hints (we’ll try best-effort normalization by name)
    name_map = {
        "成立时间": "成立时间",
        "出海时间": "出海时间",
        "捐赠金额（出海前）标注年份": "捐赠金额（出海前）标注年份",
        "捐赠金额（出海后）": "捐赠金额（出海后）",
        "是否有独立的海外办公室——组织结构": "是否有独立的海外办公室——组织结构",
        "是否有网上披露": "是否有网上披露",
        "是否持续性披露": "是否持续性披露",
        "服务形式": "服务形式",
        "走出去程度": "走出去程度",
        "捐赠金额（出海前）": "捐赠金额（出海前）",  # if present
    }

    # Clean each row
    out_rows = []
    for r in data_rows:
        # Align columns by dropping accidental empties to match cleaned_header
        aligned = [r[i] if i < len(r) else "" for i in keep_indices]
        # Trim and nullify placeholders
        aligned = [nullify(c) for c in aligned]

        # Build dict for easier per-field normalization
        row = dict(zip(cleaned_header, aligned))

        # Normalize date-like fields
        for col in ("成立时间", "出海时间"):
            if col in row:
                row[col] = normalize_date(row[col])

        # Normalize donation numeric fields (amounts) — detect typical column names
        for col in list(row.keys()):
            if "捐赠金额" in col and "年份" not in col:
                row[col] = normalize_currency(row[col])

        # Normalize year columns (like 2008年) for 标注年份 and similar
        for col in list(row.keys()):
            if "年份" in col:
                v = row[col]
                mv = re.fullmatch(r"\s*(\d{4})\s*年?\s*$", v)
                row[col] = mv.group(1) if mv else normalize_date(v)

        # Normalize booleans
        for col in ("中促会", "民促会", "联合国", "是否有独立的海外办公室——组织结构", "是否有网上披露", "是否持续性披露"):
            if col in row:
                row[col] = normalize_boolean(row[col])

        # Normalize service form and go-out degree
        if "服务形式" in row:
            row["服务形式"] = normalize_enum_service(row["服务形式"])
        if "走出去程度" in row:
            row["走出去程度"] = normalize_enum_go_out(row["走出去程度"])

        # Trim all fields again
        for k in list(row.keys()):
            row[k] = strip_space(row[k])

        # Return to list in header order
        out_rows.append([row.get(h, "") for h in cleaned_header])

    write_csv_rows(OUTPUT_ORGS, cleaned_header, out_rows)
    print(f"[orgs] Wrote {OUTPUT_ORGS} (rows: {len(out_rows)})")

# --------- Policies cleaner ---------

def normalize_policy_date(s):
    return normalize_date(s)

def clean_policies():
    if not INPUT_POLICIES.exists():
        print(f"[policies] Skipped: {INPUT_POLICIES} not found")
        return

    rows = parse_csv_rows(INPUT_POLICIES)
    if not rows:
        print("[policies] Empty file")
        return

    header = rows[0]
    data = rows[1:]

    # Ensure standard columns exist (pass-through others)
    # Expected header: No., 发布时期, 题目, 属性, 发布单位（部委）1..4, 链接
    # We'll just operate by names if present.
    cols = {name: i for i, name in enumerate(header)}

    out_rows = []
    kept = 0

    for r in data:
        # Skip completely empty lines
        if all(is_blank(c) for c in r):
            continue

        # Make sure row length matches header length
        if len(r) < len(header):
            r = r + [""] * (len(header) - len(r))
        elif len(r) > len(header):
            r = r[:len(header)]

        row = {h: strip_space(r[i]) for i, h in enumerate(header)}

        # Clean common placeholders
        for k in row:
            row[k] = nullify(row[k])

        # Normalize date
        if "发布时期" in row:
            row["发布时期"] = normalize_policy_date(row["发布时期"])

        # 属性 light normalization
        if "属性" in row:
            row["属性"] = normalize_attribute(row["属性"])

        # 发布单位 dashes -> empty
        for k in list(row.keys()):
            if k.startswith("发布单位"):
                if row[k] == "-":
                    row[k] = ""

        # Keep rows that at least have a title or link
        if is_blank(row.get("题目", "")) and is_blank(row.get("链接", "")):
            continue

        out_rows.append([row.get(h, "") for h in header])
        kept += 1

    write_csv_rows(OUTPUT_POLICIES, header, out_rows)
    print(f"[policies] Wrote {OUTPUT_POLICIES} (rows: {kept})")

def main():
    clean_orgs()
    clean_policies()
    print("Done.")

if __name__ == "__main__":
    main()