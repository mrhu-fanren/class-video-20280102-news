// GET  /api/visits  -> 返回全部到访记录 [{name, time}]
// POST /api/visits  -> body {name} 追加一条到访记录
import { checkKV, json } from "./_kv.js";

export async function onRequestGet({ env }) {
  const bad = checkKV(env);
  if (bad) return bad;
  const list = await env.NEWS_KV.get("visits", { type: "json" }) || [];
  return json(list);
}

export async function onRequestPost({ request, env }) {
  const bad = checkKV(env);
  if (bad) return bad;
  const body = await request.json().catch(() => ({}));
  if (!body.name) return new Response("name required", { status: 400 });
  const list = await env.NEWS_KV.get("visits", { type: "json" }) || [];
  list.push({ name: String(body.name).slice(0, 20), time: Date.now() });
  await env.NEWS_KV.put("visits", JSON.stringify(list));
  return json({ ok: true });
}
