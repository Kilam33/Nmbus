// fix-imports.js
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, 'src');
const ALIAS = '@/';

function walk(dir, callback) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, callback);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      callback(fullPath);
    }
  });
}

function convertAlias(filePath) {
  const fileDir = path.dirname(filePath);
  let code = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  code = code.replace(/from\s+['"]@\/([^'"]+)['"]/g, (match, aliasPath) => {
    const target = path.resolve(SRC_DIR, aliasPath);
    let relativePath = path.relative(fileDir, target).replace(/\\/g, '/');
    if (!relativePath.startsWith('.')) relativePath = './' + relativePath;
    changed = true;
    return `from '${relativePath}'`;
  });

  if (changed) {
    fs.writeFileSync(filePath, code, 'utf8');
    console.log(`✔ Fixed imports in ${filePath}`);
  }
}

walk(SRC_DIR, convertAlias);
