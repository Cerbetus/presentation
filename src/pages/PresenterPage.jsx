import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useRealtimeCommands } from "../hooks/useRealtimeCommands";
import { getProvider } from "../providers";
import {
  buildAccountKey,
  buildSessionChannel,
} from "../lib/presentationKey";
import { useSession } from "../hooks/useAuth";
import Footer from "../components/Footer";

const COMMAND_LABELS = {
  next: "Next slide",
  prev: "Previous slide",
  first: "Reset to slide 1",
};

function getFullscreenElement() {
  if (typeof document === "undefined") return null;
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement ||
    null
  );
}

function requestFullscreen(target) {
  const element = target ?? document.documentElement;
  if (!element) return Promise.reject(new Error("Missing fullscreen target"));
  const request =
    element.requestFullscreen ||
    element.webkitRequestFullscreen ||
    element.mozRequestFullScreen ||
    element.msRequestFullscreen;
  if (request) return request.call(element);

  const fallback =
    document.documentElement?.requestFullscreen ||
    document.documentElement?.webkitRequestFullscreen ||
    document.documentElement?.mozRequestFullScreen ||
    document.documentElement?.msRequestFullscreen;

  if (!fallback) return Promise.reject(new Error("Fullscreen not supported"));
  return fallback.call(document.documentElement);
}

function exitFullscreen() {
  if (typeof document === "undefined") return Promise.resolve();
  const exit =
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.mozCancelFullScreen ||
    document.msExitFullscreen;
  if (!exit) return Promise.resolve();
  return exit.call(document);
}

export default function PresenterPage() {
  const { sessionId } = useParams();
  const session = useSession();
  const [deck, setDeck] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides, setTotalSlides] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [renderNonce, setRenderNonce] = useState(0);
  const [showControlHelp, setShowControlHelp] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [error, setError] = useState(null);

  const totalSlidesRef = useRef(totalSlides);
  const rootRef = useRef(null);
  const viewerRef = useRef(null);
  const fullscreenTargetRef = useRef(null);
  const wasFullscreenRef = useRef(false);

  useEffect(() => {
    totalSlidesRef.current = totalSlides;
  }, [totalSlides]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!getFullscreenElement()) {
        const target =
          fullscreenTargetRef.current ??
          viewerRef.current ??
          rootRef.current ??
          document.documentElement;
        await requestFullscreen(target);
        return;
      }

      await exitFullscreen();
    } catch (err) {
      setToastMessage("Fullscreen blocked by browser.");
    }
  }, [setToastMessage]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(getFullscreenElement()));
    };

    const onFullscreenError = () => {
      setToastMessage("Fullscreen blocked by browser.");
    };

    onFullscreenChange();

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    document.addEventListener("mozfullscreenchange", onFullscreenChange);
    document.addEventListener("MSFullscreenChange", onFullscreenChange);
    document.addEventListener("fullscreenerror", onFullscreenError);
    document.addEventListener("webkitfullscreenerror", onFullscreenError);
    document.addEventListener("mozfullscreenerror", onFullscreenError);
    document.addEventListener("MSFullscreenError", onFullscreenError);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
      document.removeEventListener("mozfullscreenchange", onFullscreenChange);
      document.removeEventListener("MSFullscreenChange", onFullscreenChange);
      document.removeEventListener("fullscreenerror", onFullscreenError);
      document.removeEventListener("webkitfullscreenerror", onFullscreenError);
      document.removeEventListener("mozfullscreenerror", onFullscreenError);
      document.removeEventListener("MSFullscreenError", onFullscreenError);
    };
  }, [setToastMessage]);

  useEffect(() => {
    if (wasFullscreenRef.current && !isFullscreen) {
      setRenderNonce(Date.now());
    }
    wasFullscreenRef.current = isFullscreen;
  }, [isFullscreen]);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(""), 1600);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const handleCommand = useCallback((cmd) => {
    const total = totalSlidesRef.current;
    const label = COMMAND_LABELS[cmd.type];
    if (label) {
      setToastMessage(`Registered: ${label}`);
    }

    switch (cmd.type) {
      case "next":
        setCurrentSlide((s) => Math.min(s + 1, total));
        break;
      case "prev":
        setCurrentSlide((s) => Math.max(s - 1, 1));
        break;
      case "first":
        setCurrentSlide(1);
        break;
      default:
        break;
    }
  }, []);

  const accountKey = buildAccountKey(session?.user?.id);
  const accountChannel = buildSessionChannel(accountKey);
  const { sendState, channelStatus } = useRealtimeCommands(
    accountChannel,
    handleCommand
  );

  useEffect(() => {
    (async () => {
      const { data: sess, error: e1 } = await supabase
        .from("sessions")
        .select("*, decks(*)")
        .eq("id", sessionId)
        .single();

      if (e1) {
        setError(e1.message);
        return;
      }

      setDeck(sess.decks);
      setTotalSlides(sess.decks.slide_count || 20);

      const { data: urlData } = await supabase.storage
        .from("decks")
        .createSignedUrl(sess.decks.storage_path, 3600);

      if (urlData?.signedUrl) setFileUrl(urlData.signedUrl);
    })();
  }, [sessionId]);

  useEffect(() => {
    function onKey(e) {
      switch (e.key) {
        case "ArrowRight":
        case " ":
          setCurrentSlide((s) => Math.min(s + 1, totalSlides));
          break;
        case "ArrowLeft":
          setCurrentSlide((s) => Math.max(s - 1, 1));
          break;
        case "Home":
          setCurrentSlide(1);
          break;
        case "End":
          setCurrentSlide(totalSlides);
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
        default:
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleFullscreen, totalSlides]);

  const handleTotalSlidesKnown = useCallback((n) => setTotalSlides(n), []);

  const broadcastState = useCallback(() => {
    if (!deck || !accountKey) return;

    sendState({
      currentSlide,
      totalSlides,
      deckName: deck.name,
      sessionId,
      accountKey,
    });
  }, [accountKey, currentSlide, deck, sendState, sessionId, totalSlides]);

  useEffect(() => {
    broadcastState();
  }, [broadcastState]);

  useEffect(() => {
    if (channelStatus === "subscribed") {
      broadcastState();
    }
  }, [channelStatus, broadcastState]);

  useEffect(() => {
    if (!deck || !accountKey) return;
    const interval = window.setInterval(() => {
      broadcastState();
    }, 4000);
    return () => window.clearInterval(interval);
  }, [accountKey, broadcastState, deck]);

  if (error) {
    return (
      <div className="app-shell flex items-center justify-center px-6">
        <div className="glass-card p-6 text-center space-y-4 max-w-md">
          <p className="text-red-100">{error}</p>
          <Link to="/dashboard" className="glass-button">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="app-shell flex items-center justify-center px-6">
        <div className="glass-panel px-6 py-4 animate-pulse">Loading session…</div>
      </div>
    );
  }

  const provider = getProvider();
  const Viewer = provider.SlideViewer;
  const origin =
    typeof window === "undefined" ? "https://<yourdomain>" : window.location.origin;
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
  const functionBaseUrl = supabaseUrl
    ? `${supabaseUrl}/functions/v1/post-command`
    : null;

  const shortcutUrls = accountKey
    ? {
        next: functionBaseUrl
          ? `${functionBaseUrl}?key=${encodeURIComponent(accountKey)}&action=next_slide`
          : `${origin}/present/${accountKey}/next_slide`,
        prev: functionBaseUrl
          ? `${functionBaseUrl}?key=${encodeURIComponent(accountKey)}&action=prev_slide`
          : `${origin}/present/${accountKey}/prev_slide`,
        reset: functionBaseUrl
          ? `${functionBaseUrl}?key=${encodeURIComponent(accountKey)}&action=reset_slide`
          : `${origin}/present/${accountKey}/reset_slide`,
      }
    : null;

  const stageStyle = isFullscreen
    ? undefined
    : { maxHeight: "calc(100vh - 260px)" };

  return (
    <div
      ref={rootRef}
      className={`app-shell flex flex-col ${isFullscreen ? "bg-black" : ""}`}
    >
      {toastMessage && (
        <div className="fixed top-4 left-4 z-50 rounded-full border border-emerald-300/40 bg-emerald-400/20 px-4 py-2 text-sm text-emerald-100 shadow-lg">
          {toastMessage}
        </div>
      )}

      {!isFullscreen && (
        <header className="app-nav relative">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="glass-button glass-button-ghost text-sm">
              Dashboard
            </Link>
            <span className="text-sm muted">{deck.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowControlHelp((v) => !v)}
              className="glass-button text-sm"
              title="Control setup"
            >
              Control setup
            </button>
          </div>

          {showControlHelp && (
            <div className="absolute right-6 top-[72px] w-[30rem] max-w-[calc(100vw-3rem)] glass-card p-4 text-xs space-y-3 z-40">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Remote control</p>
                <span className="pill">Live</span>
              </div>
              <p className="muted">
                Open /control on your phone or tablet and sign in once with this account. It
                stays connected and shows the current slide.
              </p>
              <div className="glass-panel p-3">
                <p className="text-[10px] uppercase tracking-[0.3em] muted">Account key</p>
                <p className="text-sm font-semibold tracking-[0.3em]">{accountKey}</p>
              </div>
              {shortcutUrls ? (
                <div className="space-y-1">
                  <p className="muted">Account-wide shortcut URLs (optional):</p>
                  <code className="block text-sky-200 break-all">Next: {shortcutUrls.next}</code>
                  <code className="block text-sky-200 break-all">Previous: {shortcutUrls.prev}</code>
                  <code className="block text-sky-200 break-all">Reset: {shortcutUrls.reset}</code>
                </div>
              ) : (
                <p className="muted">Shortcut URLs are unavailable until your account key loads.</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Link to="/control" className="glass-button glass-button-primary text-xs">
                  Open /control
                </Link>
                <Link to="/settings/control" className="glass-button text-xs">
                  Control settings
                </Link>
              </div>
            </div>
          )}
        </header>
      )}

      <main
        ref={viewerRef}
        className={`flex-1 flex ${
          isFullscreen
            ? "p-0 w-screen h-screen"
            : "items-center justify-center px-6 py-8"
        }`}
      >
        <div className={isFullscreen ? "w-full h-full" : "w-full max-w-6xl"}>
          <div className={isFullscreen ? "" : "glass-panel p-4"}>
            <Viewer
              fileUrl={fileUrl}
              currentSlide={currentSlide}
              totalSlides={totalSlides}
              onTotalSlidesKnown={handleTotalSlidesKnown}
              fullscreen={isFullscreen}
              fullscreenTargetRef={fullscreenTargetRef}
              renderNonce={renderNonce}
              style={stageStyle}
            />
          </div>
        </div>
      </main>

      {!isFullscreen && (
        <>
          <footer className="flex items-center justify-center gap-3 px-6 py-4 border-t border-white/10">
            <button
              onClick={() => setCurrentSlide((s) => Math.max(s - 1, 1))}
              className="glass-button text-sm"
            >
              ◀ Prev
            </button>
            <span className="pill tabular-nums">
              {currentSlide} / {totalSlides}
            </span>
            <button
              onClick={() => setCurrentSlide((s) => Math.min(s + 1, totalSlides))}
              className="glass-button glass-button-primary text-sm"
            >
              Next ▶
            </button>
            <button
              onClick={() => toggleFullscreen()}
              className="glass-button text-sm"
            >
              Fullscreen
            </button>
          </footer>
          <Footer />
        </>
      )}

    </div>
  );
}
