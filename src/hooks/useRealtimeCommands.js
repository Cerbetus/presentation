import { useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";

/**
 * Subscribe to realtime commands on a session channel.
 * Calls `onCommand(payload)` when a command arrives.
 * Returns a `sendCommand` helper.
 */
export function useRealtimeCommands(sessionId, onCommand) {
  const channelRef = useRef(null);
  const onCommandRef = useRef(onCommand);

  useEffect(() => {
    onCommandRef.current = onCommand;
  });

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`session:${sessionId}`)
      .on("broadcast", { event: "command" }, ({ payload }) => {
        onCommandRef.current?.(payload);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const sendCommand = useCallback(
    (type, extra = {}) => {
      if (!channelRef.current) return;
      channelRef.current.send({
        type: "broadcast",
        event: "command",
        payload: { type, ...extra, ts: Date.now() },
      });
    },
    []
  );

  return { sendCommand };
}
