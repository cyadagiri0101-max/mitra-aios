const fs = require('fs');
const path = require('path');
const share = '\\\\192.168.1.80\\Prathiraj Design Data';
const roots = ['Blow Molds', 'Injection Molds', 'Job Work', 'Standards'];
for (const root of roots) {
  const full = path.join(share, root);
  console.log('ROOT', root, full, 'exists=', fs.existsSync(full));
  if (fs.existsSync(full)) {
    try {
      const entries = fs.readdirSync(full, { withFileTypes: true });
      console.log('ENTRIES', entries.slice(0, 10).map((e) => e.name));
    } catch (err) {
      console.error('READERR', err.message);
    }
  }
}
