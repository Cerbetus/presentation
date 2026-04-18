import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useRealtimeCommands } from "../hooks/useRealtimeCommands";
import { getProvider } from "../providers";
import { buildPresentationKey } from "../lib/presentationKey";

const COMMAND_LABELS = {
  next: "Next slide",
  prev: "Previous slide",
  first: "Reset to slide 1",
};

export default function PresenterPage() {
  const { sessionId } = useParams();
  const [deck, setDeck] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides, setTotalSlides] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWatchHelp, setShowWatchHelp] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [error, setError] = useState(null);

  const totalSlidesRef = useRef(totalSlides);
  const rootRef = useRef(null);

  useEffect(() => {
    totalSlidesRef.current = totalSlides;
  }, [totalSlides]);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      const target = rootRef.current ?? document.documentElement;
      await target.requestFullscreen();
      return;
    }

    await document.exitFullscreen();
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

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

  useRealtimeCommands(sessionId, handleCommand);

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
          toggleFullscreen().catch(() => {});
          break;
        default:
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleFullscreen, totalSlides]);

  const handleTotalSlidesKnown = useCallback((n) => setTotalSlides(n), []);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400">{error}</p>
          <Link to="/" className="text-blue-400 underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Loading session…</p>
      </div>
    );
  }

  const provider = getProvider();
  const Viewer = provider.SlideViewer;
  const presentationKey = buildPresentationKey(deck.name, deck.id);
  const origin =
    typeof window === "undefined" ? "https://<yourdomain>" : window.location.origin;

  const shortcutUrls = {
    next: `${origin}/present/${presentationKey}/next_slide`,
    prev: `${origin}/present/${presentationKey}/prev_slide`,
    reset: `${origin}/present/${presentationKey}/reset_slide`,
  };

  return (
    <div
      ref={rootRef}
      className={`min-h-screen text-white flex flex-col relative ${
        isFullscreen ? "bg-black" : "bg-gray-950"
      }`}
    >
      {toastMessage && (
        <div className="fixed top-4 left-4 z-50 rounded-lg border border-green-400/30 bg-green-900/80 px-3 py-2 text-sm text-green-100 shadow-lg">
          {toastMessage}
        </div>
      )}

      {!isFullscreen && (
        <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800 text-sm relative">
          <Link to="/" className="text-gray-400 hover:text-white">
            ← Dashboard
          </Link>
          <span className="text-gray-400">{deck.name}</span>
          <button
            onClick={() => setShowWatchHelp((v) => !v)}
            className="w-7 h-7 rounded-full border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400"
            title="Watch setup"
          >
            ?
          </button>

          {showWatchHelp && (
            <div className="absolute right-4 top-11 w-[28rem] max-w-[calc(100vw-2rem)] rounded-xl border border-gray-700 bg-gray-900 p-4 shadow-2xl z-40 text-xs">
              <p className="text-gray-200 font-semibold mb-2">Apple Watch setup</p>
              <p className="text-gray-400 mb-3">
                Use this short key: <span className="text-white">{presentationKey}</span>
              </p>
              <p className="text-gray-400 mb-1">1. Create 3 shortcuts on iPhone:</p>
              <code className="block text-blue-300 mb-1 break-all">{shortcutUrls.next}</code>
              <code className="block text-blue-300 mb-1 break-all">{shortcutUrls.prev}</code>
              <code className="block text-blue-300 mb-3 break-all">{shortcutUrls.reset}</code>
              <p className="text-gray-400 mb-2">
                2. In each shortcut add: URL → Get Contents of URL (GET).
              </p>
              <p className="text-gray-400">
                3. Show these shortcuts on Apple Watch.
              </p>
            </div>
          )}
        </header>
      )}

      <main
        className={`flex-1 flex items-center justify-center ${
          isFullscreen ? "p-0" : "p-4"
        }`}
      >
        <div className={isFullscreen ? "w-full h-full" : "w-full max-w-5xl"}>
          <Viewer
            fileUrl={fileUrl}
            currentSlide={currentSlide}
            totalSlides={totalSlides}
            onTotalSlidesKnown={handleTotalSlidesKnown}
            fullscreen={isFullscreen}
          />
        </div>
      </main>

      {!isFullscreen && (
        <footer className="flex items-center justify-center gap-4 px-4 py-3 border-t border-gray-800 text-sm">
          <button
            onClick={() => setCurrentSlide((s) => Math.max(s - 1, 1))}
            className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 transition"
          >
            ◀ Prev
          </button>
          <span className="text-gray-400 tabular-nums">
            {currentSlide} / {totalSlides}
          </span>
          <button
            onClick={() => setCurrentSlide((s) => Math.min(s + 1, totalSlides))}
            className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 transition"
          >
            Next ▶
          </button>
          <button
            onClick={() => toggleFullscreen().catch(() => {})}
            className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 transition"
          >
            Fullscreen
          </button>
        </footer>
      )}

      {isFullscreen && (
        <button
          onClick={() => toggleFullscreen().catch(() => {})}
          className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white text-xs px-3 py-1 rounded border border-white/20"
        >
          Exit Fullscreen
        </button>
      )}
    </div>
  );
}
