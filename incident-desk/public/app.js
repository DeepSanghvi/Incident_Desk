const $ = (sel) => document.querySelector(sel);

async function api(path, options) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Request failed');
  return body;
}

function age(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
  if (mins < 60) return `${mins} min`;
  if (mins < 1440) return `${Math.floor(mins / 60)} h`;
  return `${Math.floor(mins / 1440)} d`;
}

function renderStats(s) {
  const items = [
    ['Open', s.open],
    ['Investigating', s.investigating],
    ['Resolved', s.resolved],
    ['Avg time to resolve', s.mttrMinutes === null ? 'n/a' : `${s.mttrMinutes} min`],
  ];
  $('#stats').replaceChildren(
    ...items.map(([label, value], i) => {
      const div = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = value;
      if (i === 3) dd.className = 'mttr';
      div.append(dt, dd);
      return div;
    })
  );
}

function renderRows(incidents) {
  $('#empty').hidden = incidents.length > 0;
  $('#rows').replaceChildren(
    ...incidents.map((i) => {
      const tr = document.createElement('tr');
      tr.className = i.status;

      const sev = document.createElement('td');
      sev.className = `sev sev-${i.severity}`;
      sev.textContent = `S${i.severity}`;

      const title = document.createElement('td');
      const name = document.createElement('span');
      name.className = 'title';
      name.textContent = i.title;
      title.append(name);

      const service = document.createElement('td');
      service.textContent = i.service;

      const when = document.createElement('td');
      when.textContent = age(i.created_at);

      const statusCell = document.createElement('td');
      const select = document.createElement('select');
      select.setAttribute('aria-label', `Status for ${i.title}`);
      ['open', 'investigating', 'resolved'].forEach((s) => {
        select.add(new Option(s[0].toUpperCase() + s.slice(1), s, false, s === i.status));
      });
      select.addEventListener('change', async () => {
        try {
          await api(`/api/incidents/${i.id}`, { method: 'PATCH', body: JSON.stringify({ status: select.value }) });
          load();
        } catch (err) {
          showError(err);
        }
      });
      statusCell.append(select);

      tr.append(sev, title, service, when, statusCell);
      return tr;
    })
  );
}

function showError(err) {
  $('#error').textContent = err ? err.message : '';
}

async function load() {
  try {
    const [incidents, stats] = await Promise.all([api('/api/incidents'), api('/api/stats')]);
    renderStats(stats);
    renderRows(incidents);
    showError(null);
  } catch (err) {
    showError(err);
  }
}

$('#new-incident').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  try {
    await api('/api/incidents', { method: 'POST', body: JSON.stringify(data) });
    form.reset();
    load();
  } catch (err) {
    showError(err);
  }
});

load();
