# Incident Desk

A small full-stack incident tracker. Log incidents, move them through a workflow (open, investigating, resolved), and watch average time to resolve (MTTR) update as incidents close.

Built around the way production support teams actually work: severity levels, a status workflow, and MTTR as the headline number.

## Stack

- **Backend:** Node.js, Express, SQLite (better-sqlite3)
- **Frontend:** vanilla JavaScript, HTML, CSS (responsive, keyboard accessible)
- **Testing:** Node's built-in test runner
- **Delivery:** Docker, GitHub Actions CI

## Run it

```bash
npm install
npm run seed   # optional: load sample incidents
npm start      # http://localhost:3000
```

With Docker:

```bash
docker build -t incident-desk .
docker run -p 3000:3000 -v incident-data:/data incident-desk
```

Run the tests: `npm test`

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/incidents?status=open` | List incidents, sorted by severity. `status` is optional. |
| POST | `/api/incidents` | Create an incident: `{ title, service, severity (1-4) }` |
| PATCH | `/api/incidents/:id` | Change status: `{ status: "open" \| "investigating" \| "resolved" }` |
| GET | `/api/stats` | Counts per status and MTTR in minutes |

## Design notes

- Input is validated server-side; malformed JSON and bad values return a 400 with a clear message.
- `resolved_at` is set when an incident is resolved and cleared if it is reopened, so MTTR stays accurate.
- The UI builds the DOM with `textContent` rather than `innerHTML`, so user input cannot inject markup.

## Ideas for next steps

- Authentication and per-team incident lists
- Postmortem notes and an incident timeline
- Postgres instead of SQLite, deployed on a managed service
