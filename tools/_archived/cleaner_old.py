#!/usr/bin/env python3
import csv
from pathlib import Path

INPUT_ORGS = Path("../data/orgs.csv")
INPUT_POLICIES = Path("../data/policies.csv")
OUTPUT_ORGS = Path("../data/orgs_clean.csv")
OUTPUT_POLICIES = Path("../data/policies_clean.csv")

# Mapping Chinese headers to English snake_case
CN2EN_ORGS = {
  "编号":"id","组织名称":"org_name","中促会":"in_cnie","民促会":"in_cace","联合国":"in_un",
  "成立时间":"founded_date","出海时间":"go_global_date","领导人":"leaders","重要员工":"key_staff",
  "资本类型":"capital_type","注册地":"reg_location","注册形式":"reg_type",
  "捐赠金额（出海前）":"donation_pre","捐赠金额（出海前）标注年份":"donation_pre_year",
  "捐赠金额（出海后）":"donation_post","官网的组织理念":"mission","组织结构（参考年报）":"org_structure",
  "是否有独立的海外办公室——组织结构":"has_overseas_office",
  "官网关于海外项目的组织理念——目标":"overseas_mission","海外项目的名称":"overseas_projects",
  "海外涉及的地区":"overseas_regions","海外服务内容":"overseas_services","服务形式":"service_mode",
  "主要成员是否有官方背景":"has_official_background","主要信息来源":"sources",
  "是否有网上披露":"disclosed_online","是否持续性披露":"disclosed_continuous","走出去程度":"go_out_level",
  "logo": "logo_url", "Logo":"logo_url","LOGO":"logo_url","logo_url":"logo_url"
}

CN2EN_POLICIES = {
  "No.":"id","发布时期":"published_date","题目":"title","属性":"doc_type",
  "发布单位（部委）1":"issuer_1","发布单位（部委）2":"issuer_2",
  "发布单位（部委）3":"issuer_3","发布单位（部委）4":"issuer_4","链接":"link"
}

# Robust CSV reader: optionally skip preface lines before the real header
def read_rows(path, expect_headers=None):
  text = path.read_text(encoding="utf-8", errors="replace")
  lines = text.splitlines()
  # If we know expected header columns for policies, try to locate the header row
  start_idx = 0
  if expect_headers:
    # try to find a line whose comma-split starts with those headers (subset match)
    for i, line in enumerate(lines):
      cols = [c.strip() for c in line.split(",")]
      # We only need to check presence for the first few known keys
      # For policies: ["No.", "发布时期", "题目", "属性", "发布单位（部委）1", "链接" ...]
      # Do a weak check: must contain "No." and "发布时期" and "题目"
      if ("No." in cols) and ("发布时期" in cols) and ("题目" in cols):
        start_idx = i
        break
  # Now parse from the detected header
  from io import StringIO
  sliced = "\n".join(lines[start_idx:])
  f = StringIO(sliced)
  reader = csv.DictReader(f)
  rows = list(reader)
  return reader.fieldnames or [], rows

def write_rows(path, fieldnames, rows):
  path.parent.mkdir(parents=True, exist_ok=True)
  with path.open("w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    for r in rows:
      writer.writerow(r)

def normalize_bool(v):
  if v is None: return ""
  s = str(v).strip().lower()
  if s in ("1","true","yes","是","有","y"): return 1
  if s in ("0","false","no","否","无","n"): return 0
  return ""

def process_orgs():
  header, rows = read_rows(INPUT_ORGS)
  required = ["id","org_name","in_cnie","in_cace","in_un","founded_date","go_global_date","leaders","key_staff","capital_type","reg_location","reg_type","donation_pre","donation_pre_year","donation_post","mission","org_structure","has_overseas_office","overseas_mission","overseas_projects","overseas_regions","overseas_services","service_mode","has_official_background","sources","disclosed_online","disclosed_continuous","go_out_level","logo_url"]
  out_rows = []
  for row in rows:
    out = {k:"" for k in required}
    for src_key, val in row.items():
      dst_key = CN2EN_ORGS.get(src_key, src_key)
      if dst_key in out:
        out[dst_key] = val.strip() if isinstance(val, str) else val
    # Normalize booleans
    for b in ("in_cnie","in_cace","in_un","has_overseas_office","has_official_background","disclosed_online","disclosed_continuous"):
      out[b] = normalize_bool(out.get(b))
    out_rows.append(out)
  write_rows(OUTPUT_ORGS, required, out_rows)

def process_policies():
  # Pass expected headers hint so we skip the preface line
  header, rows = read_rows(INPUT_POLICIES, expect_headers=True)
  required = ["id","published_date","title","doc_type","issuer_1","issuer_2","issuer_3","issuer_4","link"]
  out_rows = []
  for row in rows:
    out = {k:"" for k in required}
    # Map headers
    for src_key, val in row.items():
      dst_key = CN2EN_POLICIES.get(src_key, src_key)
      if dst_key in out:
        out[dst_key] = val.strip() if isinstance(val, str) else val
    # 跳过完全空白的一行（防止生成全空记录）
    if all((str(v).strip() == "" for v in out.values())):
      continue
    out_rows.append(out)
  write_rows(OUTPUT_POLICIES, required, out_rows)

if __name__ == "__main__":
  process_orgs()
  process_policies()
  print("Wrote:", OUTPUT_ORGS, OUTPUT_POLICIES)
