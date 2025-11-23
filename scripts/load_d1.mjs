#!/usr/bin/env node
// scripts/load_d1.mjs
// Usage:
//   node scripts/load_d1.mjs dev
//   node scripts/load_d1.mjs dev --limit 10 --verbose
//
// Requires: Node 18+, Wrangler installed (wrangler 4.50.0 is fine)

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DB_BY_ENV = { dev: "ngo_going_out_dev", prod: "ngo_going_out" };

// ---------- CLI args ----------
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Usage: node scripts/load_d1.mjs <dev|prod> [--limit N] [--verbose]");
  process.exit(1);
}
const envName = args[0];
const dbName = DB_BY_ENV[envName];
if (!dbName) {
  console.error(`Unknown env "${envName}". Use dev or prod.`);
  process.exit(1);
}
const verbose = args.includes("--verbose");
const limitArg = getFlag("--limit");
const limit = limitArg ? Number(limitArg) : undefined;

// ---------- File paths ----------
const ORGS_CSV = path.resolve(process.cwd(), "data/orgs_clean.csv");
const POLICIES_CSV = path.resolve(process.cwd(), "data/policies_clean.csv");

// ---------- CSV reader (simple, robust for your files) ----------
function parseCSV(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  // Split rows; handle CRLF/CR/LF
  const lines = raw.split(/\r?\n/);
  if (lines.length === 0) return { headers: [], rows: [] };

  // Simple CSV: values do not have quotes in your sample except for commas inside Chinese text/newlines.
  // To be safe, we implement a minimal state machine for quoted fields.
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    // We will rebuild rows considering quotes
  }
  return parseCsvSmart(raw);
}

// More robust CSV parser supporting quotes and multiline cells
function parseCsvSmart(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"'; // escaped quote
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (c === "\r") {
        // ignore CR; handle CRLF via \n branch
      } else {
        field += c;
      }
    }
  }
  // last field/row
  if (field.length > 0 || inQuotes || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1).map((r) => {
    const obj = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = (r[i] ?? "").trim();
    }
    return obj;
  });
  return { headers, rows: dataRows };
}

// ---------- Normalizers ----------
function toNullIfEmpty(s) {
  if (s === undefined || s === null) return null;
  const t = String(s).trim();
  if (!t || t === "——") return null;
  return t;
}
function parseCurrencyToNumber(s) {
  const v = toNullIfEmpty(s);
  if (v == null) return null;
  const cleaned = v.replace(/[￥$,]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}
function toIntFlag(v) {
  const t = toNullIfEmpty(v);
  if (t == null) return 0;
  const low = String(t).toLowerCase();
  if (low === "1" || low === "true") return 1;
  if (low === "0" || low === "false") return 0;
  const n = Number(t);
  return Number.isFinite(n) ? (n ? 1 : 0) : 0;
}
function toNullableInteger(v) {
  const t = toNullIfEmpty(v);
  if (t == null) return null;
  // keep only digits and leading minus
  const cleaned = t.replace(/[^\d-]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isInteger(n) ? n : null;
}
function toText(v) {
  const t = toNullIfEmpty(v);
  return t == null ? null : t;
}
function toDateText(v) {
  // Keep original as TEXT; do not parse (mixed formats in CSV)
  return toText(v);
}

// ---------- Row mappers ----------
function mapOrg(row) {
  return {
    id: toNullableInteger(row.id),
    org_name: toText(row.org_name),
    in_cnie: toIntFlag(row.in_cnie),
    in_cace: toIntFlag(row.in_cace),
    in_un: toIntFlag(row.in_un),
    founded_date: toDateText(row.founded_date),
    go_global_date: toDateText(row.go_global_date),
    leaders: toText(row.leaders),
    key_staff: toText(row.key_staff),
    capital_type: toText(row.capital_type),
    reg_location: toText(row.reg_location),
    reg_type: toText(row.reg_type),
    donation_pre: parseCurrencyToNumber(row.donation_pre),
    donation_pre_year: toText(row.donation_pre_year),
    donation_post: parseCurrencyToNumber(row.donation_post),
    mission: toText(row.mission),
    org_structure: toText(row.org_structure),
    has_overseas_office: toIntFlag(row.has_overseas_office),
    overseas_mission: toText(row.overseas_mission),
    overseas_projects: toText(row.overseas_projects),
    overseas_regions: toText(row.overseas_regions),
    overseas_services: toText(row.overseas_services),
    service_mode: toText(row.service_mode),
    has_official_background: toIntFlag(row.has_official_background),
    sources: toText(row.sources),
    disclosed_online: toIntFlag(row.disclosed_online),
    disclosed_continuous: toIntFlag(row.disclosed_continuous),
    go_out_level: toText(row.go_out_level),
    logo_url: toText(row.logo_url),
  };
}

function mapPolicy(row) {
  return {
    id: toNullableInteger(row.id),
    published_date: toDateText(row.published_date),
    title: toText(row.title),
    doc_type: toText(row.doc_type),
    issuer_1: toText(row.issuer_1),
    issuer_2: toText(row.issuer_2),
    issuer_3: toText(row.issuer_3),
    issuer_4: toText(row.issuer_4),
    link: toText(row.link),
  };
}

// ---------- D1 execution ----------
function escapeLiteral(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  // TEXT literal
  return `'${String(v).replace(/'/g, "''")}'`;
}
function bindParams(sql, params) {
  let i = 0;
  return sql.replace(/\?/g, () => escapeLiteral(params[i++]));
}
function d1Execute(db, sql, params = []) {
  const finalSql = params.length ? bindParams(sql, params) : sql;
  const res = spawnSync("wrangler", ["d1", "execute", db, "--command", finalSql], {
    encoding: "utf8",
  });
  if (res.status !== 0) {
    const out = res.stdout + "\n" + res.stderr;
    throw new Error(`D1 error:\n${out}\nSQL:\n${finalSql}`);
  }
  if (verbose) console.log(finalSql);
  return res.stdout;
}

// ---------- Inserts ----------
const INSERT_ORG = `
INSERT OR REPLACE INTO orgs (   id, org_name, in_cnie, in_cace, in_un, founded_date, go_global_date,   leaders, key_staff, capital_type, reg_location, reg_type, donation_pre,   donation_pre_year, donation_post, mission, org_structure, has_overseas_office,   overseas_mission, overseas_projects, overseas_regions, overseas_services,   service_mode, has_official_background, sources, disclosed_online,   disclosed_continuous, go_out_level, logo_url ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

`;

const INSERT_POLICY = `
INSERT OR REPLACE INTO policies ( id, published_date, title, doc_type, issuer_1, issuer_2, issuer_3, issuer_4, link ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
`;

// ---------- Main ----------
async function main() {
  console.log(`Loading into ${dbName} (${envName})`);

  // Read CSVs
  if (!fs.existsSync(ORGS_CSV)) {
    console.error(`Missing file: ${ORGS_CSV}`);
    process.exit(1);
  }
  if (!fs.existsSync(POLICIES_CSV)) {
    console.error(`Missing file: ${POLICIES_CSV}`);
    process.exit(1);
  }
  const orgsCSV = parseCSV(ORGS_CSV);
  const polCSV = parseCSV(POLICIES_CSV);

  // Map rows
  let orgRows = orgsCSV.rows.map(mapOrg);
  let polRows = polCSV.rows.map(mapPolicy);

  // Limit if requested
  if (limit && limit > 0) {
    orgRows = orgRows.slice(0, limit);
    polRows = polRows.slice(0, limit);
  }

  // Clean tables (optional; comment out if you keep data)
  // d1Execute(dbName, "DELETE FROM policies;");
  // d1Execute(dbName, "DELETE FROM orgs;");

  // Insert orgs
  let orgCount = 0;
  for (const row of orgRows) {
    // Require id and org_name minimally
    if (row.id == null && !row.org_name) continue;
    const params = [
      row.id, row.org_name, row.in_cnie, row.in_cace, row.in_un, row.founded_date, row.go_global_date,
      row.leaders, row.key_staff, row.capital_type, row.reg_location, row.reg_type, row.donation_pre,
      row.donation_pre_year, row.donation_post, row.mission, row.org_structure, row.has_overseas_office,
      row.overseas_mission, row.overseas_projects, row.overseas_regions, row.overseas_services,
      row.service_mode, row.has_official_background, row.sources, row.disclosed_online,
      row.disclosed_continuous, row.go_out_level, row.logo_url,
    ];
    try {
      d1Execute(dbName, INSERT_ORG, params);
      orgCount++;
    } catch (e) {
      console.error("Failed to insert org row:", row);
      console.error(e.message);
      process.exit(1);
    }
  }

  // Insert policies (skip fully empty rows)
  let polCount = 0;
  for (const row of polRows) {
    const allNull = Object.values(row).every((v) => v == null);
    if (allNull) continue;
    const params = [
      row.id, row.published_date, row.title, row.doc_type, row.issuer_1, row.issuer_2, row.issuer_3, row.issuer_4, row.link,
    ];
    try {
      d1Execute(dbName, INSERT_POLICY, params);
      polCount++;
    } catch (e) {
      console.error("Failed to insert policy row:", row);
      console.error(e.message);
      process.exit(1);
    }
  }

  console.log(`Done. Inserted ${orgCount} orgs, ${polCount} policies.`);
}

function getFlag(name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  return args[i + 1];
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});