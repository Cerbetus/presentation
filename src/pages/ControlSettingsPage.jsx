import { Link } from "react-router-dom";
import { useSession } from "../hooks/useAuth";
import { buildAccountKey } from "../lib/presentationKey";
import Footer from "../components/Footer";

export default function ControlSettingsPage() {
  const session = useSession();
  const accountKey = buildAccountKey(session?.user?.id);
  const origin =
    typeof window === "undefined" ? "https://<yourdomain>" : window.location.origin;

  const shortcutUrls = accountKey
    ? {
        next: `${origin}/present/${accountKey}/next_slide`,
        prev: `${origin}/present/${accountKey}/prev_slide`,
        reset: `${origin}/present/${accountKey}/reset_slide`,
      }
    : null;

  return (
    <div className="app-shell">
      <header className="app-nav">
        <Link to="/" className="brand">
          Presentation Remote
        </Link>
        <div className="nav-links">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/control">Control</Link>
        </div>
        <Link to="/control" className="glass-button glass-button-primary">
          Open /control
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 space-y-8">
        <div className="space-y-2">
          <p className="glass-badge">Remote Control</p>
          <h1 className="display-title">Connect once. Stay synced.</h1>
          <p className="muted max-w-2xl">
            Open /control on your phone or tablet, sign in with the same account, and
            keep it synced to the current slide.
          </p>
        </div>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="glass-card p-6 space-y-4">
            <h2 className="section-title">Control sign-in</h2>
            <ol className="space-y-3 text-sm muted">
              <li>1. Open the device browser and go to /control.</li>
              <li>2. Sign in once with the same account as your presenter.</li>
              <li>3. Keep the page open; it updates live with the current slide.</li>
            </ol>
            <div className="glass-panel p-4 space-y-2">
              <p className="text-xs muted">Control URL</p>
              <p className="text-sm text-sky-200 break-all">{origin}/control</p>
            </div>
          </div>

          <div className="glass-card p-6 space-y-4">
            <h2 className="section-title">Account-wide shortcut key</h2>
            <p className="muted text-sm">
              Use this key if you still prefer shortcut URLs. The same key works across all decks.
            </p>
            <div className="glass-panel p-4 space-y-2">
              <p className="text-xs muted">Account key</p>
              <p className="text-lg font-semibold tracking-[0.25em]">{accountKey}</p>
            </div>
            {shortcutUrls && (
              <div className="space-y-2 text-sm">
                <p className="muted">Shortcut URLs</p>
                <code className="block text-sky-200 break-all">Next: {shortcutUrls.next}</code>
                <code className="block text-sky-200 break-all">Previous: {shortcutUrls.prev}</code>
                <code className="block text-sky-200 break-all">Reset: {shortcutUrls.reset}</code>
              </div>
            )}
            <p className="muted text-xs">
              Keep these URLs in Shortcuts if you prefer tapping actions there.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
