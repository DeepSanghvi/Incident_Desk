const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const STATUSES = ['open', 'investigating', 'resolved'];

function createApp(dbPath = process.env.DB_PATH || path.join(__dirname, 'data.db')) {
  const db = new Database(dbPath);
  db.exec(`CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    service TEXT NOT NULL,
    severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 4),
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL,
    resolved_at TEXT
  )`);

  const app = express();
  app.locals.db = db;
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/api/incidents', (req, res) => {
    const { status } = req.query;
    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` });
    }
    const rows = status
      ? db.prepare('SELECT * FROM incidents WHERE status = ? ORDER BY severity, created_at DESC').all(status)
      : db.prepare('SELECT * FROM incidents ORDER BY (status = \'resolved\'), severity, created_at DESC').all();
    res.json(rows);
  });

  app.post('/api/incidents', (req, res) => {
    const title = String(req.body.title || '').trim();
    const service = String(req.body.service || '').trim();
    const severity = Number(req.body.severity);
    if (!title || title.length > 120) return res.status(400).json({ error: 'title is required (max 120 characters)' });
    if (!service || service.length > 60) return res.status(400).json({ error: 'service is required (max 60 characters)' });
    if (![1, 2, 3, 4].includes(severity)) return res.status(400).json({ error: 'severity must be 1 to 4' });

    const info = db
      .prepare('INSERT INTO incidents (title, service, severity, created_at) VALUES (?, ?, ?, ?)')
      .run(title, service, severity, new Date().toISOString());
    res.status(201).json(db.prepare('SELECT * FROM incidents WHERE id = ?').get(info.lastInsertRowid));
  });

  app.patch('/api/incidents/:id', (req, res) => {
    const { status } = req.body;
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` });
    }
    const resolvedAt = status === 'resolved' ? new Date().toISOString() : null;
    const info = db
      .prepare('UPDATE incidents SET status = ?, resolved_at = ? WHERE id = ?')
      .run(status, resolvedAt, req.params.id);
    if (!info.changes) return res.status(404).json({ error: 'incident not found' });
    res.json(db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id));
  });

  app.get('/api/stats', (req, res) => {
    const count = (s) => db.prepare('SELECT COUNT(*) AS n FROM incidents WHERE status = ?').get(s).n;
    const mttr = db
      .prepare(`SELECT AVG((julianday(resolved_at) - julianday(created_at)) * 1440) AS m
                FROM incidents WHERE status = 'resolved'`)
      .get().m;
    res.json({
      open: count('open'),
      investigating: count('investigating'),
      resolved: count('resolved'),
      mttrMinutes: mttr === null ? null : Math.round(mttr),
    });
  });

  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'invalid JSON body' });
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  });

  return app;
}

if (require.main === module) {
  const port = process.env.PORT || 3000;
  createApp().listen(port, () => console.log(`Incident Desk running on http://localhost:${port}`));
}

module.exports = { createApp };
