// GET  /api/comments?vid=ep01        -> 该视频评论列表
// GET  /api/comments?all=1           -> 每个视频的评论数 {ep01: 3, ...}
// POST /api/comments                 -> body {vid, name, text} 追加评论
import { checkKV, json, rateLimit, clientIP } from "./_kv.js";

// vid 白名单：只允许 ep 开头 + 2~3 位数字，防注入任意 key 污染 KV
const VID_RE = /^ep\d{2,3}$/;
// 每视频评论上限，超出裁最旧，防 KV 单 key 无限膨胀
const MAX_PER_VID = 200;

export async function onRequestGet({ request, env }) {
  const bad = checkKV(env);
  if (bad) return bad;

  const url = new URL(request.url);
  const all = await env.NEWS_KV.get("comments", { type: "json" }) || {};
  if (url.searchParams.get("all") === "1") {
    const counts = {};
    for (const k in all) counts[k] = all[k].length;
    return json(counts);
  }
  const vid = url.searchParams.get("vid");
  return json(vid ? (all[vid] || []) : []);
}

export async function onRequestPost({ request, env }) {
  const bad = checkKV(env);
  if (bad) return bad;

  // 频率限制：同一 IP 10 分钟内最多发 10 条评论，防刷防灌水
  const ip = clientIP(request);
  const allowed = await rateLimit(env, "rl:comments:" + ip, 10, 600);
  if (!allowed) {
    return new Response("评论过于频繁，请 10 分钟后再试。", { status: 429, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const body = await request.json().catch(() => ({}));
  if (!body.vid || !body.text) return new Response("vid & text required", { status: 400 });
  if (!VID_RE.test(String(body.vid))) return new Response("invalid vid", { status: 400 });

  const all = await env.NEWS_KV.get("comments", { type: "json" }) || {};
  all[body.vid] = all[body.vid] || [];
  all[body.vid].unshift({
    name: String(body.name || "匿名").slice(0, 20),
    text: String(body.text).slice(0, 500),
    time: Date.now()
  });
  // 超上限裁最旧
  if (all[body.vid].length > MAX_PER_VID) {
    all[body.vid].splice(MAX_PER_VID);
  }
  try {
    await env.NEWS_KV.put("comments", JSON.stringify(all));
  } catch (e) { return new Response("storage error", { status: 500 }); }
  return json({ ok: true });
}
