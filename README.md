# Planner

A personal planning app that brings together Google Calendar, task management and Gmail.

## Features

- **Google Calendar** — View events across multiple calendars with color-coded display and real-time push notification sync
- **Tasks** — Create recurring tasks with customizable repeat intervals and track completions
- **Gmail** — View emails with optional AI-powered analysis via OpenAI

## Tech Stack

| Layer         | Technology                                 |
| ------------- | ------------------------------------------ |
| Frontend      | React 19, TypeScript, Vite                 |
| Backend       | Express 5, Node.js, TypeScript             |
| Database      | SQLite (primary)                           |
| Auth          | Google OAuth2                              |
| External APIs | Google Calendar API, Gmail API, OpenAI API |

## Project Structure

```
calendar/
├── frontend/       # React + Vite app
│   └── src/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── types.ts
└── backend/        # Express API server
    ├── server/
    │   └── routes/
    └── db/
```

## Setup

### Prerequisites

- Node.js
- A [Google Cloud project](https://console.cloud.google.com/) with the Calendar API and Gmail API enabled
- OAuth 2.0 credentials (Web application type) with your redirect URIs configured
- An OpenAI API key (optional, for Gmail analysis)

### Environment Variables

**Frontend** — create `frontend/.env.local`:

```
VITE_GOOGLE_API_KEY=your_google_api_key
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

**Backend** — create `backend/.env`:

```
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
OPENAI_API_KEY=your_openai_api_key          # optional
FRONTEND_URL=http://localhost:3000
PORT=5000

# Optional: enables real-time calendar push notifications (requires a public HTTPS URL)
CALENDAR_WEBHOOK_URL=https://your-domain.com/api/calendar/webhook
```

> For local development with calendar webhooks, use a tool like [ngrok](https://ngrok.com/) to expose your local server.

### Install & Run

**Backend:**

```bash
cd backend
npm install
npm run dev     # development with hot-reload
# or
npm start       # production
```

The SQLite database is created automatically on first startup.

**Frontend:**

```bash
cd frontend
npm install
npm start       # development server at http://localhost:3000
# or
npm run build   # production build
```

The frontend dev server proxies `/api` requests to `http://localhost:5000`.

## Google OAuth Setup

On first launch, navigate to the app and complete the Google OAuth flow to grant access to your Calendar and Gmail. Tokens are stored locally in SQLite.
