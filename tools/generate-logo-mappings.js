#!/usr/bin/env node

/**
 * Generate logo URL mappings from uploaded files
 * Reads filenames from the NGO folder and generates SQL update statements
 */

import { readdirSync } from 'fs';
import { writeFileSync } from 'fs';

const SOURCE_DIR = '/Users/jameslo-aa/Downloads/NGO';
const CDN_URL = 'https://ngo-going-out.pages.dev/cdn';
const OUTPUT_FILE = './tools/update-logo-urls.sql';

console.log('========================================');
console.log('Generate Logo URL Mappings');
console.log('========================================');
console.log(`Source: ${SOURCE_DIR}`);
console.log(`CDN URL: ${CDN_URL}`);
console.log('');

// Read all files
const files = readdirSync(SOURCE_DIR);
console.log(`Found ${files.length} files`);
console.log('');

// Parse filenames and generate mappings
const mappings = [];
const specialCases = [];

files.forEach(filename => {
  // Normalize filename (remove double extensions)
  let normalizedFilename = filename.replace(/\.png\.(png|jpeg)$/, '.$1');

  // Extract org ID from filename
  // org_10.png -> 10
  // org_245、246.png -> 245 (special case)
  const match = normalizedFilename.match(/^org_(\d+)/);

  if (match) {
    const orgId = parseInt(match[1]);

    // Special handling for org_245、246
    if (filename.includes('、')) {
      normalizedFilename = `org_${orgId}.png`;
      specialCases.push({
        orgId: 245,
        filename: normalizedFilename,
        note: 'Shared logo for org 245 and 246'
      });
      specialCases.push({
        orgId: 246,
        filename: normalizedFilename,
        note: 'Shared logo for org 245 and 246'
      });
    } else {
      mappings.push({
        orgId,
        filename: normalizedFilename
      });
    }
  }
});

// Sort by org ID
mappings.sort((a, b) => a.orgId - b.orgId);

console.log(`Parsed ${mappings.length} mappings`);
console.log(`Special cases: ${specialCases.length}`);
console.log('');

// Generate SQL
let sql = '-- Auto-generated logo URL update statements\n';
sql += `-- Generated at: ${new Date().toISOString()}\n`;
sql += `-- Total updates: ${mappings.length + specialCases.length}\n\n`;

// Regular mappings
mappings.forEach(({ orgId, filename }) => {
  const logoUrl = `${CDN_URL}/${filename}`;
  sql += `UPDATE orgs SET logo_url = '${logoUrl}' WHERE id = ${orgId};\n`;
});

// Special cases
if (specialCases.length > 0) {
  sql += '\n-- Special cases\n';
  specialCases.forEach(({ orgId, filename, note }) => {
    const logoUrl = `${CDN_URL}/${filename}`;
    sql += `-- ${note}\n`;
    sql += `UPDATE orgs SET logo_url = '${logoUrl}' WHERE id = ${orgId};\n`;
  });
}

// Write to file
writeFileSync(OUTPUT_FILE, sql);

console.log(`✓ SQL file generated: ${OUTPUT_FILE}`);
console.log('');
console.log('Sample mappings:');
mappings.slice(0, 5).forEach(({ orgId, filename }) => {
  console.log(`  org ${orgId} -> ${filename}`);
});
console.log('  ...');
console.log('');
console.log('Next step: Review the SQL file and execute updates');
