import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const telemetryFields = new Set([
  "stage1_reported",
  "stage1_time",
  "food_loaded",
  "sticker_pasted",
  "first_aid_loaded",
  "supplies_issue_reason",
  "stage3_departed",
  "stage3_time",
  "stage4_reached_pickup",
  "stage4_time",
  "onboard_boys",
  "onboard_girls",
  "onboard_ngo",
  "stage5_boarded",
  "stage6_reached_nmacc",
  "stage6_time",
  "stage7_seated",
  "stage7_time",
  "return_departed",
  "return_departed_time",
  "return_boys",
  "return_girls",
  "return_ngo",
  "return_headcount_verified",
  "return_headcount_time",
  "return_reached_drop",
  "return_drop_time",
  "ngo_undertaking_signed",
  "ngo_feedback_note",
  "ngo_poc_signature",
  "ngo_undertaking_time",
]);

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const encodeBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");

const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const safeEqual = (left: string, right: string) => {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  if (leftBytes.length !== rightBytes.length) return false;
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const operationalPin = Deno.env.get("BUS_SYNC_PIN");
  if (!supabaseUrl || !serviceRoleKey || !operationalPin) {
    console.error("Bus telemetry function is missing required Supabase/PIN secrets.");
    return jsonResponse(500, { error: "Bus telemetry service is not configured." });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const body = await request.json();
    const action = body?.action;

    if (action === "login") {
      const phone = String(body?.phone || "").replace(/\D/g, "");
      const pin = String(body?.pin || "");
      if (!/^\d{10}$/.test(phone)) {
        return jsonResponse(400, { error: "Enter the registered 10-digit phone number." });
      }

      const { data: allowed, error: rosterError } = await admin
        .from("bus_sync_users")
        .select("phone, role, bus_number, active")
        .eq("phone", phone)
        .eq("active", true)
        .maybeSingle();
      if (rosterError) throw rosterError;

      const { data: attemptAllowed, error: rateLimitError } = await admin.rpc(
        "consume_bus_sync_login_attempt",
        { p_phone: phone, p_success: false },
      );
      if (rateLimitError) throw rateLimitError;
      if (!attemptAllowed) {
        return jsonResponse(429, { error: "Too many login attempts. Try again in 15 minutes." });
      }

      if (!allowed || !safeEqual(pin, operationalPin)) {
        return jsonResponse(401, { error: "Phone number or PIN is incorrect." });
      }

      const { error: clearAttemptsError } = await admin.rpc("consume_bus_sync_login_attempt", {
        p_phone: phone,
        p_success: true,
      });
      if (clearAttemptsError) throw clearAttemptsError;

      const { error: expiredSessionsError } = await admin
        .from("bus_sync_sessions")
        .delete()
        .lt("expires_at", new Date().toISOString());
      if (expiredSessionsError) throw expiredSessionsError;

      const randomToken = crypto.getRandomValues(new Uint8Array(32));
      const accessToken = encodeBase64Url(randomToken);
      const tokenHash = await sha256Hex(accessToken);
      const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
      const { error: sessionError } = await admin
        .from("bus_sync_sessions")
        .insert({ token_hash: tokenHash, phone, expires_at: expiresAt });
      if (sessionError) throw sessionError;

      return jsonResponse(200, {
        access_token: accessToken,
        expires_at: expiresAt,
        profile: { phone: allowed.phone, role: allowed.role, bus_no: allowed.bus_number },
      });
    }

    const authorization = request.headers.get("authorization") || "";
    const accessToken = authorization.replace(/^Bearer\s+/i, "");
    if (!accessToken || accessToken === authorization) {
      return jsonResponse(401, { error: "Sign in again to sync bus telemetry." });
    }

    const tokenHash = await sha256Hex(accessToken);
    const { data: session, error: sessionError } = await admin
      .from("bus_sync_sessions")
      .select("phone, expires_at")
      .eq("token_hash", tokenHash)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (sessionError) throw sessionError;
    if (!session) {
      return jsonResponse(401, { error: "Your sync session expired. Sign in again." });
    }

    const { data: user, error: userError } = await admin
      .from("bus_sync_users")
      .select("phone, role, bus_number, active")
      .eq("phone", session.phone)
      .eq("active", true)
      .maybeSingle();
    if (userError) throw userError;
    if (!user) {
      return jsonResponse(403, { error: "This account cannot access bus telemetry." });
    }

    if (action === "logout") {
      const { error } = await admin.from("bus_sync_sessions").delete().eq("token_hash", tokenHash);
      if (error) throw error;
      return jsonResponse(200, { ok: true });
    }

    if (action === "read") {
      if (!["bus_ic", "control_room_ic"].includes(user.role)) {
        return jsonResponse(403, { error: "This account cannot access bus telemetry." });
      }
      const result = user.role === "bus_ic"
        ? await admin
          .from("bus_telemetry")
          .select("*")
          .eq("bus_number", user.bus_number)
          .order("bus_number", { ascending: true })
        : await admin
          .from("bus_telemetry")
          .select("*")
          .order("bus_number", { ascending: true });
      const { data, error } = result;
      if (error) throw error;
      return jsonResponse(200, { data: data || [] });
    }

    if (action === "upsert") {
      if (!["bus_ic", "control_room_ic"].includes(user.role)) {
        return jsonResponse(403, { error: "This account cannot update bus telemetry." });
      }
      const busNumber = Number(body?.bus_number);
      if (!Number.isInteger(busNumber) || busNumber < 1 || busNumber > 10) {
        return jsonResponse(400, { error: "Bus number must be between 1 and 10." });
      }
      if (user.role === "bus_ic" && busNumber !== user.bus_number) {
        return jsonResponse(403, { error: "You can only update your assigned bus." });
      }
      const changes = body?.changes;
      if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
        return jsonResponse(400, { error: "Telemetry changes are required." });
      }
      const fields = Object.keys(changes);
      if (fields.length === 0 || fields.some((field) => !telemetryFields.has(field))) {
        return jsonResponse(400, { error: "Telemetry contains unsupported fields." });
      }
      const { data, error } = await admin
        .from("bus_telemetry")
        .upsert(
          { bus_number: busNumber, ...changes, updated_at: new Date().toISOString() },
          { onConflict: "bus_number" },
        )
        .select()
        .single();
      if (error) throw error;
      return jsonResponse(200, { data });
    }

    return jsonResponse(400, { error: "Unsupported telemetry action." });
  } catch (error) {
    console.error("Bus telemetry request failed:", error);
    return jsonResponse(500, { error: "Bus telemetry request failed." });
  }
});
