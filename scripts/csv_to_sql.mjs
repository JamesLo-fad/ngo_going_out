// scripts/csv_to_sql.mjs
// Convert CSV to SQL INSERTs for Cloudflare D1 (SQLite) WITHOUT BEGIN/COMMIT.
// Adds strict type coercion for numeric/boolean fields to avoid SQLITE_MISMATCH.

import fs from "node:fs";
import path from "node:path";

// ---------- CSV parsing ----------
function splitCSVLine(line) {
  const res = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      res.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  res.push(cur);
  return res.map((s) => s.trim());
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = splitCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    if (cols.length === 1 && cols[0] === "") continue;
    rows.push(cols);
  }
  return { headers, rows };
}

// ---------- Value cleaners ----------
function cleanBoolean(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().toLowerCase();
  if (s === "" || s === "null" || s === "na" || s === "n/a" || s === "—" || s === "-") return null;
  if (["1","true","yes","y","是"].includes(s)) return 1;
  if (["0","false","no","n","否"].includes(s)) return 0;
  // fallback: if numeric-looking 0/1
  if (/^-?\d+$/.test(s)) return Number(s) ? 1 : 0;
  return null;
}

function cleanNumber(v) {
  if (v === null || v === undefined) return null;
  let s = String(v).trim();
  if (s === "" || s === "null" || s.toLowerCase() === "na" || s.toLowerCase() === "n/a" || s === "—" || s === "-") return null;
  // remove currency symbols and thousands separators
  s = s.replace(/[￥¥$,]/g, "");
  // normalize unicode minus
  s = s.replace(/\u2212/g, "-");
  // sometimes have trailing % or text; if so, cannot be numeric
  if (!/^[-+]?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function cleanInteger(v) {
  const n = cleanNumber(v);
  if (n === null) return null;
  return Math.trunc(n);
}

function normalizeDate(s) {
  if (!s) return s;
  let t = String(s).trim();
  t = t.replace(/——/g, "-").replace(/[年\/]/g, "-").replace(/月/g, "-").replace(/日/g, "");
  t = t.replace(/-+/g, "-").replace(/-$/, "");
  return t;
}

function escStr(val) {
  if (val === null || val === undefined) return "NULL";
  const s = String(val);
  if (s === "") return "NULL";
  return `'${s.replace(/'/g, "''")}'`;
}

function sqlVal(value, type) {
  // type: "int" | "real" | "bool" | "text" | "date"
  if (type === "int") {
    const v = cleanInteger(value);
    return v === null ? "NULL" : String(v);
  }
  if (type === "real") {
    const v = cleanNumber(value);
    return v === null ? "NULL" : String(v);
  }
  if (type === "bool") {
    const v = cleanBoolean(value);
    return v === null ? "NULL" : String(v);
  }
  if (type === "date") {
    const v = normalizeDate(value);
    return v ? escStr(v) : "NULL";
  }
  // text
  return escStr(value);
}

// ---------- Generators ----------
function makeInsertOrgs(headers, rows) {
  const cols = [
    ["id","int"],
    ["org_name","text"],                 // required
    ["in_cnie","bool"],
    ["in_cace","bool"],
    ["in_un","bool"],
    ["founded_date","date"],
    ["go_global_date","date"],
    ["leaders","text"],
    ["key_staff","text"],
    ["capital_type","text"],
    ["reg_location","text"],
    ["reg_type","text"],
    ["donation_pre","real"],
    ["donation_pre_year","text"],
    ["donation_post","real"],
    ["mission","text"],
    ["org_structure","text"],
    ["has_overseas_office","bool"],
    ["overseas_mission","text"],
    ["overseas_projects","text"],
    ["overseas_regions","text"],
    ["overseas_services","text"],
    ["service_mode","text"],
    ["has_official_background","bool"],
    ["sources","text"],
    ["disclosed_online","bool"],
    ["disclosed_continuous","bool"],
    ["go_out_level","text"],
    ["logo_url","text"],
  ];

  const pos = cols.map(([name]) => headers.indexOf(name));
  const nameIdx = headers.indexOf("org_name");

  let sql = "";
  let skipped = 0;

  for (const r of rows) {
    const orgNameRaw = nameIdx >= 0 ? r[nameIdx] : null;
    const orgName = (orgNameRaw ?? "").trim();
    if (!orgName) {
      skipped++;
      continue; // skip rows with empty org_name
    }

    const vals = pos.map((idx, i) => {
      const [, type] = cols[i];
      const raw = idx >= 0 ? r[idx] : null;
      return sqlVal(raw, type);
    });
    const colNames = cols.map(([name]) => name).join(", ");
    sql += `INSERT OR REPLACE INTO orgs (${colNames}) VALUES (${vals.join(", ")});\n`;
  }

  if (skipped) {
    console.log(`[csv_to_sql] Skipped ${skipped} rows due to empty org_name.`);
  }
  return sql;
}

function makeInsertPolicies(headers, rows) {
  const cols = [
    ["id","int"],
    ["published_date","text"],
    ["title","text"],
    ["doc_type","text"],
    ["issuer_1","text"],
    ["issuer_2","text"],
    ["issuer_3","text"],
    ["issuer_4","text"],
    ["link","text"],
  ];
  const pos = cols.map(([name]) => headers.indexOf(name));

  let sql = "";
  for (const r of rows) {
    const vals = pos.map((idx, i) => {
      const [, type] = cols[i];
      const raw = idx >= 0 ? r[idx] : null;
      return sqlVal(raw, type);
    });
    const colNames = cols.map(([name]) => name).join(", ");
    sql += `INSERT OR REPLACE INTO policies (${colNames}) VALUES (${vals.join(", ")});\n`;
  }
  return sql;
}

// ---------- Main ----------
const [,, table, inputCsv, outputSql] = process.argv;
if (!table || !inputCsv || !outputSql) {
  console.error("Usage: node scripts/csv_to_sql.mjs <orgs|policies> <input.csv> <output.sql>");
  process.exit(1);
}

const csvPath = path.resolve(inputCsv);
const outPath = path.resolve(outputSql);

if (!fs.existsSync(csvPath)) {
  console.error(`CSV not found: ${csvPath}`);
  process.exit(1);
}

const text = fs.readFileSync(csvPath, "utf8");
const { headers, rows } = parseCSV(text);
if (!headers.length) {
  console.error("CSV has no header row.");
  process.exit(1);
}

let sql;
if (table === "orgs") {
  sql = makeInsertOrgs(headers, rows);
} else if (table === "policies") {
  sql = makeInsertPolicies(headers, rows);
} else {
  console.error("First arg must be 'orgs' or 'policies'.");
  process.exit(1);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, sql, "utf8");
console.log(`Wrote ${rows.length} rows to ${outPath}`);