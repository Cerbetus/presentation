# Presentation Remote

A private presentation app built with **React + Tailwind CSS** and **Supabase** (Auth, Storage, Realtime). Upload your PPTX decks, create live sessions, and control slides in realtime from an Apple Watch / iPhone using shortcut URLs.

---

## Features

| Feature | Description |
|---|---|
| **Auth** | Email/password login via Supabase Auth. Only authenticated users can access the app. |
| **Deck management** | Upload `.pptx` files to Supabase Storage (20 MB total per user). List, present, and delete your decks. |
| **Live sessions** | Create a presentation session for any deck. Sessions use Supabase Realtime for instant command delivery. |
| **Presenter view** | Slide viewer that reacts to remote commands (`next`, `prev`, `reset`) and keyboard shortcuts. |
| **Shortcut URL control** | Trigger next/prev/reset using a tiny stable presentation key (no per-session URL updates). |
| **RLS** | Strict Row Level Security — users only see and control their own decks, sessions, and storage objects. |
| **Provider abstraction** | Pluggable rendering providers. MVP ships with a basic placeholder renderer; extension points for Microsoft 365 embed and third-party render APIs. |

---

## Quick start

### Prerequisites

- **Node.js** ≥ 18
- A **Supabase** project (free tier works) — [supabase.com](https://supabase.com)

### 1. Clone & install

```bash
git clone https://github.com/Cerbetus/presentation.git
cd presentation
npm install
```

### 2. Environment variables

Copy the example and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

You can find these values in **Supabase Dashboard → Settings → API**.

### 2.1 Supabase Auth URL configuration (required for email confirmation)

In **Supabase Dashboard → Authentication → URL Configuration**:

- Set **Site URL** to your app URL (for local dev: `http://localhost:5173`)
- Add these **Redirect URLs**:
  - `http://localhost:5173/login`
  - Your production login URL (for example `https://your-domain.com/login`)

Without this, confirmation links may fail or not complete correctly.

### 3. Database setup

Run the SQL migrations in your Supabase project:

1. Open **Supabase Dashboard → SQL Editor**.
2. Run `supabase/migrations/20240101000000_init.sql`.
3. Run `supabase/migrations/20260418125000_storage_limit_20mb.sql`.
4. Run `supabase/migrations/20260418130500_drop_sessions_is_active.sql`.
5. Run `supabase/migrations/20260418131000_drop_commands_table.sql`.

This creates the `decks` and `sessions` tables with RLS policies, removes old unused fields/tables, provides a private `decks` storage bucket, and enforces a 20 MB per-user storage limit.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). You will be redirected to the login page.

### 5. Build for production

```bash
npm run build
npm run preview   # preview the production build locally
```

Deploy the `dist/` folder to any static host (Vercel, Netlify, Cloudflare Pages, etc.).
This repo includes `vercel.json` with SPA rewrites so deep links like `/present/<key>/next_slide` work on Vercel.

---

## How it works

### Flow

1. **Sign in** with email + password.
2. **Upload a PPTX** from the dashboard.
3. Click **Present** to create a session and open the presenter view.
4. Use Apple Watch / iPhone shortcut URLs with your presentation key to send commands.

### Apple Watch / iPhone shortcut URLs

Each deck now has a stable short **presentation key** (for example `c3e3`) shown in dashboard and presenter help (`?`).  
This key stays the same across new sessions, so you don't need to update your watch URL every time.

Use your production domain:

```
https://<yourdomain>/present/<presentation-key>/next_slide
https://<yourdomain>/present/<presentation-key>/prev_slide
https://<yourdomain>/present/<presentation-key>/reset_slide
```

`reset_slide` sends the presentation to slide 1.  
Supported shortcut actions: `next_slide`, `prev_slide`, `reset_slide`.

#### iOS Shortcut setup (step-by-step)

1. Start presentation on Mac and click `?` in presenter to see your URLs.
2. On iPhone, open **Shortcuts** and create shortcut **Next**.
3. Add action **URL** with `https://<yourdomain>/present/<presentation-key>/next_slide`.
4. Add action **Get Contents of URL** (method: `GET`).
5. Create two more shortcuts for:
   - `.../prev_slide`
   - `.../reset_slide`
6. In Watch app (or Shortcuts on Apple Watch), enable/show these shortcuts.
7. Keep presenter tab open and signed in with the same account.

### Keyboard shortcuts (presenter view)

| Key | Action |
|---|---|
| → / Space | Next slide |
| ← | Previous slide |
| Home | First slide |
| End | Last slide |

---

## PPTX rendering fidelity

### ⚠️ Important

The app now uses **Microsoft Office Online embed** (`Office365Provider`) as the active renderer.

### Why?

Faithful PPTX rendering in a browser is a hard problem. Office embed gives high fidelity for animations, transitions, SmartArt, and embedded media.

### Limitation

Office embed runs in a **cross-origin iframe**. Because of browser security rules, the parent app cannot call internal Office DOM controls directly. Slide changes are done by updating the Office embed URL, which may still trigger heavy reload behavior from Microsoft’s side.

### Renderer architecture

The renderer used by the app is:

```
src/providers/
  index.js              ← Office renderer registry
  Office365Provider.jsx ← Active PPTX renderer
```

---

## Project structure

```
├── index.html
├── package.json
├── vite.config.js
├── .env.example
├── src/
│   ├── main.jsx                 # Entry point
│   ├── index.css                # Tailwind import
│   ├── App.jsx                  # Router + auth wrapper
│   ├── lib/
│   │   ├── supabase.js          # Supabase client
│   │   └── presentationKey.js   # Stable presentation key helper
│   ├── hooks/
│   │   ├── useAuth.jsx          # Auth context + hook
│   │   └── useRealtimeCommands.js # Realtime channel hook
│   ├── components/
│   │   └── ProtectedRoute.jsx   # Auth guard
│   ├── pages/
│   │   ├── LoginPage.jsx        # Login / signup form
│   │   ├── DashboardPage.jsx    # Deck list + upload + session creation
│   │   ├── PresenterPage.jsx    # Live slide viewer
│   │   └── ShortcutCommandPage.jsx # URL-triggered shortcut commands
│   └── providers/
│       ├── index.js             # Office renderer registry
│       └── Office365Provider.jsx# Active PPTX renderer
├── supabase/
│   ├── config.toml
│   └── migrations/
│       ├── 20240101000000_init.sql           # Tables, RLS, storage bucket
│       ├── 20260418125000_storage_limit_20mb.sql # 20 MB per-user storage quota
│       ├── 20260418130500_drop_sessions_is_active.sql # Remove unused sessions.is_active field
│       └── 20260418131000_drop_commands_table.sql # Remove unused commands table
└── README.md
```

---

## Environment variables reference

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Your Supabase anon/public key |

---

## License

Private project.
