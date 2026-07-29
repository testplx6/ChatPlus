const pw = await import('playwright-core');
const chromium = pw.chromium || pw.default.chromium;
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM
  || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message + ' | ' + String(e.stack).split('\n').slice(0, 3).join(' <- ')));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:8288/index.html', { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
console.log(errs.slice(0, 3).join('\n') || 'aucune erreur');
await b.close();
