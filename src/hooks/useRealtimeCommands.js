import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "../lib/supabase";

/**
 * Subscribe to realtime messages on a single Supabase broadcast channel.
 * Calls `onCommand(payload)` and `onState(payload)` for matching events.
 * Returns helpers for sending command or state messages.
 */
export function useRealtimeCommands(channelName, onCommand, onState) {
  const channelRef = useRef(null);
  const onCommandRef = useRef(onCommand);
  const onStateRef = useRef(onState);
  const [channelStatus, setChannelStatus] = useState("idle");

  useEffect(() => {
    onCommandRef.current = onCommand;
  });

  useEffect(() => {
    onStateRef.current = onState;
  });

  useEffect(() => {
    if (!channelName) return;

    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      setChannelStatus("error");
    }, 5000);

    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: "command" }, ({ payload }) => {
        onCommandRef.current?.(payload);
      })
      .on("broadcast", { event: "state" }, ({ payload }) => {
        onStateRef.current?.(payload);
      });

    channelRef.current = channel;

    channel.subscribe((status) => {
      if (settled) return;

      if (status === "SUBSCRIBED") {
        settled = true;
        window.clearTimeout(timeout);
        setChannelStatus("subscribed");
        return;
      }

      if (
        status === "TIMED_OUT" ||
        status === "CLOSED" ||
        status === "CHANNEL_ERROR"
      ) {
        settled = true;
        window.clearTimeout(timeout);
        setChannelStatus("error");
      }
    });

    return () => {
      settled = true;
      window.clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [channelName]);

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

  const sendState = useCallback((payload = {}) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "state",
      payload: { ...payload, ts: Date.now() },
    });
  }, []);

  return { sendCommand, sendState, channelStatus };
}
