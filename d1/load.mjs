// d1/load.mjs
// Usage: node d1/load.mjs dev|prod
// Requires: orgs_clean.csv and policies_clean.csv in ./data/

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const env = process.argv[2] || "dev";
const db = env === "prod" ? "ngo_going_out" : "ngo_going_out_dev";

function csvParse(text) {
  // very simple CSV parser for non-quoted commas won't work; use JSON or a proper CSV lib if needed.
  // For safety, assume cleaner produced simple fields without problematic commas. Adjust if needed.
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(",");
  const rows = lines.map(l => {
    const cols = l.split(",");
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cols[i] ?? ""; });
    return obj;
  });
  return rows;
}

function execSQL(sql) {
  const p = spawnSync("wrangler", ["d1", "execute", db, "--command", sql, ...(env === "prod" ? ["--env", "production"] : [])], {
    encoding: "utf-8",
    stdio: "pipe",
  });
  if (p.status !== 0) {
    console.error(p.stderr || p.stdout);
    process.exit(p.status);
  }
}

function insertOrgs(rows) {
  const cols = ["id","org_name","in_cnie","in_cace","in_un","founded_date","go_global_date","leaders","key_staff","capital_type","reg_location","reg_type","donation_pre","donation_pre_year","donation_post","mission","org_structure","has_overseas_office","overseas_mission","overseas_projects","overseas_regions","overseas_services","service_mode","has_official_background","sources","disclosed_online","disclosed_continuous","go_out_level","logo_url"];
  const placeholders = "(" + cols.map(() => "?").join(",") + ")";
  for (const r of rows) {
    const values = cols.map(c => r[c] ?? "");
    const sql = `INSERT INTO orgs (${cols.join(",")}) VALUES ${placeholders}`;
    execSQL(prepare(sql, values));
  }
}

function insertPolicies(rows) {
  const cols = ["id","published_date","title","doc_type","issuer_1","issuer_2","issuer_3","issuer_4","link"];
  const placeholders = "(" + cols.map(() => "?").join(",") + ")";
  for (const r of rows) {
    const values = cols.map(c => r[c] ?? "");
    const sql = `INSERT INTO policies (${cols.join(",")}) VALUES ${placeholders}`;
    execSQL(prepare(sql, values));
  }
}

function prepare(sql, values) {
  // We don't have direct param binding via wrangler CLI command.
  // Escape single quotes minimally for SQL string literals.
  const esc = v => typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
  const parts = sql.split("?");
  let out = "";
  for (let i = 0; i < parts.length; i++) {
    out += parts[i];
    if (i < values.length) out += esc(values[i]);
  }
  return out;
}

function main() {
  const orgsText = readFileSync(resolve("data/orgs_clean.csv"), "utf-8");
  const policiesText = readFileSync(resolve("data/policies_clean.csv"), "utf-8");
  const orgs = csvParse(orgsText);
  const policies = csvParse(policiesText);

  console.log(`Inserting ${orgs.length} orgs, ${policies.length} policies into ${db} (${env})`);
  insertOrgs(orgs);
  insertPolicies(policies);
  console.log("Done.");
}

main();