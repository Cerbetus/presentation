# Presentation Remote

A private presentation app built with **React + Tailwind CSS** and **Supabase** (Auth, Storage, Realtime, Edge Functions). Upload your PPTX decks, create live sessions, and control slides in realtime from an Apple Watch / iPhone using large-button remote controls.

---

## Features

| Feature | Description |
|---|---|
| **Auth** | Email/password login via Supabase Auth. Only authenticated users can access the app. |
| **Deck management** | Upload `.pptx` files to Supabase Storage. List, present, and delete your decks. |
| **Live sessions** | Create a presentation session for any deck. Sessions use Supabase Realtime for instant command delivery. |
| **Presenter view** | Full-screen slide viewer that reacts to remote commands (next, prev, blank, first, last, play/pause). Keyboard shortcuts also work. |
| **Remote control** | Large-button page optimised for Apple Watch (via iPhone relay) and iPhones. Tap to control the presenter in realtime. |
| **Edge Function** | `post-command` endpoint for posting commands securely with auth verification. Useful for iOS Shortcuts or external integrations. |
| **RLS** | Strict Row Level Security — users only see and control their own decks, sessions, and commands. |
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

### 3. Database setup

Run the SQL migration in your Supabase project:

1. Open **Supabase Dashboard → SQL Editor**.
2. Paste the contents of `supabase/migrations/20240101000000_init.sql`.
3. Click **Run**.

This creates the `decks`, `sessions`, and `commands` tables with RLS policies, and a private `decks` storage bucket.

### 4. Deploy the Edge Function (optional)

If you want the `post-command` Edge Function (useful for iOS Shortcuts / external API calls):

```bash
npx supabase functions deploy post-command --project-ref <your-project-ref>
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). You will be redirected to the login page.

### 6. Build for production

```bash
npm run build
npm run preview   # preview the production build locally
```

Deploy the `dist/` folder to any static host (Vercel, Netlify, Cloudflare Pages, etc.).

---

## How it works

### Flow

1. **Sign in** with email + password.
2. **Upload a PPTX** from the dashboard.
3. Click **Present** to create a session and open the presenter view.
4. Click **Open Remote ↗** (link in presenter header) to open the remote control in a new tab or on your phone.
5. **Tap buttons** on the remote to control slides in realtime.

### Apple Watch / iPhone remote

The remote page (`/remote/:sessionId`) is designed with large tap targets that work well on small screens:

1. Open the remote URL on your **iPhone** (Safari).
2. The page works fullscreen — **Add to Home Screen** for an app-like experience.
3. On **Apple Watch**, use an iOS Shortcut that opens the remote URL, or use the Shortcuts app to POST to the Edge Function endpoint.

#### iOS Shortcuts integration (advanced)

Create a Shortcut on your iPhone/Watch that calls the Edge Function:

```
POST https://<project>.supabase.co/functions/v1/post-command
Headers:
  Authorization: Bearer <your-access-token>
  Content-Type: application/json
Body:
  { "session_id": "<uuid>", "type": "next" }
```

Command types: `next`, `prev`, `first`, `last`, `blank`, `playpause`, `goto` (with `"slide": N`).

### Keyboard shortcuts (presenter view)

| Key | Action |
|---|---|
| → / Space | Next slide |
| ← | Previous slide |
| B | Toggle blank screen |
| Home | First slide |
| End | Last slide |

---

## PPTX rendering fidelity

### ⚠️ Important

The MVP ships with a **basic placeholder renderer** (`BasicProvider`) that shows slide numbers and a download link. It does **not** render actual slide content, animations, transitions, or embedded video.

### Why?

Faithful PPTX rendering in a browser is a hard problem. Most open-source JS libraries lose animations, transitions, SmartArt, and video. The reliable solutions are:

1. **Microsoft 365 / Office Online embed** — upload to OneDrive, embed via iframe. Best fidelity.
2. **Third-party render API** (Aspose, GroupDocs, iSpring) — server-side conversion to HTML5/video.
3. **Server-side video rendering** — convert to video with animations baked in.

### Provider architecture

The app uses a provider abstraction (`src/providers/`):

```
src/providers/
  index.js              ← Provider registry (ordered by preference)
  BasicProvider.jsx     ← MVP fallback (placeholder)
  Office365Provider.jsx ← Extension point for MS 365 embed
  ThirdPartyProvider.jsx← Extension point for render API
```

To add a new provider:

1. Create a file in `src/providers/` exporting `{ name, canRender(file), SlideViewer }`.
2. `SlideViewer` receives `{ fileUrl, currentSlide, totalSlides, onTotalSlidesKnown }`.
3. Register it in `src/providers/index.js` (higher priority = earlier in the array).

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
│   │   └── supabase.js          # Supabase client
│   ├── hooks/
│   │   ├── useAuth.jsx          # Auth context + hook
│   │   └── useRealtimeCommands.js # Realtime channel hook
│   ├── components/
│   │   └── ProtectedRoute.jsx   # Auth guard
│   ├── pages/
│   │   ├── LoginPage.jsx        # Login / signup form
│   │   ├── DashboardPage.jsx    # Deck list + upload + session creation
│   │   ├── PresenterPage.jsx    # Live slide viewer
│   │   └── RemotePage.jsx       # Large-button remote control
│   └── providers/
│       ├── index.js             # Provider registry
│       ├── BasicProvider.jsx    # MVP placeholder renderer
│       ├── Office365Provider.jsx# MS 365 extension point
│       └── ThirdPartyProvider.jsx# 3rd-party extension point
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   └── 20240101000000_init.sql  # Tables, RLS, storage bucket
│   └── functions/
│       └── post-command/
│           └── index.ts         # Edge Function for commands
└── README.md
```

---

## Environment variables reference

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Your Supabase anon/public key |
| `VITE_MS_CLIENT_ID` | ❌ | Azure AD client ID (for Office365Provider) |
| `VITE_MS_TENANT_ID` | ❌ | Azure AD tenant ID (for Office365Provider) |
| `VITE_RENDER_API_KEY` | ❌ | API key for third-party render service |

---

## License

Private project.
