const fs = require('fs');
const path = require('path');
const glob = require('util').promisify(require('fs').readdir);

// Color mapping for LIGHT theme
// Dark → Light
const replacements = [
  // Body/container backgrounds
  [/bg-\[#050508\]/g, 'bg-white'],
  [/bg-\[#0d0d15\]/g, 'bg-white'],
  [/bg-\[#111827\]/g, 'bg-white'],
  [/bg-\[#0a0f1a\]/g, 'bg-[#f8fafc]'],
  
  // Card gradients
  [/from-\[#00d4ff\]\/5/g, 'from-[#00d4ff]/10'],
  [/from-\[#00d4ff\]\/10/g, 'from-[#00d4ff]/10'],
  
  // Text colors
  [/text-\[#f1f5f9\]/g, 'text-[#1e293b]'],
  [/text-\[#cbd5e1\]/g, 'text-[#475569]'],
  
  // Border colors (dark theme borders become light borders)
  [/border-\[#1e293b\]/g, 'border-[#e2e8f0]'],
  [/border-\[#334155\]/g, 'border-[#cbd5e1]'],
  
  // Card hover effects
  [/shadow-\[0_8px_32px_rgba\(0,212,255,0\.15\)\]/g, 'shadow-lg'],
  [/shadow-\[0_4px_16px_rgba\(0,212,255,0\.08\)\]/g, 'shadow-md'],
  
  // Button colors
  [/bg-\[\#ef4444\]\/10/g, 'bg-[#fef2f2]'],
  [/border-\[\#ef4444\]\/20/g, 'border-[#fecaca]'],
  
  // Sequential animation delays  
  [/style=\{.*?animationDelay:.*?\}/g, ''],
  
  // Markdown body colors
  [/color: #1e293b;/g, 'color: #334155;'],
  [/background: #0d0d15;/g, 'background: #f8fafc;'],
  [/border: 1px solid #1e293b;/g, 'border: 1px solid #e2e8f0;'],
  
  // Accordion
  [/border-\[#1e293b\]/g, 'border-[#e2e8f0]'],
];

const frontendDir = '/Users/mahao/imai-website/frontend';
const adminDir = path.join(frontendDir, 'app', 'admin');
const excludeDirs = ['node_modules', '.next', '.git'];

function walkDir(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (excludeDirs.includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, files);
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.css') || entry.name.endsWith('.ts'))) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = walkDir(frontendDir);
console.log(`Found ${files.length} files to process`);

let changedCount = 0;
for (const file of files) {
  // Skip admin files - keep admin partially dark
  if (file.startsWith(adminDir)) {
    continue;
  }
  
  let content = fs.readFileSync(file, 'utf-8');
  let original = content;
  
  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement);
  }
  
  // Special: bg-[#050508]/80 → bg-white/80
  content = content.replace(/bg-\[#050508\]\/80/g, 'bg-white/80');
  
  // text-[#050508] (in dark theme buttons with active state)
  content = content.replace(/text-\[#050508\]/g, 'text-white');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
    changedCount++;
    console.log(`  Modified: ${path.relative(frontendDir, file)}`);
  }
}

console.log(`\nDone! ${changedCount} files modified.`);
