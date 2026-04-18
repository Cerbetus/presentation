import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

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
    let subscribeTimeout = null;
    let settled = false;
    const normalizedKey = presentationKey.trim().toLowerCase();

    (async () => {
      if (!/^[a-z0-9]{2,32}$/.test(normalizedKey)) {
        setError(
          "Invalid or expired shortcut URL. Open Presenter and copy the latest session shortcut URLs."
        );
        setStatus(null);
        return;
      }

      const channel = supabase.channel(`session:${normalizedKey}`);
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
      if (subscribeTimeout) window.clearTimeout(subscribeTimeout);
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
          Session: <span className="text-gray-300">{presentationKey}</span>
        </p>
      </div>
    </div>
  );
}
