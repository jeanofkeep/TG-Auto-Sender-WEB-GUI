# TG Auto-Sender — Web Interface 🚀

A full-stack web application for automated message broadcasting to Telegram groups and channels. Features a modern dark UI, REST API backend, and runs entirely in Docker.

![Stack](https://img.shields.io/badge/Backend-FastAPI%20%2B%20Telethon-009688?style=flat-square)
![Stack](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=flat-square)
![Stack](https://img.shields.io/badge/Deploy-Docker%20Compose-2496ED?style=flat-square)

---

## Features

- 🔐 **Login screen** — panel protected by login/password from `.env`
- 📷 **QR-code auth** — scan with Telegram mobile app, no SMS needed
- 📱 **Phone + code auth** — classic login with phone number and confirmation code (2FA supported)
- 🔑 **API keys editor** — set `api_id` and `api_hash` directly from the UI without restarting Docker
- 💬 **Message manager** — add, remove and rotate multiple messages
- 👥 **Chat manager** — add groups by @username, link or numeric ID
- ⏱ **Auto-send** — scheduler with configurable interval (enter any number of minutes)
- ▶️ **Manual send** — trigger a broadcast instantly with one click
- 🟢 **Live status bar** — shows current state (active / stopped / sending)
- 📋 **Live log** — real-time event log with color-coded statuses
- 📱 **Responsive** — works on desktop and mobile (tab layout on small screens)
- 🌐 **PWA** — installable from the browser, opens as a standalone window

---

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12, FastAPI, Telethon, Uvicorn |
| Frontend | React 18, Vite, vanilla CSS-in-JS |
| Server | Nginx (reverse proxy + static files) |
| Deploy | Docker, Docker Compose |

---

## Project structure

```
tg-autosender/
├── docker-compose.yml
├── .env.example           ← copy to .env and fill in
├── get_session.py         ← optional: get StringSession in advance
├── backend/
│   ├── Dockerfile
│   ├── main.py            ← FastAPI + Telethon logic
│   └── requirements.txt
└── frontend/
    ├── Dockerfile         ← multi-stage: Node build → Nginx serve
    ├── nginx.conf         ← proxies /api/* → backend
    ├── index.html         ← PWA meta tags + SW registration
    ├── vite.config.js
    └── src/
        ├── main.jsx
        └── App.jsx        ← full UI: login, dashboard, logs
```

---

## Quick start

### 1. Get Telegram API keys

1. Go to [my.telegram.org](https://my.telegram.org)
2. Log in with your phone number
3. Click **API development tools**
4. Create an application (any name)
5. Copy `api_id` and `api_hash`

> You can also enter API keys directly in the UI after first launch — no need to restart Docker.

### 2. Configure environment

```bash
cp .env.example .env
nano .env
```

```env
# Telegram API
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=your_api_hash_here

# Optional: pre-saved session string (see get_session.py)
TELEGRAM_SESSION=

# Panel login / password
ADMIN_LOGIN=admin
ADMIN_PASSWORD=your_secure_password
```

### 3. Start

```bash
docker compose up --build -d
```

The first build takes 3–5 minutes (downloads Node, installs npm packages, compiles React).

### 4. Open

```
http://localhost:4446
```

Or replace `localhost` with your server's IP if running remotely.

---

## Connecting Telegram account

The app offers two ways to log in — choose whichever works best for you.

### Option A — QR code (recommended)

No SMS required. Fast and reliable.

1. In the Telegram card, click the **📷 QR-код** tab
2. Click **Показать QR-код**
3. Open Telegram on your phone → **Settings → Devices → Connect device**
4. Scan the QR code
5. Done — session starts immediately

> If your account has 2FA enabled, a password field will appear after scanning.
> The QR code refreshes automatically every 20 seconds if not scanned in time.

### Option B — Phone number + code

1. Click the **📱 Телефон** tab
2. Click **Войти по номеру телефона**
3. Enter your phone number with country code (e.g. `+7 900 000 00 00`)
4. Enter the code sent to your Telegram app
5. Enter your 2FA password if prompted

---

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TELEGRAM_API_ID` | ✅ | — | API ID from my.telegram.org |
| `TELEGRAM_API_HASH` | ✅ | — | API hash from my.telegram.org |
| `TELEGRAM_SESSION` | ❌ | `""` | StringSession string (optional, see below) |
| `ADMIN_LOGIN` | ❌ | `admin` | Panel login |
| `ADMIN_PASSWORD` | ❌ | `changeme` | Panel password — **change this!** |

---

## StringSession (optional)

By default you authorize through the UI every time the container restarts. To avoid re-entering credentials, generate a session string once and paste it into `.env`:

```bash
pip install telethon
python get_session.py
```

Copy the output line into `.env`:
```env
TELEGRAM_SESSION=1BVtsOKABu2...
```

Now the container will start pre-authorized without any prompts.

---

## API reference

All endpoints require `Authorization: Bearer <token>` header (token is obtained via `/admin/login`).

### Panel auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/admin/login` | Login with `{ login, password }` → returns `{ token }` |
| `POST` | `/admin/logout` | Invalidate current token |
| `GET` | `/admin/me` | Check if token is valid |

### API keys

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/apikeys` | Get current API key status (hash is masked) |
| `POST` | `/apikeys` | Update `{ api_id, api_hash }` — applies instantly, no restart needed |

### Telegram auth — phone

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/send-code` | Send verification code to phone |
| `POST` | `/auth/verify-code` | Confirm code (+ 2FA password if needed) |
| `POST` | `/auth/logout` | Disconnect Telegram account |
| `GET` | `/auth/me` | Get connected account info |

### Telegram auth — QR

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/qr-start` | Generate QR code, start polling loop |
| `GET` | `/auth/qr-poll` | Poll for scan status → `pending / done / 2fa / error` |
| `POST` | `/auth/qr-2fa` | Submit 2FA password after QR scan |
| `POST` | `/auth/qr-cancel` | Cancel QR session |

### Chats

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/chats` | Get list of chats |
| `POST` | `/chats` | Add chat `{ chat: "@username" }` |
| `DELETE` | `/chats/{chat}` | Remove chat by username |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/messages` | Get list of messages |
| `POST` | `/messages` | Add message `{ text: "..." }` |
| `DELETE` | `/messages/{index}` | Delete message by index |

### Settings & sending

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/settings` | Get current settings |
| `PUT` | `/settings` | Update `{ auto_send, interval, msg_order }` |
| `POST` | `/send` | Trigger manual broadcast |
| `GET` | `/logs` | Get event log (last 200 entries) |
| `DELETE` | `/logs` | Clear log |

---

## PWA installation

The app supports PWA — you can install it as a standalone window without a browser toolbar.

**Chrome / Chromium:** look for the install icon in the address bar → click Install.

**Firefox:** Menu → "Install site as app".

After installation the app appears in your applications list and can be pinned to the taskbar.

---

## Useful commands

```bash
# Start
docker compose up -d

# Rebuild and start (after code changes)
docker compose up --build -d

# Stop
docker compose down

# View backend logs
docker logs tg_sender_backend -f

# View frontend logs
docker logs tg_sender_frontend -f

# Restart only backend
docker compose restart backend
```

---

## Error handling

| Error | Behavior |
|-------|----------|
| `FloodWaitError` | Automatically waits the required time, then retries |
| `ChatWriteForbiddenError` | Skips the chat, logs a warning |
| `UserBannedInChannelError` | Skips the chat, logs a warning |
| Any other error | Logs the error, continues to the next chat |

---

## Security notes

> ⚠️ **Change the default password.** The default `ADMIN_PASSWORD=changeme` is not safe for public servers. Set a strong password in `.env` before deploying.

> 🔒 **Never commit `.env` to Git.** Add it to `.gitignore`. The `.env.example` file with placeholder values is safe to commit.

> 💡 **Port 8000 is not exposed.** The backend API is only accessible inside the Docker network — external users can only reach the Nginx frontend on port 4446.

> ⚠️ **Use responsibly.** Mass messaging from a personal Telegram account may violate [Telegram's Terms of Service](https://telegram.org/tos). Use reasonable intervals and only message groups where you have permission.

---

## License

MIT
