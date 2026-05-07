import { Link } from "react-router-dom";
import { useSession } from "../hooks/useAuth";
import Footer from "../components/Footer";

export default function HomePage() {
  const session = useSession();
  const primaryHref = session ? "/dashboard" : "/login";
  const primaryLabel = session ? "Open dashboard" : "Sign in";

  return (
    <div className="app-shell">
      <header className="app-nav">
        <Link to="/" className="brand">
          Presentation Remote
        </Link>
        <div className="nav-links">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/control">Control</Link>
          <Link to="/settings/control">Control Settings</Link>
        </div>
        <Link to={primaryHref} className="glass-button glass-button-primary">
          {primaryLabel}
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16 space-y-16">
        <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] items-center">
          <div className="space-y-6 fade-in">
            <div className="glass-badge">Cerbets TM</div>
            <h1 className="display-title">Control slides from any device.</h1>
            <p className="muted text-lg">
              Present on any deck with a phone or tablet synced in real time.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to={primaryHref} className="glass-button glass-button-primary">
                {primaryLabel}
              </Link>
              <Link to="/control" className="glass-button">
                Open /control
              </Link>
            </div>
          </div>
          <div className="glass-card p-8 space-y-6 stagger">
            <div className="liquid-ring mx-auto">
              <div className="text-center">
                <p className="text-xs muted uppercase tracking-[0.3em]">Control</p>
                <p className="text-2xl font-semibold">Connected</p>
              </div>
            </div>
            <div className="space-y-2 text-center">
              <p className="section-title">Realtime control</p>
              <p className="muted">
                Current slide updates instantly while you present.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-panel p-3 text-center">
                <p className="text-xs muted">Status</p>
                <p className="font-semibold">Synced</p>
              </div>
              <div className="glass-panel p-3 text-center">
                <p className="text-xs muted">Controls</p>
                <p className="font-semibold">Instant</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "One account key",
              text: "Use a single key across all decks. Your device stays connected to the active presentation.",
            },
            {
              title: "Realtime commands",
              text: "Supabase Realtime delivers next, previous, and reset commands instantly.",
            },
            {
              title: "Device stays connected",
              text: "Sign in once on your phone or tablet and keep it synced across every deck.",
            },
          ].map((item) => (
            <div key={item.title} className="glass-panel p-5 space-y-2">
              <p className="font-semibold">{item.title}</p>
              <p className="muted text-sm">{item.text}</p>
            </div>
          ))}
        </section>

        <section className="glass-card p-8 space-y-6">
          <div className="space-y-2">
            <p className="section-title">How it works</p>
            <p className="muted">
              Sign in once on every device and stay connected throughout your
              talk.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="glass-panel p-4 space-y-2">
              <p className="font-semibold">1. Sign in</p>
              <p className="muted text-sm">Use the same account on Mac, phone, and tablet.</p>
            </div>
            <div className="glass-panel p-4 space-y-2">
              <p className="font-semibold">2. Present</p>
              <p className="muted text-sm">Start a session from your dashboard deck list.</p>
            </div>
            <div className="glass-panel p-4 space-y-2">
              <p className="font-semibold">3. Control</p>
              <p className="muted text-sm">Open /control once and command slides with live status.</p>
            </div>
          </div>
        </section>

        <section className="flex flex-col md:flex-row items-center justify-between gap-6 glass-card p-8">
          <div>
            <p className="section-title">Ready for your next keynote?</p>
            <p className="muted">Keep the presenter running and your device stays synced.</p>
          </div>
          <Link to={primaryHref} className="glass-button glass-button-primary">
            {primaryLabel}
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
