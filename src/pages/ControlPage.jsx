import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useRealtimeCommands } from "../hooks/useRealtimeCommands";
import { useSession } from "../hooks/useAuth";
import { buildAccountKey, buildSessionChannel } from "../lib/presentationKey";
import Footer from "../components/Footer";

export default function ControlPage() {
  const session = useSession();
  const accountKey = buildAccountKey(session?.user?.id);
  const channelName = useMemo(
    () => buildSessionChannel(accountKey),
    [accountKey]
  );

  const [remoteState, setRemoteState] = useState({
    deckName: "",
    currentSlide: null,
    totalSlides: null,
    sessionId: "",
  });
  const [lastUpdate, setLastUpdate] = useState(0);
  const [isStale, setIsStale] = useState(false);

  const handleState = useCallback((payload) => {
    if (!payload || typeof payload !== "object") return;
    setRemoteState({
      deckName: String(payload.deckName ?? ""),
      currentSlide: Number(payload.currentSlide ?? 0),
      totalSlides: Number(payload.totalSlides ?? 0),
      sessionId: String(payload.sessionId ?? ""),
    });
    setLastUpdate(payload.ts ? Number(payload.ts) : Date.now());
  }, []);

  const { sendCommand, channelStatus } = useRealtimeCommands(
    channelName,
    null,
    handleState
  );

  useEffect(() => {
    if (!lastUpdate) return;
    const timer = window.setInterval(() => {
      setIsStale(Date.now() - lastUpdate > 8000);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lastUpdate]);

  const connected = channelStatus === "subscribed";
  const hasLiveState = Boolean(lastUpdate) && !isStale;
  const statusLabel = connected
    ? hasLiveState
      ? "Live"
      : "Waiting for presenter"
    : "Connecting";

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
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/settings/control">Control Settings</Link>
        </div>
        <button onClick={handleSignOut} className="glass-button glass-button-ghost">
          Sign out
        </button>
      </header>

      <main className="flex items-center justify-center px-6 py-16">
        <div className="glass-card w-full max-w-md p-8 space-y-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="pill">{statusLabel}</span>
            <span className="pill">Key {accountKey}</span>
          </div>

          <div className="liquid-ring mx-auto">
            <div className="text-center">
              <p className="text-4xl font-semibold">
                {remoteState.currentSlide ? remoteState.currentSlide : "--"}
              </p>
              <p className="text-xs muted">
                of {remoteState.totalSlides ? remoteState.totalSlides : "--"}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="section-title">
              {remoteState.deckName || "Waiting for deck"}
            </p>
            <p className="muted text-sm">
              {remoteState.sessionId
                ? `Session ${remoteState.sessionId.slice(0, 8)}...`
                : "Start a presentation on your Mac to go live."}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => sendCommand("prev", { source: "control" })}
              disabled={!connected}
              className="glass-button text-sm disabled:opacity-60"
            >
              Prev
            </button>
            <button
              onClick={() => sendCommand("first", { source: "control" })}
              disabled={!connected}
              className="glass-button text-sm disabled:opacity-60"
            >
              Reset
            </button>
            <button
              onClick={() => sendCommand("next", { source: "control" })}
              disabled={!connected}
              className="glass-button glass-button-primary text-sm disabled:opacity-60"
            >
              Next
            </button>
          </div>

          <div className="text-xs muted">
            Keep this page open on your phone or tablet for live control.
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
