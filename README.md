# Priority Day Planner (Vite + React + Tailwind)

Franklin-Covey–style day planner: send tasks to a priority stack (top = most important), reorder by drag-and-drop, and carry unfinished items to the next day. Data is stored in your browser (localStorage).

## Local Setup

1) Install Node.js (LTS) from https://nodejs.org/
2) In a terminal:
```bash
npm install
npm run dev
```
Open the shown URL (usually http://localhost:5173).

## Build for Production
```bash
npm run build
npm run preview
```

## Deploy (Vercel — easiest)
1. Create a GitHub repo and push this folder.
2. Go to https://vercel.com/ → New Project → Import your repo.
3. Framework preset: **Vite** (Vercel auto-detects). No env vars required.
4. Click **Deploy**.

## Deploy (Netlify)
1. Create a GitHub repo and push this folder.
2. Go to https://app.netlify.com → Add new site → Import from Git.
3. Build command: `npm run build`
   Publish directory: `dist`
4. Deploy. Netlify will assign a URL; you can set a custom domain later.

## Notes
- All data persists in localStorage (`fc_tasks_v1`). Publishing a new version won’t affect existing users’ saved tasks unless you change the key.
- If you want cloud sync later, add a backend (Supabase, Firebase, or a simple API) and store tasks keyed by a user id.
