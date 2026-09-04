// GET  /api/guestbook -> 留言板列表
// POST /api/guestbook -> body {name, text} 追加留言
import { checkKV, json, rateLimit, clientIP } from "./_kv.js";

// 留言板总条数上限，超出裁最旧，防 KV 单 key 无限膨胀
const MAX_ITEMS = 500;

export async function onRequestGet({ env }) {
  const bad = checkKV(env);
  if (bad) return bad;
  const list = await env.NEWS_KV.get("guestbook", { type: "json" }) || [];
  return json(list);
}

export async function onRequestPost({ request, env }) {
  const bad = checkKV(env);
  if (bad) return bad;

  // 频率限制：同一 IP 10 分钟内最多留 10 条，防刷防灌水
  const ip = clientIP(request);
  const allowed = await rateLimit(env, "rl:guestbook:" + ip, 10, 600);
  if (!allowed) {
    return new Response("留言过于频繁，请 10 分钟后再试。", { status: 429, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const body = await request.json().catch(() => ({}));
  if (!body.text) return new Response("text required", { status: 400 });
  const list = await env.NEWS_KV.get("guestbook", { type: "json" }) || [];
  list.unshift({
    name: String(body.name || "匿名").slice(0, 20),
    text: String(body.text).slice(0, 500),
    time: Date.now()
  });
  // 超上限裁最旧
  if (list.length > MAX_ITEMS) {
    list.splice(MAX_ITEMS);
  }
  try {
    await env.NEWS_KV.put("guestbook", JSON.stringify(list));
  } catch (e) { return new Response("storage error", { status: 500 }); }
  return json({ ok: true });
}
