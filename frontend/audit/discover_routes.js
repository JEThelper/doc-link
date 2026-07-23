// audit/discover_routes.js
/**
 * Walk the src/pages folder (or frontend/src/pages) to list all public routes.
 * Adjust the base directory if the project uses a different structure.
 */
const fs = require('fs');
const path = require('path');

// Adjust this if routes are located elsewhere
const pagesDir = path.join(__dirname, '../src/pages');

function walk(dir, prefix = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath, `${prefix}/${entry.name}`);
    }
    if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
      if (entry.name === 'index.tsx' || entry.name === 'index.jsx' || entry.name === 'index.js') {
        return `${prefix}/`;
      }
      const route = `${prefix}/${entry.name.replace(/\.[jt]sx?$/, '')}`;
      return route;
    }
    return [];
  });
}

const routes = walk(pagesDir)
  .map(r => r.replace(/\/+/g, '/'))
  .filter(r => r !== '' && !r.includes('[...')) // exclude catch‑all for now
  .map(r => r === '/' ? '/' : r);

fs.writeFileSync(path.join(__dirname, 'routes.json'), JSON.stringify(routes, null, 2));
console.log('Discovered routes:', routes.length);
