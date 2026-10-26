// Fills the database with sample incidents so the dashboard has data to show.
const { createApp } = require('./server');
const db = createApp().locals.db;
const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
const insert = db.prepare(
  'INSERT INTO incidents (title, service, severity, status, created_at, resolved_at) VALUES (?, ?, ?, ?, ?, ?)'
);
const rows = [
  ['Payment API returning 502s', 'billing-api', 1, 'investigating', ago(35), null],
  ['Claims batch job stuck at 80%', 'claims-batch', 2, 'open', ago(120), null],
  ['Login latency above 3s', 'auth-service', 3, 'open', ago(300), null],
  ['Nightly CICS region restart failed', 'cics-gateway', 2, 'resolved', ago(1500), ago(1440)],
  ['Report export timing out', 'reporting', 3, 'resolved', ago(2900), ago(2810)],
  ['SMS gateway queue backlog', 'notifications', 2, 'resolved', ago(4400), ago(4370)],
  ['Typo in invoice footer', 'billing-ui', 4, 'resolved', ago(6000), ago(5990)],
];
db.transaction(() => rows.forEach((r) => insert.run(...r)))();
console.log(`Seeded ${rows.length} incidents.`);
