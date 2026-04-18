import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { buildPresentationKey, isUuidLike } from "../lib/presentationKey";

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
  const { presentationKey, shortcutAction } = useParams();
  const [status, setStatus] = useState("Sending command…");
  const [error, setError] = useState(null);
  const parsed = useMemo(
    () => parseShortcutAction(shortcutAction),
    [shortcutAction]
  );

  useEffect(() => {
    if (!presentationKey || !parsed) {
      setError(
        "Invalid shortcut URL. Use next_slide, prev_slide, or reset_slide."
      );
      setStatus(null);
      return;
    }

    let disposed = false;
    let activeChannel = null;
    const normalizedKey = presentationKey.trim().toLowerCase();

    (async () => {
      let resolvedSessionId = normalizedKey;

      if (!isUuidLike(normalizedKey)) {
        const { data, error: queryError } = await supabase
          .from("sessions")
          .select("id, created_at, deck_id, decks(id, name)")
          .order("created_at", { ascending: false });

        if (disposed) return;

        if (queryError) {
          setError(queryError.message);
          setStatus(null);
          return;
        }

        const matchingSession = (data ?? []).find((session) => {
          const deckName = Array.isArray(session.decks)
            ? session.decks[0]?.name
            : session.decks?.name;
          const key = buildPresentationKey(deckName, session.deck_id);
          return key === normalizedKey;
        });

        if (!matchingSession) {
          setError(
            "No active session for this presentation key. Start the presentation first."
          );
          setStatus(null);
          return;
        }

        resolvedSessionId = matchingSession.id;
      }

      const channel = supabase.channel(`session:${resolvedSessionId}`);
      activeChannel = channel;

      channel.subscribe(async (channelStatus) => {
        if (disposed || channelStatus !== "SUBSCRIBED") return;

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
          setStatus(`Sent: ${parsed.action}`);
        } else {
          setError("Failed to send command.");
          setStatus(null);
        }

        supabase.removeChannel(channel);
        activeChannel = null;
      });
    })();

    return () => {
      disposed = true;
      if (activeChannel) supabase.removeChannel(activeChannel);
    };
  }, [parsed, presentationKey]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-lg">
          <p className="text-red-400">{error}</p>
          <p className="text-gray-500 text-sm">
            Example:
            {" "}
            <code className="text-gray-300">
              /present/&lt;presentation-key&gt;/next_slide
            </code>
          </p>
          <Link to="/" className="text-blue-400 underline">
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <p className="text-gray-200">{status}</p>
        <p className="text-xs text-gray-500">
          Key: <span className="text-gray-300">{presentationKey}</span>
        </p>
      </div>
    </div>
  );
}
