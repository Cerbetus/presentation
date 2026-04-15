import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useRealtimeCommands } from "../hooks/useRealtimeCommands";

/**
 * Remote control page – designed with large buttons so it works well
 * on Apple Watch (via iPhone relay) or directly on an iPhone screen.
 *
 * Each button broadcasts a command to the presenter via Supabase Realtime.
 */
export default function RemotePage() {
  const { sessionId } = useParams();
  const { sendCommand } = useRealtimeCommands(sessionId, () => {});
  const [sessionData, setSessionData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase
        .from("sessions")
        .select("*, decks(name)")
        .eq("id", sessionId)
        .single();

      if (err) setError(err.message);
      else setSessionData(data);
    })();
  }, [sessionId]);

  function btn(label, command, extra = {}, color = "bg-blue-600 active:bg-blue-800") {
    return (
      <button
        onClick={() => sendCommand(command, extra)}
        className={`${color} text-white font-bold rounded-2xl text-2xl py-8 transition-transform active:scale-95 select-none`}
      >
        {label}
      </button>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-red-400">{error}</p>
          <Link to="/" className="text-blue-400 underline">
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Connecting…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col p-4 gap-4 select-none">
      {/* Header */}
      <header className="text-center text-sm text-gray-400">
        Remote — {sessionData.decks?.name ?? "Session"}
      </header>

      {/* Main control grid */}
      <div className="flex-1 grid grid-cols-2 gap-4 max-w-md mx-auto w-full content-center">
        {btn("◀ Prev", "prev", {}, "bg-gray-700 active:bg-gray-900")}
        {btn("Next ▶", "next")}
        {btn("⏮ First", "first", {}, "bg-gray-700 active:bg-gray-900")}
        {btn("Last ⏭", "last", {}, "bg-gray-700 active:bg-gray-900")}
        {btn("⬛ Blank", "blank", {}, "bg-yellow-600 active:bg-yellow-800")}
        {btn("▶⏸ Play/Pause", "playpause", {}, "bg-green-600 active:bg-green-800")}
      </div>

      {/* Footer */}
      <footer className="text-center">
        <Link to="/" className="text-gray-500 text-xs hover:text-white">
          ← Dashboard
        </Link>
      </footer>
    </div>
  );
}
