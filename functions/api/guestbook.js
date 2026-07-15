// GET  /api/guestbook -> 留言板列表
// POST /api/guestbook -> body {name, text} 追加留言
import { checkKV, json } from "./_kv.js";

export async function onRequestGet({ env }) {
  const bad = checkKV(env);
  if (bad) return bad;
  const list = await env.NEWS_KV.get("guestbook", { type: "json" }) || [];
  return json(list);
}

export async function onRequestPost({ request, env }) {
  const bad = checkKV(env);
  if (bad) return bad;
  const body = await request.json().catch(() => ({}));
  if (!body.text) return new Response("text required", { status: 400 });
  const list = await env.NEWS_KV.get("guestbook", { type: "json" }) || [];
  list.unshift({
    name: String(body.name || "匿名").slice(0, 20),
    text: String(body.text).slice(0, 500),
    time: Date.now()
  });
  await env.NEWS_KV.put("guestbook", JSON.stringify(list));
  return json({ ok: true });
}
