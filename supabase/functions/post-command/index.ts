// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    if (req.method !== "GET") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }

  const ACTION_TO_COMMAND: Record<string, "next" | "prev" | "first"> = {
    next_slide: "next",
    prev_slide: "prev",
    reset_slide: "first",
    next: "next",
    prev: "prev",
    first: "first",
  };

  const isValidPresentationKey = (value: string) => /^[a-z0-9]{2,32}$/.test(value);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Server is not configured." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  let presentationKey = "";
  let action = "";
  let rawBody: unknown = null;

  if (req.method === "GET") {
    const url = new URL(req.url);
    presentationKey = String(url.searchParams.get("key") ?? "").trim().toLowerCase();
    action = String(url.searchParams.get("action") ?? "").trim().toLowerCase();
  } else {
    try {
      rawBody = await req.json();
      const body = (rawBody && typeof rawBody === "object")
        ? (rawBody as Record<string, unknown>)
        : {};
      presentationKey = String(body.presentationKey ?? body.key ?? "").trim().toLowerCase();
      action = String(body.action ?? body.shortcutAction ?? "").trim().toLowerCase();
    } catch {
      rawBody = null;
    }
  }

  const commandType = ACTION_TO_COMMAND[action];

  if (!isValidPresentationKey(presentationKey) || !commandType) {
    return new Response(
      JSON.stringify({
        error: "Invalid key or action.",
        allowedActions: ["next_slide", "prev_slide", "reset_slide"],
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const topic = `session:${presentationKey}`;
  const realtimeBroadcastUrl = `${supabaseUrl.replace(/\/$/, "")}/realtime/v1/api/broadcast`;

  try {
    const response = await fetch(realtimeBroadcastUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        messages: [
          {
            topic,
            event: "command",
            payload: {
              type: commandType,
              ts: Date.now(),
              source: "edge-function",
            },
          },
        ],
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: "Failed to deliver command.",
          status: response.status,
          detail: responseText,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Unable to reach presentation session.",
        detail: error instanceof Error ? error.message : "unknown error",
      }),
      {
        status: 504,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      delivered: true,
      presentationKey,
      action,
      commandType,
      received: rawBody,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
