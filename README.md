# AYB Event Dashboard (Next.js, Frontend Only)

This project is now migrated to Next.js (App Router) and remains frontend-only for Vercel deployment.

## Features

- Preloaded with your current event dataset.
- Two-page flow:
  - `/` dashboard for read-only statistics and event summary.
  - `/manage` for add/edit/delete/reset actions.
- Totals update instantly:
  - Total Registrations
  - Total Attendees
  - Upcoming Registrations
  - Attendee Rate
- Dashboard filters by search, group, and status.
- Group-level registration bars and upcoming event focus list update in real time.
- Quick add, inline edit, delete, import, and export events.
- Data persists in browser `localStorage` (no backend).
- Reset button to restore original data.

## Data Storage

This deployment is frontend only. Vercel serves the static files, and event edits are saved in the visitor's browser with `localStorage`.

That means data is not shared across devices, browsers, or users. Use the JSON export/import tools on `manage.html` when you need a manual backup or transfer.

## Run Locally

Install dependencies and run the development server:

```powershell
npm install
npm run dev
```

Then visit `http://localhost:3000`.

## Deploy to Vercel

1. Push this folder to a Git repository.
2. Import the repository in Vercel.
3. Framework preset: `Next.js`.
4. Keep default build settings.
5. Deploy.

No database or backend setup is required.
