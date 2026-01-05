export function parseCSVLine(line) {
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; }
      else q = !q;
    } else if (c === ',' && !q) {
      out.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

export function mapHeaders(h) {
  const m = {};
  h.forEach((v, i) => { m[v.trim().toLowerCase()] = i; });
  return m;
}

export function get(cols, map, key) {
  const i = map[key]; return i === undefined ? '' : (cols[i] ?? '').trim();
}

// Clean empty values: convert '', '-', 'null', whitespace to null
export function cleanValue(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (s === '' || s === '-' || s.toLowerCase() === 'null') return null;
  return s;
}

// Check if a row should be skipped (all key fields are empty)
export function shouldSkipRow(row, keyFields) {
  return keyFields.every(field => {
    const val = row[field];
    return val === null || val === undefined || val === '' || val === '-';
  });
}

export function normalizeList(raw) {
  if (!raw) return [];
  // split by common separators
  return raw.split(/[、,，;；\/\s]+/).map(s => s.trim()).filter(Boolean);
}

export function esc(v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  if (typeof v === 'number') return String(v);
  if (/^\d+$/.test(v)) return v; // numeric strings
  return `'${String(v).replace(/'/g, "''")}'`;
}

export function inlineParams(sql, params) {
  let i = 0;
  return sql.replace(/\?(?=(?:[^'"]|'[^']*'|"[^"]*")*$)/g, () => esc(params[i++]));
}

import { spawn } from 'node:child_process';
export async function d1Exec(dbName, sql, params = []) {
  const cmd = params.length ? inlineParams(sql, params) : sql;
  const args = ['d1', 'execute', dbName, '--command', cmd, '--remote'];
  await new Promise((resolve, reject) => {
    const p = spawn('wrangler', args, { stdio: 'inherit' });
    p.on('close', code => code === 0 ? resolve() : reject(new Error('wrangler d1 execute failed')));
  });
}