# BookQuotes — Goodreads Book Quotes Scraper

A single-page web application that lets you search for a book by name, scrapes all quotes for that book from Goodreads, stores them locally in SQLite, and displays them in a clean, browsable interface.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Scraping**: Cheerio + Axios
- **Storage**: SQLite via better-sqlite3

## Getting Started

### Prerequisites

- Node.js 18+

### Install Dependencies

```bash
npm run install:all
```

### Start Development

```bash
npm run dev
```

This starts both:
- **Client** on [http://localhost:5173](http://localhost:5173) (Vite dev server)
- **Server** on [http://localhost:3001](http://localhost:3001) (Express API)

The client proxies `/api` requests to the server in development.

### Configuration

Copy `.env.example` to `.env` in the root directory:

```bash
cp .env.example .env
```

Available settings:
- `SERVER_PORT` — Express server port (default: 3001)
- `CLIENT_PORT` — Vite dev server port (default: 5173)
- `SCRAPE_DELAY_MS` — Delay between page requests in ms (default: 1500)

## Project Structure

```
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── App.tsx         # Main application
│   │   ├── api.ts          # API client
│   │   ├── types.ts        # TypeScript types
│   │   └── index.css       # Tailwind + custom styles
│   └── index.html
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── db.ts           # SQLite database setup
│   │   ├── scraper.ts      # Goodreads scraping logic
│   │   └── index.ts        # Express app entry
│   └── data/               # SQLite database (auto-created)
└── .env.example
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search?q={query}` | Search Goodreads for books |
| POST | `/api/books/:workId/scrape` | Start scraping quotes (SSE stream) |
| GET | `/api/books` | List all saved books |
| GET | `/api/books/:id` | Get book details |
| GET | `/api/books/:id/quotes?sort=likes&search=keyword` | Get quotes for a book |
| DELETE | `/api/books/:id` | Delete book and its quotes |

## Features

- Search Goodreads for books by title or author
- Scrape all quotes with real-time progress via Server-Sent Events
- Browse, search, and filter quotes
- Sort quotes by most liked or page order
- Click-to-copy quotes to clipboard
- Persistent local storage with SQLite
- Saved books library for quick access
