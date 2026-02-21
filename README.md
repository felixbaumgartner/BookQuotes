# BookQuotes — Goodreads Book Quotes Scraper

A full-stack web application that lets you search for any book, scrapes the top 30 most-liked quotes from Goodreads, and saves them to your personal library. Each user gets their own collection via Clerk authentication, with data stored in a cloud Turso database.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Scraping**: Cheerio + Axios
- **Database**: [Turso](https://turso.tech) (cloud-hosted SQLite via `@libsql/client`)
- **Authentication**: [Clerk](https://clerk.com) (Google sign-in)
- **PDF Export**: jsPDF
- **Deployment**: Vercel (serverless)

## Features

- Search Goodreads for books by title or author
- Scrape the top 30 most-liked quotes with real-time progress via Server-Sent Events
- Per-user book library — each account has its own saved books
- Export quotes to a formatted PDF
- Click-to-copy quotes to clipboard
- Navigate home by clicking the BookQuotes logo or using the browser back button
- Persistent cloud storage — your library is available across devices

## Prerequisites

- Node.js 18+
- A [Turso](https://turso.tech) account (free tier)
- A [Clerk](https://clerk.com) account (free tier)
- (Optional) [Vercel](https://vercel.com) account for deployment

## Account Setup

### Turso (Database)

1. Sign up at [turso.tech](https://turso.tech)
2. Install the Turso CLI:
   ```bash
   npm install -g @turso/cli
   ```
3. Log in:
   ```bash
   turso auth login
   ```
4. Create a database:
   ```bash
   turso db create bookquotes
   ```
5. Get your database URL:
   ```bash
   turso db show bookquotes --url
   ```
   This gives you the `TURSO_DATABASE_URL` (e.g. `libsql://bookquotes-yourname.turso.io`)
6. Create an auth token:
   ```bash
   turso db tokens create bookquotes
   ```
   This gives you the `TURSO_AUTH_TOKEN`

### Clerk (Authentication)

1. Sign up at [clerk.com](https://clerk.com)
2. Create a new application in the Clerk dashboard
3. Enable **Google** as a social login provider (under **User & Authentication > Social connections**)
4. Go to **API Keys** in the dashboard to find:
   - `CLERK_PUBLISHABLE_KEY` — starts with `pk_test_...`
   - `CLERK_SECRET_KEY` — starts with `sk_test_...`

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/felixbaumgartner/BookQuotes.git
cd BookQuotes
```

### 2. Install dependencies

```bash
npm run install:all
```

### 3. Configure environment variables

Create `server/.env`:

```env
SERVER_PORT=3001

# Turso Database
TURSO_DATABASE_URL=libsql://your-db-name.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token

# Clerk Authentication
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
```

Create `client/.env`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

A `.env.example` file is included in the repo for reference.

### 4. Start development

```bash
npm run dev
```

This starts both:
- **Client** on [http://localhost:5173](http://localhost:5173) (Vite dev server)
- **Server** on [http://localhost:3001](http://localhost:3001) (Express API)

The client proxies `/api` requests to the server in development.

## Deploying to Vercel

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Set the following environment variables in the Vercel dashboard:

   | Variable | Value |
   |----------|-------|
   | `TURSO_DATABASE_URL` | Your Turso database URL |
   | `TURSO_AUTH_TOKEN` | Your Turso auth token |
   | `CLERK_SECRET_KEY` | Your Clerk secret key |
   | `CLERK_PUBLISHABLE_KEY` | Your Clerk publishable key |
   | `VITE_CLERK_PUBLISHABLE_KEY` | Your Clerk publishable key (same as above) |

4. Deploy. The `vercel.json` config handles build settings and API rewrites automatically.

## Project Structure

```
├── api/                    # Vercel serverless entry point
│   └── index.ts
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── utils/          # Utilities (PDF export)
│   │   ├── App.tsx         # Main application + auth guards
│   │   ├── api.ts          # API client with auth headers
│   │   ├── main.tsx        # Entry point with ClerkProvider
│   │   ├── types.ts        # TypeScript types
│   │   └── index.css       # Tailwind + custom styles
│   └── index.html
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── db.ts           # Turso database setup
│   │   ├── scraper.ts      # Goodreads scraping logic
│   │   └── index.ts        # Express app + Clerk middleware
├── vercel.json             # Vercel deployment config
└── .env.example            # Environment variable template
```

## API Endpoints

All `/api` routes require authentication (Clerk Bearer token).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search?q={query}` | Search Goodreads for books |
| POST | `/api/books/:workId/scrape` | Scrape quotes for a book (SSE stream) |
| GET | `/api/books` | List all saved books for the current user |
| GET | `/api/books/:id` | Get book details |
| GET | `/api/books/:id/quotes?sort=likes&search=keyword` | Get quotes for a book |
| DELETE | `/api/books/:id` | Delete a book and its quotes |
| GET | `/api/health` | Health check (no auth required) |
