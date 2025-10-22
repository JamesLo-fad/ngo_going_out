/* Import policies from CSV exported from the "相关政策收集" sheet.
   Required headers (lowercased after trim):
   No.,发布时期,题目,属性,发布单位（部委）1,发布单位（部委）2,发布单位（部委）3,发布单位（部委）4,链接

   Usage:
     export D1_DB_NAME=<your-d1-name>
     node tools/import_policies.js policies.csv
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
  console.error('Provide a CSV file path, e.g., node tools/import_policies.js policies.csv');
  process.exit(1);
}

async function main() {
  const rl = readline.createInterface({ input: fs.createReadStream(file, 'utf8'), crlfDelay: Infinity });
  let headers, map, n = 0;

  for await (const line of rl) {
    if (!headers) { headers = parseCSVLine(line).map(s => s.trim()); map = mapHeaders(headers); continue; }
    if (!line.trim()) continue;
    const cols = parseCSVLine(line);

    const row = {
      id: Number(get(cols, map, 'no.') || n + 1),
      publish_date: get(cols, map, '发布时期') || '',
      title: get(cols, map, '题目') || '',
      attr: get(cols, map, '属性') || '',
      dept1: get(cols, map, '发布单位（部委）1') || '',
      dept2: get(cols, map, '发布单位（部委）2') || '',
      dept3: get(cols, map, '发布单位（部委）3') || '',
      dept4: get(cols, map, '发布单位（部委）4') || '',
      link: get(cols, map, '链接') || ''
    };

    const sql = `
      INSERT INTO policies (id, no, publish_date, title, attr, dept1, dept2, dept3, dept4, link)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        no=excluded.no,
        publish_date=excluded.publish_date,
        title=excluded.title,
        attr=excluded.attr,
        dept1=excluded.dept1,
        dept2=excluded.dept2,
        dept3=excluded.dept3,
        dept4=excluded.dept4,
        link=excluded.link;
    `;
    await d1Exec(DB_NAME, sql, [
      row.id, String(row.id), row.publish_date, row.title, row.attr, row.dept1, row.dept2, row.dept3, row.dept4, row.link
    ]);

    n++;
    if (n % 100 === 0) console.log(`Imported policies: ${n}`);
  }
  console.log(`Done. Imported policies: ${n}`);
}

main().catch(e => { console.error(e); process.exit(1); });