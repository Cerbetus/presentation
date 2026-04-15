import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useRealtimeCommands } from "../hooks/useRealtimeCommands";
import { getProvider } from "../providers";

export default function PresenterPage() {
  const { sessionId } = useParams();
  const [deck, setDeck] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides, setTotalSlides] = useState(0);
  const [blanked, setBlanked] = useState(false);
  const [error, setError] = useState(null);

  const totalSlidesRef = useRef(totalSlides);

  useEffect(() => {
    totalSlidesRef.current = totalSlides;
  }, [totalSlides]);

  const handleCommand = useCallback((cmd) => {
    const total = totalSlidesRef.current;
    switch (cmd.type) {
      case "next":
        setCurrentSlide((s) => Math.min(s + 1, total));
        break;
      case "prev":
        setCurrentSlide((s) => Math.max(s - 1, 1));
        break;
      case "goto":
        if (cmd.slide >= 1 && cmd.slide <= total) {
          setCurrentSlide(cmd.slide);
        }
        break;
      case "blank":
        setBlanked((b) => !b);
        break;
      case "first":
        setCurrentSlide(1);
        break;
      case "last":
        setCurrentSlide(total);
        break;
      default:
        break;
    }
  }, []);

  useRealtimeCommands(sessionId, handleCommand);

  // Load session + deck
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

      // Get signed URL for the PPTX file
      const { data: urlData } = await supabase.storage
        .from("decks")
        .createSignedUrl(sess.decks.storage_path, 3600);

      if (urlData?.signedUrl) setFileUrl(urlData.signedUrl);
    })();
  }, [sessionId]);

  // Keyboard shortcuts
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
        case "b":
        case "B":
          setBlanked((v) => !v);
          break;
        case "Home":
          setCurrentSlide(1);
          break;
        case "End":
          setCurrentSlide(totalSlides);
          break;
        default:
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [totalSlides]);

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

  const provider = getProvider(deck.name);
  const Viewer = provider.SlideViewer;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800 text-sm">
        <Link to="/" className="text-gray-400 hover:text-white">
          ← Dashboard
        </Link>
        <span className="text-gray-400">{deck.name}</span>
        <Link
          to={`/remote/${sessionId}`}
          target="_blank"
          className="text-blue-400 hover:underline"
        >
          Open Remote ↗
        </Link>
      </header>

      {/* Slide area */}
      <main className="flex-1 flex items-center justify-center p-4">
        {blanked ? (
          <div className="w-full aspect-video bg-black rounded-xl" />
        ) : (
          <div className="w-full max-w-5xl">
            <Viewer
              fileUrl={fileUrl}
              currentSlide={currentSlide}
              totalSlides={totalSlides}
              onTotalSlidesKnown={handleTotalSlidesKnown}
            />
          </div>
        )}
      </main>

      {/* Bottom controls */}
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
          onClick={() => setBlanked((v) => !v)}
          className={`px-3 py-1 rounded transition ${
            blanked ? "bg-yellow-600" : "bg-gray-800 hover:bg-gray-700"
          }`}
        >
          {blanked ? "Unblank" : "Blank"}
        </button>
      </footer>
    </div>
  );
}
