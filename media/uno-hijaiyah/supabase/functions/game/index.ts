// Edge Function "game" — wasit permainan HarakaPlay.
// Klien mengirim: POST { action, ... } dengan header Authorization: Bearer <token pengguna>.
// Identitas pemain SELALU diambil dari token (bukan dari isi permintaan).
import { createClient } from "npm:@supabase/supabase-js@2";
import { createCore } from "./core.mjs";
import * as engine from "./engine.mjs";
import { createSupabaseStore } from "./store-supabase.mjs";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const core = createCore({ store: createSupabaseStore(admin), engine });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, code: "bad_method", message: "Metode tidak didukung." }, 405);

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ ok: false, code: "unauthorized", message: "Belum masuk." }, 401);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return json({ ok: false, code: "unauthorized", message: "Sesi tidak valid." }, 401);

  let body: unknown;
  try { body = await req.json(); } catch { return json({ ok: false, code: "bad_request", message: "Permintaan tidak valid." }, 400); }

  const result = await core.handle(data.user.id, body);
  return json(result, 200); // kegagalan aturan permainan = 200 dengan ok:false (dibaca klien)
});
