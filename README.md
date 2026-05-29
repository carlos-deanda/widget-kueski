# Widget Kueski

Widget Kueski is a React + Vite extension widget with a Node.js/Express backend and PostgreSQL database.

## Email price alerts

The backend can now send price-drop emails to tracked users.

### Required SMTP env vars

Add these to `backend/.env`:

```dotenv
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-user@example.com
SMTP_PASS=your-password
SMTP_FROM=Kueski Widget <your-user@example.com>
# Optional
SMTP_SECURE=false
ENABLE_PRICE_ALERT_EMAILS=true
PRICE_ALERT_EMAIL_INTERVAL_MINUTES=15
```

### Manual test endpoints

- `GET /api/notifications/email/status`
- `POST /api/notifications/email/test` with `{ "userId": 1 }`
- `POST /api/notifications/email/price-check`

If SMTP is not configured, the endpoints return `503` and the alerts job stays disabled.

### Database change

Run the backend schema again so PostgreSQL creates the new `notification_logs` table.

## Development

### Frontend

```bash
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run dev
```

### Build

```bash
npm run build
```
