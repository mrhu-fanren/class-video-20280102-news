// GET /api/health — 探测后端/KV 是否正常
import { checkKV, json } from "./_kv.js";

export async function onRequestGet({ env }) {
  const bad = checkKV(env);
  if (bad) return bad;
  return json({ ok: true, kv: true, time: Date.now() });
}
