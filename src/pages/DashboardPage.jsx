import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSession } from "../hooks/useAuth";
import { buildAccountKey } from "../lib/presentationKey";
import Footer from "../components/Footer";

const MAX_USER_STORAGE_BYTES = 20 * 1024 * 1024;

function getObjectSizeBytes(item) {
  if (typeof item?.metadata?.size === "number") return item.metadata.size;
  if (typeof item?.metadata?.size === "string") {
    const parsed = Number.parseInt(item.metadata.size, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof item?.size === "number") return item.size;
  return 0;
}

function formatBytes(bytes) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

export default function DashboardPage() {
  const session = useSession();
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);
  const [usedBytes, setUsedBytes] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const userId = session?.user?.id;
  const accountKey = buildAccountKey(userId);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!userId) return;

    async function loadDecks() {
      const [{ data, error: err }, { data: objects, error: storageErr }] =
        await Promise.all([
          supabase
            .from("decks")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase.storage.from("decks").list(userId, { limit: 1000 }),
        ]);

      if (err) {
        setError(err.message);
      } else {
        setDecks(data ?? []);
      }

      if (storageErr) {
        setError(storageErr.message);
      } else {
        const totalBytes = (objects ?? []).reduce(
          (sum, item) => sum + getObjectSizeBytes(item),
          0
        );
        setUsedBytes(totalBytes);
      }
    }

    loadDecks();
  }, [userId, refreshKey]);

  async function handleUpload(e) {
    if (!userId) {
      setError("Session expired. Please sign in again.");
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pptx")) {
      setError("Only .pptx files are supported.");
      return;
    }

    if (file.size > MAX_USER_STORAGE_BYTES) {
      setError("This file exceeds the 20 MB total account limit.");
      e.target.value = "";
      return;
    }

    setError(null);
    setUploading(true);

    const { data: objects, error: usageErr } = await supabase.storage
      .from("decks")
      .list(userId, { limit: 1000 });

    if (usageErr) {
      setError(usageErr.message);
      setUploading(false);
      e.target.value = "";
      return;
    }

    const currentUsageBytes = (objects ?? []).reduce(
      (sum, item) => sum + getObjectSizeBytes(item),
      0
    );

    if (currentUsageBytes + file.size > MAX_USER_STORAGE_BYTES) {
      setError(
        `Upload limit reached (20 MB per user). Current usage: ${formatBytes(
          currentUsageBytes
        )}.`
      );
      setUploading(false);
      e.target.value = "";
      return;
    }

    const filePath = `${userId}/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage
      .from("decks")
      .upload(filePath, file, { contentType: file.type });

    if (uploadErr) {
      setError(uploadErr.message);
      setUploading(false);
      return;
    }

    const { error: dbErr } = await supabase.from("decks").insert({
      user_id: userId,
      name: file.name,
      storage_path: filePath,
      slide_count: 20, // default; presenter can adjust later
    });

    if (dbErr) setError(dbErr.message);
    else refresh();

    setUploading(false);
    e.target.value = "";
  }

  async function handleDelete(deck) {
    if (!confirm(`Delete "${deck.name}"?`)) return;

    await supabase.storage.from("decks").remove([deck.storage_path]);
    await supabase.from("decks").delete().eq("id", deck.id);
    refresh();
  }

  async function handleCreateSession(deck) {
    const { data, error: err } = await supabase
      .from("sessions")
      .insert({ user_id: userId, deck_id: deck.id })
      .select()
      .single();

    if (err) {
      setError(err.message);
      return;
    }

    navigate(`/present/${data.id}`);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="app-shell">
      <header className="app-nav">
        <Link to="/" className="brand">
          Presentation Remote
        </Link>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/control">Control</Link>
          <Link to="/settings/control">Control Settings</Link>
        </div>
        <button onClick={handleSignOut} className="glass-button glass-button-ghost">
          Sign out
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div className="space-y-2">
          <p className="glass-badge">Dashboard</p>
          <h1 className="display-title">Your decks, always ready.</h1>
          <p className="muted max-w-2xl">
            Upload, present, and stay connected on any device with one account key.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="glass-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Deck library</h2>
              <span className="pill">{decks.length} decks</span>
            </div>

            <label className="glass-panel flex items-center justify-between gap-3 p-4 cursor-pointer hover:border-sky-300/40 transition">
              <div>
                <p className="font-medium">{uploading ? "Uploading…" : "Upload PPTX"}</p>
                <p className="text-xs muted">Max 20 MB per account</p>
              </div>
              <span className="glass-button glass-button-primary text-sm">Browse</span>
              <input
                type="file"
                accept=".pptx"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>

            <p className="text-xs muted">
              Storage used: {formatBytes(usedBytes)} / {formatBytes(MAX_USER_STORAGE_BYTES)}
            </p>

            {decks.length === 0 && (
              <p className="muted">No decks yet. Upload a PPTX to get started.</p>
            )}

            <ul className="space-y-3">
              {decks.map((deck) => (
                <li key={deck.id} className="glass-panel p-4 flex flex-col gap-4">
                  <div className="space-y-1">
                    <p className="font-medium">{deck.name}</p>
                    <p className="text-xs muted">
                      {deck.slide_count} slides • {new Date(deck.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs muted">Account key applies to every deck.</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleCreateSession(deck)}
                      className="glass-button glass-button-primary text-sm"
                    >
                      Present
                    </button>
                    <button
                      onClick={() => handleDelete(deck)}
                      className="glass-button text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <aside className="glass-card p-6 space-y-5">
            <div>
              <h2 className="section-title">Remote control</h2>
              <p className="muted text-sm">
                Sign in once on your phone or tablet and it will stay connected to whatever you present.
              </p>
            </div>

            <div className="glass-panel p-4 space-y-2">
              <p className="text-xs muted">Account key</p>
              <p className="text-lg font-semibold tracking-[0.2em]">{accountKey}</p>
              <p className="text-xs muted">
                Use this key for account-wide shortcut URLs if you still prefer shortcuts.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link to="/control" className="glass-button glass-button-primary">
                Open Control
              </Link>
              <Link to="/settings/control" className="glass-button">
                Control setup
              </Link>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
