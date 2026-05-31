const fs = require('fs');
const base64 = fs.readFileSync('carimbo_base64.txt', 'utf8');
const content = 'export const DEFAULT_CARIMBO = "data:image/png;base64,' + base64 + '";\n';
fs.writeFileSync('src/pdf/defaultCarimbo.js', content);
