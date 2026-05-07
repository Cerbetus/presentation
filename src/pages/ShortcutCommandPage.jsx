import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { buildSessionChannel } from "../lib/presentationKey";
import Footer from "../components/Footer";

const ACTION_TO_COMMAND = {
  next_slide: "next",
  prev_slide: "prev",
  reset_slide: "first",
};

function parseShortcutAction(shortcutAction) {
  const action = String(shortcutAction ?? "").trim().toLowerCase();
  const type = ACTION_TO_COMMAND[action];

  if (!type) return null;

  return {
    action,
    type,
  };
}

export default function ShortcutCommandPage() {
  const { accountKey, shortcutAction } = useParams();
  const [status, setStatus] = useState("Sending command...");
  const [error, setError] = useState(null);
  const parsed = useMemo(
    () => parseShortcutAction(shortcutAction),
    [shortcutAction]
  );
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
  const functionBaseUrl = supabaseUrl
    ? `${supabaseUrl}/functions/v1/post-command`
    : "";

  useEffect(() => {
    if (!accountKey || !parsed) {
      setError(
        "Invalid shortcut URL. Use next_slide, prev_slide, or reset_slide."
      );
      setStatus(null);
      return;
    }

    let disposed = false;
    let activeChannel = null;
    let subscribeTimeout = null;
    let settled = false;
    let requestController = null;
    let requestTimeout = null;
    const normalizedKey = accountKey.trim().toLowerCase();

    setError(null);
    setStatus("Sending command...");

    (async () => {
      if (!/^[a-z0-9]{2,32}$/.test(normalizedKey)) {
        setError(
          "Invalid or expired shortcut URL. Open Control settings to copy your account key."
        );
        setStatus(null);
        return;
      }

      if (functionBaseUrl) {
        requestController = new AbortController();
        requestTimeout = window.setTimeout(() => requestController.abort(), 6000);

        try {
          const url = new URL(functionBaseUrl);
          url.searchParams.set("key", normalizedKey);
          url.searchParams.set("action", parsed.action);

          const response = await fetch(url.toString(), {
            method: "GET",
            cache: "no-store",
            signal: requestController.signal,
          });

          let payload = null;
          try {
            payload = await response.json();
          } catch {
            payload = null;
          }

          if (disposed) return;

          if (!response.ok || !payload?.delivered) {
            setError(payload?.error || "Failed to send command.");
            setStatus(null);
            return;
          }

          setStatus(`Sent: ${parsed.action}`);
          return;
        } catch (err) {
          if (disposed) return;
          if (err?.name === "AbortError") {
            setError("Request timed out. Try again.");
          } else {
            setError("Unable to reach presentation session.");
          }
          setStatus(null);
          return;
        } finally {
          if (requestTimeout) window.clearTimeout(requestTimeout);
        }
      }

      const channelName = buildSessionChannel(normalizedKey);
      const channel = supabase.channel(channelName);
      activeChannel = channel;

      // Prevent indefinite "Sending command…" when the channel cannot subscribe.
      subscribeTimeout = window.setTimeout(() => {
        if (disposed || settled) return;
        settled = true;
        setError("Unable to reach presentation session.");
        setStatus(null);
        if (activeChannel) {
          supabase.removeChannel(activeChannel);
          activeChannel = null;
        }
      }, 5000);

      channel.subscribe(async (channelStatus) => {
        if (disposed || settled) return;

        if (channelStatus === "SUBSCRIBED") {
          if (subscribeTimeout) {
            window.clearTimeout(subscribeTimeout);
            subscribeTimeout = null;
          }

          const sendStatus = await channel.send({
            type: "broadcast",
            event: "command",
            payload: {
              type: parsed.type,
              ts: Date.now(),
            },
          });

          if (disposed) return;

          if (sendStatus === "ok") {
            settled = true;
            setStatus(`Sent: ${parsed.action}`);
          } else {
            settled = true;
            setError("Failed to send command.");
            setStatus(null);
          }

          supabase.removeChannel(channel);
          activeChannel = null;
          return;
        }

        if (
          channelStatus === "TIMED_OUT" ||
          channelStatus === "CLOSED" ||
          channelStatus === "CHANNEL_ERROR"
        ) {
          settled = true;
          if (subscribeTimeout) {
            window.clearTimeout(subscribeTimeout);
            subscribeTimeout = null;
          }

          setError("Unable to reach presentation session.");
          setStatus(null);
          if (activeChannel) {
            supabase.removeChannel(activeChannel);
            activeChannel = null;
          }
        }
      });
    })();

    return () => {
      disposed = true;
      if (requestController) requestController.abort();
      if (requestTimeout) window.clearTimeout(requestTimeout);
      if (subscribeTimeout) window.clearTimeout(subscribeTimeout);
      if (activeChannel) supabase.removeChannel(activeChannel);
    };
  }, [parsed, accountKey, functionBaseUrl]);

  if (error) {
    return (
      <div className="app-shell">
        <header className="app-nav">
          <Link to="/" className="brand">
            Presentation Remote
          </Link>
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/control">Control</Link>
          </div>
        </header>

        <main className="flex items-center justify-center p-6">
          <div className="glass-card p-6 text-center space-y-4 max-w-lg">
            <p className="text-red-100">{error}</p>
            <p className="muted text-sm">
              Example: <span className="text-sky-200">/present/&lt;account-key&gt;/next_slide</span>
            </p>
            <Link to="/settings/control" className="glass-button">
              Control settings
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
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
        </div>
      </header>

      <main className="flex items-center justify-center p-6">
        <div className="glass-card p-6 text-center space-y-3">
          <p className="text-lg">{status}</p>
          <p className="text-xs muted">
            Key: <span className="text-sky-200">{accountKey}</span>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
