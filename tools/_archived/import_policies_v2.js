/* Import policies from CSV exported from the "相关政策收集" sheet.
   Required headers (lowercased after trim):
   id,published_date,title,doc_type,issuer_1,issuer_2,issuer_3,issuer_4,link

   Usage:
     export D1_DB_NAME=<your-d1-name>
     node tools/import_policies.js ../data/policies_clean.csv
*/

import fs from 'node:fs';
import readline from 'node:readline';
import { parseCSVLine, mapHeaders, get, d1Exec } from './helpers.js';

const DB_NAME = process.env.D1_DB_NAME;

if (!DB_NAME) {
  console.error('Please set D1_DB_NAME env var.');
  process.exit(1);
}

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error('Provide a CSV file path, e.g., node tools/import_policies.js ../data/policies_clean.csv');
  process.exit(1);
}

async function main() {
  const rl = readline.createInterface({ input: fs.createReadStream(file, 'utf8'), crlfDelay: Infinity });
  let headers, map, n = 0;

  for await (const line of rl) {
    if (!headers) {
      headers = parseCSVLine(line).map(s => s.trim());
      map = mapHeaders(headers);
      continue;
    }
    if (!line.trim()) continue;
    const cols = parseCSVLine(line);

    const row = {
      id: Number(get(cols, map, 'id') || n + 1),
      published_date: get(cols, map, 'published_date') || '',
      title: get(cols, map, 'title') || '',
      doc_type: get(cols, map, 'doc_type') || '',
      issuer_1: get(cols, map, 'issuer_1') || '',
      issuer_2: get(cols, map, 'issuer_2') || '',
      issuer_3: get(cols, map, 'issuer_3') || '',
      issuer_4: get(cols, map, 'issuer_4') || '',
      link: get(cols, map, 'link') || ''
    };

    const sql = `
      INSERT INTO policies (id, published_date, title, doc_type, issuer_1, issuer_2, issuer_3, issuer_4, link)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        published_date=excluded.published_date,
        title=excluded.title,
        doc_type=excluded.doc_type,
        issuer_1=excluded.issuer_1,
        issuer_2=excluded.issuer_2,
        issuer_3=excluded.issuer_3,
        issuer_4=excluded.issuer_4,
        link=excluded.link;
    `;
    await d1Exec(DB_NAME, sql, [
      row.id, row.published_date, row.title, row.doc_type,
      row.issuer_1, row.issuer_2, row.issuer_3, row.issuer_4, row.link
    ]);

    n++;
    if (n % 100 === 0) console.log(`Imported policies: ${n}`);
  }
  console.log(`Done. Imported policies: ${n}`);
}

main().catch(e => { console.error(e); process.exit(1); });
